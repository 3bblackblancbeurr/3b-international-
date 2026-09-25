import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  allocateTeamRevenue,
  createProject,
  discoveryScore,
  generateBuildPlan,
  projectReadiness,
  simulateRevenue,
  validateSplits,
} from '../src/nosbloc/model.js';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const app = read('../src/App.jsx');
const navigation = read('../src/lib/navigation.js');
const menu = read('../src/components/AppNavigation.jsx');
const home = read('../src/components/HomePage.jsx');
const passport = read('../src/components/PassportVisual.jsx');
const nosbloc = read('../src/nosbloc/NosblocPage.jsx');
const sql = read('../supabase/pending/20260926011500_nosbloc_creator_economy_v1.sql');

test('Nosbloc is an official routed 3B space', () => {
  assert.match(app, /NosblocPage/);
  assert.match(app, /id: "nosbloc"/);
  assert.match(navigation, /nosbloc: "nosbloc"/);
  assert.match(menu, /nosbloc: Boxes/);
  assert.match(home, /\['passport', 'world3b', 'nosbloc', 'games'\]/);
});

test('3B MA VILLE identity is preserved as the first official Nosbloc block', () => {
  assert.match(passport, /Ouvrir ma Ville 3B/);
  assert.match(passport, /MA VILLE/);
  assert.match(nosbloc, /PREMIER BLOC OFFICIEL/);
  assert.match(nosbloc, /3B MA VILLE/);
  assert.match(nosbloc, /City3BPortal/);
  assert.match(nosbloc, /Discover verrouillé/);
  assert.match(nosbloc, /Économie verrouillée/);
});

test('revenue simulation reconciles taxes, fees, refunds and the 70-20-5-5 split', () => {
  const result = simulateRevenue({
    grossEuros: 100,
    taxRate: 20,
    storeRate: 10,
    refundRate: 2,
    engagementRewardEuros: 3,
  });
  assert.equal(result.gross, 10000);
  assert.equal(result.taxes, 2000);
  assert.equal(result.storeFees, 800);
  assert.equal(result.refunds, 160);
  assert.equal(result.eligible, 7040);
  assert.equal(result.creatorDirect, 4928);
  assert.equal(result.operations, 1408);
  assert.equal(result.creatorPool, 352);
  assert.equal(result.protectionGrowth, 352);
  assert.equal(result.creatorTotal, 5228);
  assert.equal(
    result.creatorDirect + result.operations + result.creatorPool + result.protectionGrowth,
    result.eligible,
  );
});

test('team splits must total exactly 100 percent and allocate every cent', () => {
  const rows = [
    {id: 'owner', name: 'Zakaria', role: 'Direction', shareBps: 3500, status: 'owner'},
    {id: 'dev', name: 'Sofiane', role: 'Développement', shareBps: 2500, status: 'accepted'},
    {id: 'art', name: 'Lina', role: '3D', shareBps: 2000, status: 'accepted'},
    {id: 'map', name: 'Mehdi', role: 'Map', shareBps: 1500, status: 'accepted'},
    {id: 'audio', name: 'Yanis', role: 'Audio', shareBps: 500, status: 'accepted'},
  ];
  assert.equal(validateSplits(rows).valid, true);
  const allocation = allocateTeamRevenue(10001, rows);
  assert.equal(allocation.valid, true);
  assert.equal(allocation.allocations.reduce((sum, row) => sum + row.amountCents, 0), 10001);
  assert.equal(allocation.unallocated, 0);

  const invalid = validateSplits([
    {name: 'Même nom', shareBps: 5000},
    {name: 'même nom', shareBps: 5000},
  ]);
  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.duplicateNames, ['même nom']);
});

test('a complete project reaches review readiness but remains private by default', () => {
  const project = createProject({
    title: '3B Street Racing',
    type: 'game',
    template: 'Course urbaine',
    description: 'Une course urbaine mobile avec garage social, progression cosmétique et compétitions sans pay-to-win.',
    audience: '12+',
  }, 'Zakaria', 'project-1');
  project.plan = generateBuildPlan(project.description, project.type).slice(0, 4);
  const readiness = projectReadiness(project);
  assert.equal(readiness.score, 100);
  assert.equal(readiness.readyForReview, true);
  assert.equal(project.status, 'draft');
  assert.equal(project.visibility, 'private');
});

test('discovery score rewards readiness, retention, session quality and trust', () => {
  const project = createProject({
    title: 'Ville 3B',
    type: 'world',
    description: 'Une ville méditerranéenne sociale, lisible sur téléphone, avec quartiers, missions et lieux communautaires.',
  });
  project.plan = generateBuildPlan(project.description, project.type).slice(0, 4);
  project.stats = {retention7: 60, sessionMinutes: 30, trustScore: 95};
  assert.equal(discoveryScore(project), 82);
});

test('pending server schema is locked, auditable and deliberately not deployed', () => {
  assert.match(sql, /begin;/i);
  assert.match(sql, /rollback;/i);
  assert.match(sql, /enable row level security/gi);
  assert.match(sql, /nosbloc_creator_profiles/i);
  assert.match(sql, /nosbloc_projects/i);
  assert.match(sql, /nosbloc_project_members/i);
  assert.match(sql, /nosbloc_ledger_entries/i);
  assert.match(sql, /nosbloc_payout_requests/i);
  assert.match(sql, /nosbloc_fraud_signals/i);
  assert.match(sql, /10000/);
  assert.match(sql, /KYC|kyc/);
  assert.doesNotMatch(sql, /create table[^;]*(?:token|crypto)/i);
});
