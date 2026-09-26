import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  NOSBLOC_STORAGE_VERSION,
  allocateTeamRevenue,
  createEmptyState,
  createProject,
  discoveryScore,
  generateBuildPlan,
  normalizeState,
  projectReadiness,
  simulateRevenue,
  teamAgreementReady,
  validateSplits,
} from '../src/nosbloc/model.js';
import {
  appendProjectVersion,
  createInvitationCode,
  parseStateExport,
  prepareTeamInvitation,
  restoreProjectVersion,
  serializeStateExport,
} from '../src/nosbloc/versioning.js';
import {normalizeProjectPayload, normalizeVersionStage as normalizeServerStage} from '../src/nosbloc/server-contract.js';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const app = read('../src/App.jsx');
const navigation = read('../src/lib/navigation.js');
const menu = read('../src/components/AppNavigation.jsx');
const home = read('../src/components/HomePage.jsx');
const passport = read('../src/components/PassportVisual.jsx');
const nosbloc = read('../src/nosbloc/NosblocPage.jsx');
const css = read('../src/nosbloc/nosbloc.css');
const serverClient = read('../src/nosbloc/server-client.js');
const envExample = read('../.env.example');
const sql = read('../supabase/pending/20260926011500_nosbloc_creator_economy_v1.sql');

test('Nosbloc is an official routed 3B space', () => {
  assert.match(app, /NosblocPage/);
  assert.match(app, /id: "nosbloc"/);
  assert.match(navigation, /nosbloc: "nosbloc"/);
  assert.match(menu, /nosbloc: Boxes/);
  assert.match(home, /\['passport', 'world3b', 'nosbloc', 'games'\]/);
});

test('3B MA VILLE remains the first official Nosbloc block', () => {
  assert.match(passport, /Ouvrir ma Ville 3B/);
  assert.match(passport, /MA VILLE/);
  assert.match(nosbloc, /PREMIER BLOC OFFICIEL/);
  assert.match(nosbloc, /3B MA VILLE/);
  assert.match(nosbloc, /City3BPortal/);
});

test('premium v2 exposes the simple five-entry mobile journey and Simple/Pro studios', () => {
  for (const label of ['Accueil', 'Explorer', 'Créer', 'Activité', 'Moi']) assert.match(nosbloc, new RegExp(`"${label}"`));
  assert.match(nosbloc, /Simple/);
  assert.match(nosbloc, /Pro/);
  assert.match(nosbloc, /Test privé/);
  assert.match(nosbloc, /Envoyer en vérification/);
  assert.match(nosbloc, /Mes créations/);
  assert.match(css, /nb2-mobile-nav/);
  assert.match(css, /max-width:820px/);
});

test('authoritative server client is gated, authenticated and environment-bound', () => {
  assert.match(serverClient, /authClient/);
  assert.match(serverClient, /NOSBLOC_SERVER_ENV_VALID/);
  assert.match(serverClient, /version_private_test/);
  assert.match(serverClient, /review_submit/);
  assert.match(serverClient, /VITE_NOSBLOC_SERVER_SYNC/);
  assert.doesNotMatch(serverClient, /SERVICE_ROLE|service_role/);
  assert.match(envExample, /VITE_NOSBLOC_SERVER_SYNC=false/);
  assert.match(envExample, /NOSBLOC_COMMERCE_ENABLED=false/);
  assert.match(envExample, /NOSBLOC_CONNECT_ENABLED=false/);
  assert.match(envExample, /NOSBLOC_PAYOUTS_ENABLED=false/);
});

test('server contract maps v3 rights and accepts private-test stage', () => {
  const project = createProject({
    title: 'Contrat serveur',
    description: 'Projet assez détaillé pour contrôler le contrat serveur de la nouvelle version Nosbloc V2.',
  });
  project.rights = {coreOwned: true, thirdPartyLicensed: true, ageRatingReviewed: true};
  const payload = normalizeProjectPayload(project);
  assert.equal(payload.rights.contentOwned, true);
  assert.equal(payload.rights.thirdPartyLicensed, true);
  assert.equal(payload.rights.audienceReviewed, true);
  assert.equal(normalizeServerStage('private_test'), 'private_test');
  assert.throws(() => normalizeServerStage('published'));
});

test('v2 keeps real money and 3B Coins explicitly separated', () => {
  assert.match(nosbloc, /ARGENT RÉEL/);
  assert.match(nosbloc, /COINS 3B/);
  assert.match(nosbloc, /Deux soldes séparés/);
  assert.doesNotMatch(nosbloc, /convertir.*Coins.*€|convertir.*€.*Coins/i);
});

