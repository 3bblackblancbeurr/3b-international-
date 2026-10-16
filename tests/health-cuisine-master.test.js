import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FOODS, RECIPES, SOURCES } from '../src/health/content.js';
import { FOOD_NUTRITION, ORGAN_TOPICS } from '../src/health/nutrition-data.js';

const source=path=>readFileSync(new URL('../src/health/'+path,import.meta.url),'utf8');

test('Cuisine 3B offers a genuine category and at least twenty detailed, source-linked recipes',()=>{
  assert.ok(RECIPES.length>=22,'Cuisine must have an extensive and useful catalog');
  assert.equal(new Set(RECIPES.map(r=>r.id)).size,RECIPES.length,'recipe identifiers must be unique');
  for(const recipe of RECIPES){
    assert.ok(recipe.name.length>6,recipe.id+' is missing a name');
    assert.ok(recipe.minutes>=5 && recipe.minutes<=120,recipe.id+' has unrealistic time');
    assert.ok(recipe.servings>0,recipe.id+' has no servings');
    assert.ok(recipe.ingredients.length>=3,recipe.id+' needs ingredient list');
    assert.ok(recipe.steps.length>=3,recipe.id+' needs detailed steps');
    assert.ok(recipe.steps.every(step=>step.length>=22),recipe.id+' steps are too vague');
    assert.ok(Array.isArray(recipe.allergens),recipe.id+' allergen list missing');
    assert.ok(recipe.sourceIds.length>0,recipe.id+' sources missing');
    recipe.sourceIds.forEach(id=>assert.ok(SOURCES[id],recipe.id+' unresolved source: '+id));
    for(const ingredient of recipe.ingredients){
      assert.ok(ingredient.name && ingredient.quantity!==undefined && ingredient.unit,recipe.id+' bad ingredient');
      if(typeof ingredient.quantity==='number')assert.ok(Number.isFinite(ingredient.quantity)&&ingredient.quantity>0,recipe.id+' bad quantity');
    }
  }
  assert.ok(RECIPES.some(r=>r.id==='compote-pomme-poire'));
  assert.ok(RECIPES.some(r=>r.id==='ratatouille-haricots'));
  assert.ok(RECIPES.some(r=>r.id==='salade-kiwi-pomme-noix'));
  assert.ok(RECIPES.some(r=>r.allergens.includes('Poissons')));
});

test('six distinct navigation spaces give Cuisine and Corps their own direct destinations',()=>{
  const page=source('HealthPage.jsx');
  for(const id of ['today','food','kitchen','move','body','rest']){
    assert.match(page,new RegExp("id:'"+id+"'"),id+' missing from navigation');
  }
  assert.match(page,/tab==='kitchen'&&<Kitchen3B/);
  assert.match(page,/tab==='body'&&<>/);
  assert.match(page,/<BodyExplorer onOpenFood=/);
  assert.match(page,/<KitchenRecipeDetail key=\{sheet.item.id\}/);
  assert.match(page,/h-sheet--kitchen/);
});

test('no more manually chosen pedometer targets; periodic reading requires permission and visible native app',()=>{
  const display=source('HealthRhythm.jsx');
  assert.doesNotMatch(display,/STEP_TARGET_CHOICES|onSetTarget|MON REPÈRE FACULTATIF|Choisis un repère/);
  assert.match(display,/normalizeNativeSteps/);
  assert.match(display,/native\?\.connect/);
  assert.match(display,/native\?\.refresh/);
  assert.match(display,/Version web · lecture impossible/);
  const hook=source('useNativeSteps.js');
  assert.match(hook,/60000/);
  assert.match(hook,/document.visibilityState === 'visible'/);
  assert.match(hook,/!health.data.nativeEnabled \|\| !hasHealthBridge\(\)/);
  assert.match(hook,/readSteps\(\{days:30\}\)/);
});

test('touch-based body atlas includes liver warning and grounded cross-links to foods',()=>{
  const sourceText=source('BodyExplorer.jsx');
  for(const topic of ORGAN_TOPICS.filter(t=>t.id!=='all')){
    assert.match(sourceText,new RegExp("id:'"+topic.id+"'"));
  }
  assert.match(sourceText,/Aucun aliment ni jus ne le « détoxifie »/);
  assert.match(sourceText,/onOpenFood\(item\)/);
  assert.ok(FOODS.some(food=>food.id==='carotte'&&FOOD_NUTRITION[food.id]?.organs.includes('eyes')));
  assert.ok(FOODS.some(food=>food.id==='epinard'&&FOOD_NUTRITION[food.id]?.organs.includes('heart')));
});
