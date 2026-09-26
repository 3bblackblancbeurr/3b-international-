import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = relative => readFileSync(new URL(relative, import.meta.url), "utf8");
const app = read("../src/App.jsx");
const page = read("../src/nosbloc/NosblocPremiumPage.jsx");
const css = read("../src/nosbloc/nosbloc-premium.css");

test("Nosbloc V2 is the routed experience", () => {
  assert.match(app, /NosblocPremiumPage\.jsx/);
  assert.match(page, /Accueil/);
  assert.match(page, /Explorer/);
  assert.match(page, /Créer/);
  assert.match(page, /Activité/);
  assert.match(page, /Mon espace/);
});

test("mobile navigation keeps exactly five primary actions with a central create action", () => {
  assert.match(page, /PRIMARY_NAV/);
  assert.match(page, /\["home", "Accueil"/);
  assert.match(page, /\["explore", "Explorer"/);
  assert.match(page, /\["create", "Créer"/);
  assert.match(page, /\["activity", "Activité"/);
  assert.match(page, /\["me", "Moi"/);
  assert.match(css, /grid-template-columns:repeat\(5,1fr\)/);
  assert.match(css, /data-create=true/);
});

test("Studio exposes Simple and Pro modes without direct client publication", () => {
  assert.match(page, />Simple</);
  assert.match(page, /> Pro</);
  assert.match(page, /private_test/);
  assert.match(page, /Envoyer en vérification/);
  assert.match(page, /Version figée envoyée en vérification/);
  assert.doesNotMatch(page, /Publier maintenant/);
});

test("real money and Coins are visibly separated", () => {
  assert.match(page, /€ ARGENT RÉEL/);
  assert.match(page, /COINS 3B/);
  assert.match(page, /Jamais mélangé avec les euros/);
  assert.match(page, /ledger serveur/);
  assert.match(page, /KYC/);
});

test("Nosbloc V2 preserves 3B MA VILLE and the guided journey", () => {
  assert.match(page, /3B MA VILLE/);
  assert.match(page, /City3BPortal/);
  assert.match(page, /Découvrir/);
  assert.match(page, /Tester/);
  assert.match(page, /Vendre/);
  assert.match(page, /Gagner/);
});

test("responsive design supports reduced motion and touch-first mobile layout", () => {
  assert.match(css, /@media\(max-width:820px\)/);
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /min-height:56px/);
});


test("premium V2 automatically migrates the existing Nosbloc local workspace", () => {
  assert.match(page, /legacyKey/);
  assert.match(page, /projets Nosbloc existants ont été repris automatiquement/);
  assert.match(page, /localStorage\.getItem\(legacyKey\)/);
});


test("Explorer includes creations, Boutique and creator profiles without enabling real payments", () => {
  assert.match(page, /Créations/);
  assert.match(page, /Boutique/);
  assert.match(page, /Créateurs/);
  assert.match(page, /ProjectPublicView/);
  assert.match(page, /Paiement verrouillé/);
  assert.match(page, /Aperçu public après validation/);
});