test('destructive delete is replaced by recoverable archive in the primary UI', () => {
  assert.match(nosbloc, /Projet archivé/);
  assert.match(nosbloc, /Rien n’a été supprimé définitivement/);
  assert.match(nosbloc, /Archives/);
  assert.doesNotMatch(nosbloc, /Supprimer définitivement/);
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
  assert.equal(result.creatorDirect + result.operations + result.creatorPool + result.protectionGrowth, result.eligible);
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

test('a project requires a private test before review readiness', () => {
  const project = createProject({
    title: '3B Street Racing',
    type: 'game',
    template: 'Course urbaine',
    description: 'Une course urbaine mobile avec garage social, progression cosmétique et compétitions sans pay-to-win.',
    audience: '12+',
  }, 'Zakaria', 'project-1');
  project.plan = generateBuildPlan(project.description, project.type).slice(0, 4);
  project.rights = {coreOwned: true, thirdPartyLicensed: true, ageRatingReviewed: true};

  const beforeTest = projectReadiness(project);
  assert.equal(beforeTest.score, 95);
  assert.equal(beforeTest.readyForReview, false);

  const tested = appendProjectVersion(project, {stage: 'private_test', id: 'test-1', createdAt: '2026-09-26T00:00:00.000Z'});
  const readiness = projectReadiness(tested.project);
  assert.equal(readiness.score, 100);
  assert.equal(readiness.readyForReview, true);
  assert.equal(tested.project.status, 'private_test');
  assert.equal(tested.project.visibility, 'private');
  assert.equal(tested.project.lastTestedAt, '2026-09-26T00:00:00.000Z');
});

test('discovery score rewards readiness, retention, session quality and trust', () => {
  const project = createProject({
    title: 'Ville 3B',
    type: 'world',
    description: 'Une ville méditerranéenne sociale, lisible sur téléphone, avec quartiers, missions et lieux communautaires.',
  });
  project.plan = generateBuildPlan(project.description, project.type).slice(0, 4);
  project.rights = {coreOwned: true, thirdPartyLicensed: true, ageRatingReviewed: true};
  project.lastTestedAt = '2026-09-26T00:00:00.000Z';
  project.stats = {retention7: 60, sessionMinutes: 30, trustScore: 95};
  assert.equal(discoveryScore(project), 81);
});

test('pending creator-economy schema remains locked and deliberately not deployed', () => {
  assert.match(sql, /begin;/i);
  assert.match(sql, /rollback;/i);
  assert.match(sql, /enable row level security/gi);
  assert.match(sql, /nosbloc_creator_profiles/i);
  assert.match(sql, /nosbloc_projects/i);
  assert.match(sql, /nosbloc_project_members/i);
  assert.match(sql, /nosbloc_project_versions/i);
  assert.match(sql, /nosbloc_project_invitations/i);
  assert.match(sql, /invite_secret_hash/i);
  assert.match(sql, /nosbloc_ledger_entries/i);
  assert.match(sql, /nosbloc_payout_requests/i);
  assert.match(sql, /nosbloc_fraud_signals/i);
  assert.match(sql, /10000/);
  assert.match(sql, /KYC|kyc/);
  assert.doesNotMatch(sql, /create table[^;]*(?:token|crypto)/i);
});

test('review submission creates an immutable version and restoration returns a private draft', () => {
  const project = createProject({
    title: 'Bloc Ville test',
    type: 'world',
    description: 'Une ville test assez détaillée pour vérifier les versions immuables et la restauration privée.',
  }, 'Zakaria', 'project-version');
  project.plan = generateBuildPlan(project.description, project.type).slice(0, 4);
  project.rights = {coreOwned: true, thirdPartyLicensed: true, ageRatingReviewed: true};
  project.lastTestedAt = '2026-09-25T23:00:00.000Z';
  const submitted = appendProjectVersion(project, {stage: 'review', note: 'Révision 1', id: 'review-1', createdAt: '2026-09-26T00:00:00.000Z'});
  assert.equal(submitted.project.status, 'review');
  assert.equal(submitted.project.visibility, 'private');
  assert.equal(submitted.project.reviewVersionId, 'review-1');
  const immutableTitle = submitted.version.snapshot.title;
  submitted.project.title = 'Brouillon modifié ensuite';
  assert.equal(submitted.version.snapshot.title, immutableTitle);

  const restored = restoreProjectVersion(submitted.project, 'review-1');
  assert.equal(restored.title, 'Bloc Ville test');
  assert.equal(restored.status, 'draft');
  assert.equal(restored.visibility, 'private');
  assert.equal(restored.reviewVersionId, null);
  assert.equal(restored.versions.length, 1);
});

test('published and restored versions do not overwrite each other', () => {
  const project = createProject({
    title: 'Production protégée',
    description: 'Un projet complet qui vérifie que la production publiée reste distincte du brouillon restauré.',
  }, 'Zakaria', 'project-production');
  const published = appendProjectVersion(project, {stage: 'published', id: 'pub-1', createdAt: '2026-09-26T00:00:00.000Z'});
  assert.equal(published.project.status, 'published');
  assert.equal(published.project.visibility, 'public');
  assert.equal(published.project.productionVersionId, 'pub-1');

  const restored = restoreProjectVersion(published.project, 'pub-1');
  assert.equal(restored.status, 'draft');
  assert.equal(restored.visibility, 'private');
  assert.equal(restored.productionVersionId, 'pub-1');
  assert.equal(restored.restoredFromVersionId, 'pub-1');
});

test('Nosbloc archive detects tampering and restores a verified v3 state', () => {
  const project = createProject({title: 'Archive fiable', description: 'Projet complet destiné à tester une archive locale signée par empreinte.'}, 'Zakaria', 'archive-project');
  const state = createEmptyState({studioName: 'Studio 3B'});
  state.projects = [project];
  state.updatedAt = '2026-09-26T00:00:00.000Z';
  const exported = serializeStateExport(state);
  const restored = parseStateExport(exported, {studioName: 'Studio 3B'});
  assert.equal(restored.version, NOSBLOC_STORAGE_VERSION);
  assert.equal(restored.projects[0].id, 'archive-project');
  const tampered = exported.replace('Archive fiable', 'Archive falsifiée');
  assert.throws(() => parseStateExport(tampered), /modifiée|endommagée/);
});

test('legacy v2 local state migrates without losing projects', () => {
  const old = {
    version: 2,
    profile: {studioName: 'Ancien Studio'},
    projects: [{
      id: 'legacy-1',
      title: 'Ancien projet',
      type: 'world',
      template: 'Quartier 3B',
      description: 'Un ancien projet local qui doit survivre à la migration vers Nosbloc V2 sans suppression.',
      status: 'draft',
      splits: [{id: 'owner', name: 'Zakaria', role: 'Direction', shareBps: 10000, status: 'owner'}],
      versions: [],
    }],
    marketplace: [],
  };
  const migrated = normalizeState(old, old.profile);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.projects.length, 1);
  assert.equal(migrated.projects[0].id, 'legacy-1');
  assert.equal(migrated.projects[0].visibility, 'private');
  assert.deepEqual(migrated.wallet.real, {availableCents: 0, pendingCents: 0, payoutCents: 0, currency: 'EUR'});
});

test('team invitations remain private preparations and block review until acceptance', () => {
  const project = createProject({title: 'Équipe 3B', description: 'Projet de collaboration suffisamment détaillé pour tester les accords d’équipe.'}, 'Zakaria', 'team-project');
  project.plan = generateBuildPlan(project.description, project.type).slice(0, 4);
  project.rights = {coreOwned: true, thirdPartyLicensed: true, ageRatingReviewed: true};
  project.lastTestedAt = '2026-09-26T00:00:00.000Z';
  project.splits = [
    {...project.splits[0], shareBps: 6000},
    {id: 'member-2', name: 'Lina', role: '3D', contact: '@lina', shareBps: 4000, status: 'draft'},
  ];
  const invited = prepareTeamInvitation(project, 'member-2', '@lina');
  const row = invited.splits.find(member => member.id === 'member-2');
  assert.match(row.inviteCode, /^NB3B-[0-9A-F]{4}-[0-9A-F]{4}$/);
  assert.equal(row.status, 'invited');
  assert.equal(teamAgreementReady(invited.splits), false);
  assert.equal(projectReadiness(invited).readyForReview, false);
  assert.match(createInvitationCode('p', 'm', 'fixed'), /^NB3B-/);
});

test('Nosbloc v2 exposes recovery and immutable versions without direct public approval', () => {
  assert.match(nosbloc, /Exporter Nosbloc/);
  assert.match(nosbloc, /last-good/);
  assert.match(nosbloc, /VERSIONS IMMUABLES/);
  assert.match(nosbloc, /Restaurer/);
  assert.match(nosbloc, /Envoyer en vérification/);
  assert.doesNotMatch(nosbloc, /Approuver et publier|Publier maintenant/);
});
