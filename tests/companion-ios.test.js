import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));

test("iOS app and widget compile the same content schema with the same App Group", () => {
  const project = readFileSync(join(root, "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
  const schemaSources = [...project.matchAll(/CompanionActivityAttributes\.swift in Sources \*\/ = \{isa = PBXBuildFile; fileRef = ([A-Z0-9]+)/g)];
  assert.equal(schemaSources.length, 2);
  assert.equal(schemaSources[0][1], schemaSources[1][1], "both targets must share one schema source");
  const groupPattern = /<key>com\.apple\.security\.application-groups<\/key>\s*<array>\s*<string>([^<]+)<\/string>/;
  const app = readFileSync(join(root, "ios/App/App/App.entitlements"), "utf8").match(groupPattern)?.[1];
  const widget = readFileSync(join(root, "ios/CompanionWidget/CompanionWidget.entitlements"), "utf8").match(groupPattern)?.[1];
  assert.equal(app, "group.app.vercel.threebinternational.companion");
  assert.equal(widget, app);
  assert.equal((project.match(/CODE_SIGN_ENTITLEMENTS = App\/App.entitlements;/g) || []).length, 2);
  assert.equal((project.match(/CODE_SIGN_ENTITLEMENTS = ..\/CompanionWidget\/CompanionWidget.entitlements;/g) || []).length, 2);
});

const swift = spawnSync("swiftc", ["--version"], { encoding: "utf8" });
test("native Swift model protects widget privacy and expires reactions across calendar changes", {
  skip: swift.error?.code === "ENOENT" ? "Swift compiler unavailable; required in macOS mobile CI" : false,
}, () => {
  assert.equal(swift.status, 0, swift.stderr);
  const directory = mkdtempSync(join(tmpdir(), "threeb-companion-swift-"));
  try {
    const executable = join(directory, process.platform === "win32" ? "companion-model.exe" : "companion-model");
    const compile = spawnSync("swiftc", [
      join(root, "ios/App/App/CompanionActivityAttributes.swift"),
      join(root, "tests/companion-ios-model.swift"), "-o", executable,
    ], { encoding: "utf8", timeout: 120_000 });
    assert.equal(compile.status, 0, compile.stderr || compile.error?.message);
    const result = spawnSync(executable, [], { encoding: "utf8", timeout: 20_000 });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.match(result.stdout, /checks passed/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
