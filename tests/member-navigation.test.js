import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMember, normalizeOptions, validateMember, createRegisteredMember, createTestMember, DEFAULT_OPTIONS } from "../src/lib/member.js";
import { readLocation } from "../src/lib/navigation.js";

const identity = { ...createTestMember(), name: "  Zakaria  ", email: "member@example.test", originCountry: "Algérie" };

test("empty or invalid identity cannot activate a passport", () => {
  for (const member of [createTestMember(), { ...identity, name: " " }, { ...identity, email: "invalid" },
    { ...identity, originCountry: "unknown" }, { ...identity, name: {} }]) {
    assert.ok(validateMember(member));
    assert.throws(() => createRegisteredMember(member));
  }
});

test("creating a local passport retains origin and normalizes the display name", () => {
  const registered = createRegisteredMember(identity);
  assert.equal(registered.name, "Zakaria");
  assert.equal(registered.originCountry, "Algérie");
  assert.equal(registered.country, "Algérie");
  assert.equal(registered.isRegistered, true);
  assert.notEqual(createRegisteredMember(identity).passportId, registered.passportId);
});

test("legacy registered profiles preserve identifiers, country and progress", () => {
  const old = { ...identity, name: "Zakaria", isRegistered: true, memberId: "3B-MEM-12345", passportId: "3B-PASS-1234", points: 750, createdAt: "25/05/2026" };
  const loaded = normalizeMember(old);
  assert.equal(loaded.isRegistered, true);
  assert.equal(loaded.points, 750);
  assert.equal(loaded.passportId, old.passportId);
  assert.deepEqual(createRegisteredMember(loaded), loaded);
});

test("corrupt stored profiles cannot break rendering or fabricate a registered flag", () => {
  for (const value of [null, [], "invalid", 10]) assert.deepEqual(normalizeMember(value), createTestMember());
  const loaded = normalizeMember({ name: {}, points: -1, isRegistered: "true", email: [], originCountry: "unknown" });
  assert.equal(loaded.name, "");
  assert.equal(loaded.email, "");
  assert.equal(loaded.points, 0);
  assert.equal(loaded.isRegistered, false);
  assert.equal(loaded.originCountry, "France");
});

test("stored preferences accept booleans and ignore unknown or malformed options", () => {
  assert.deepEqual(normalizeOptions(null), DEFAULT_OPTIONS);
  assert.deepEqual(normalizeOptions({ matrix: false, animations: "false", reducedMotion: true, injected: true }),
    { ...DEFAULT_OPTIONS, matrix: false, reducedMotion: true });
});

test("root and unknown links preserve the official entry screen", () => {
  for (const hash of ["", "#", "#missing", "#toString", "#constructor"]) assert.equal(readLocation({ hash }).page, "intro");
});

test("direct links restore the member, manga, boutique and both AI spaces", () => {
  for (const [hash, page] of Object.entries({ accueil: "home", membre: "member", passeport: "passport", manga: "manga",
    boutique: "shop", ia: "ia", "ia-textile": "ia-textile", "mode-3-ia": "ia-trio" })) {
    assert.equal(readLocation({ hash: `#${hash}`, search: "" }).page, page);
  }
});

test("Stripe returns always reach verification, including when the hash is missing", () => {
  for (const action of ["success", "cancel"]) {
    const search = `?checkout=${action}&session_id=cs_test_fixture`;
    assert.deepEqual(readLocation({ hash: "", search }), { page: "shop", search });
    assert.equal(readLocation({ hash: "#accueil", search }).page, "shop");
  }
  assert.equal(readLocation({ hash: "#manga", search: "?checkout=invalid" }).page, "manga");
});
