import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FOODS } from '../src/health/content.js';
import {
  FOOD_NUTRITION, FOOD_INSIGHTS, NUTRITION_SOURCES, ORGAN_TOPICS,
  describeFoodForTopic, getNutrition, getFoodTopics, scaleAmount
} from '../src/health/nutrition-data.js';

test('each published nutrition record is a real catalog item with a distinct Ciqual code and stated preparation', () => {
  const catalogIds = new Set(FOODS.map(food => food.id));
  const codes = new Set();
  assert.equal(FOODS.filter(food => ['fruit','vegetable'].includes(food.group)).length, 18);
  assert.equal(Object.keys(FOOD_NUTRITION).length, 18, 'all fruit and vegetable cards must have reviewed data');
  for (const item of FOODS.filter(food => ['fruit','vegetable'].includes(food.group))) assert.ok(getNutrition(item.id), 'nutrition missing for ' + item.id);
  for (const [id, record] of Object.entries(FOOD_NUTRITION)) {
    assert.ok(catalogIds.has(id), id + ' absent from the existing catalog');
    assert.match(record.ciqualCode, /^\d{5}$/);
    assert.ok(!codes.has(record.ciqualCode), 'duplicate Ciqual ID: ' + record.ciqualCode);
    codes.add(record.ciqualCode);
    assert.ok(/cru|crue|cuit|cuite|frais|fraîche|pulpe/i.test(record.preparation), id + ' lacks preparation specificity');
    assert.ok(record.highlights.length);
    assert.ok(record.organs.length);
    assert.ok(record.micronutrients.length >= 2);
    for (const value of Object.values(record.values)) {
      assert.ok(value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0), id + ' invents invalid value');
    }
    for (const nutrient of record.micronutrients) {
      assert.ok(nutrient.label && ['mg','µg'].includes(nutrient.unit));
      assert.ok(Number.isFinite(nutrient.value) && nutrient.value >= 0);
    }
  }
});

test('carrot illustrates vitamin-A role without imaginary visual acuity claims', () => {
  assert.equal(getNutrition('carotte').preparation, 'Carotte, cuite sans matière grasse');
  assert.equal(getNutrition('carotte').values.kcal, 33);
  assert.ok(getFoodTopics('carotte').includes('eyes'));
  const claim = describeFoodForTopic('carotte', 'eyes');
  assert.match(claim, /vitamine A/);
  assert.match(claim, /n.améliore pas/);
});

test('recipe and preparation precision is not silently conflated', () => {
  assert.match(getNutrition('epinard').preparation, /cuit/i);
  assert.match(getNutrition('brocoli').preparation, /cru/i);
  assert.match(getNutrition('courge').preparation, /butternut/i);
  assert.match(getNutrition('peche').preparation, /sans peau/);
  assert.equal(getNutrition('tomate').ciqualCode, '20276');
  assert.equal(getNutrition('courgette').ciqualCode, '20020');
  assert.equal(getNutrition('lentille'), null, 'unsourced pulse values must not be invented');
});

test('per-portion scaling preserves unknown rather than turning it into zero', () => {
  assert.equal(scaleAmount(54,150),81);
  assert.equal(scaleAmount(3.1,150),4.7);
  assert.equal(scaleAmount(0,150),0);
  assert.equal(scaleAmount(null,150),null);
  assert.equal(scaleAmount(undefined,150),null);
  assert.equal(scaleAmount(Infinity,150),null);
  assert.equal(scaleAmount(100,101),null);
  assert.equal(getNutrition('poire').values.fats,null);
  assert.equal(getNutrition('epinard').values.sugars,null);
});

test('every organ association is a defined, non-therapeutic topic and liver offers no false detox', () => {
  const topics = new Set(ORGAN_TOPICS.map(t => t.id));
  assert.deepEqual([...topics].includes('eyes'), true);
  assert.ok(topics.has('liver') && topics.has('skin') && topics.has('circulation'));
  for (const [id, record] of Object.entries(FOOD_NUTRITION)) {
    assert.ok(!record.organs.includes('liver'), id + ' claims detox benefit');
    record.organs.forEach(topic => assert.ok(topics.has(topic), 'unknown topic: ' + topic));
  }
  assert.match(describeFoodForTopic('carotte','liver'), /Aucun fruit, jus ou aliment/);
  for (const claims of Object.values(FOOD_INSIGHTS)) {
    assert.ok(!JSON.stringify(claims).includes('guérit'));
  }
});

test('nutrition references are public https endpoints, and atlas is wired into real HealthPage without manual step entry', () => {
  for (const src of Object.values(NUTRITION_SOURCES)) assert.equal(new URL(src.url).protocol, 'https:');
  const healthPage = readFileSync(new URL('../src/health/HealthPage.jsx', import.meta.url), 'utf8');
  assert.match(healthPage, /<NutritionAtlas foods=\{FOODS\}/);
  assert.match(healthPage, /<NutritionDetail item=\{sheet.item\}/);
  assert.doesNotMatch(healthPage, /Pas du jour · total manuel/);
  assert.doesNotMatch(healthPage, /Total de pas du jour · saisie manuelle/);
  assert.match(healthPage, /<NativeStepsPanel native=\{native\}/);
});
