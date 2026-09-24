import test from "node:test";
import assert from "node:assert/strict";
import {
  ARCHIVE_VALUES,
  COUNTRIES,
  SIGNAL_COLORS,
  TRANSMISSION_TOKENS,
  advanceCoupledRing,
  makePremierSecretConfig,
  sameArray,
} from "../src/secret/premierSecretEngine.js";

function dayKey(index) {
  const date = new Date(Date.UTC(2026, 0, 1 + index));
  return date.toISOString().slice(0, 10);
}

test("Premier Secret generates coherent daily puzzles", () => {
  const seenSignatures = new Set();

  for (let index = 0; index < 365; index += 1) {
    const config = makePremierSecretConfig(dayKey(index));

    assert.ok(COUNTRIES.some((country) => country.id === config.country.id));
    assert.ok(SIGNAL_COLORS.some((color) => color.hex === config.signalColor.hex));

    assert.equal(config.transmission.length, TRANSMISSION_TOKENS.length);
    assert.equal(new Set(config.transmission).size, TRANSMISSION_TOKENS.length);
    assert.deepEqual([...config.transmission].sort(), [...TRANSMISSION_TOKENS].sort());

    assert.equal(config.ringTargets.length, 3);
    assert.equal(config.ringStart.length, 3);
    for (const value of config.ringTargets) {
      assert.ok(value >= 0 && value < 8);
    }

    let rings = [...config.ringStart];
    for (let ringIndex = 0; ringIndex < rings.length; ringIndex += 1) {
      let guard = 0;
      while (rings[ringIndex] !== config.ringTargets[ringIndex] && guard < 8) {
        rings = advanceCoupledRing(rings, ringIndex, 1);
        guard += 1;
      }
      assert.ok(guard < 8 || rings[ringIndex] === config.ringTargets[ringIndex]);
    }
    assert.ok(sameArray(rings, config.ringTargets));

    assert.equal(config.archiveOrder.length, ARCHIVE_VALUES.length);
    assert.equal(new Set(config.archiveOrder).size, ARCHIVE_VALUES.length);
    assert.deepEqual([...config.archiveOrder].sort(), [...ARCHIVE_VALUES].sort());

    const expectedChamberNumber =
      (config.ringTargets.reduce((sum, value) => sum + value + 1, 0) % 8) || 8;
    assert.equal(config.chamberNumber, expectedChamberNumber);
    assert.equal(config.chamberValue, config.archiveOrder[config.chamberSlot]);

    assert.deepEqual(config.finalSeal, ["Unité", "Mémoire", "Avenir"]);

    seenSignatures.add([
      config.signalIndex,
      config.signalColor.label,
      config.transmission.join(""),
      config.ringTargets.join("-"),
      config.archiveOrder.join("-"),
    ].join("|"));
  }

  assert.ok(seenSignatures.size > 120, "the daily system should produce a varied campaign");
});
