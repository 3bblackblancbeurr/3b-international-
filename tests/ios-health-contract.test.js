import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const health = read('ios/App/App/ThreeBHealthPlugin.swift');
const reminders = read('ios/App/App/ThreeBHealthRemindersPlugin.swift');
const project = read('ios/App/App.xcodeproj/project.pbxproj');

test('iOS health source membership, bridge names and read purpose survive project edits', () => {
  const bridge = read('ios/App/App/ThreeBBridgeViewController.swift');
  for (const name of ['ThreeBHealthPlugin', 'ThreeBHealthRemindersPlugin']) {
    assert.ok(bridge.includes(`registerPluginInstance(${name}())`));
    assert.ok(project.includes(`path = ${name}.swift`));
    const sources = project.match(/504EC3001FED79650016851F \/\* Sources \*\/ = \{[\s\S]*?\n\t\t\};/)?.[0];
    assert.ok(sources?.includes(`${name}.swift in Sources`), `${name} must compile in the App target`);
  }
  assert.match(project, /com\.apple\.HealthKit = \{enabled = 1;/);
  assert.match(read('ios/App/App/App.entitlements'), /<key>com\.apple\.developer\.healthkit<\/key>\s*<true\/>/);
  const info = read('ios/App/App/Info.plist');
  assert.match(info, /<key>NSHealthShareUsageDescription<\/key>\s*<string>[^<]+<\/string>/);
  assert.doesNotMatch(info, /NSHealthUpdateUsageDescription/);
});

test('iOS bridge cannot turn read authorization completion into a permission claim', () => {
  assert.match(health, /requestAuthorization\(toShare: \[\], read: \[type\]\)/);
  assert.match(health, /"permission": "unknown"/);
  assert.doesNotMatch(health, /"permission": "granted"|authorizationStatus\(for:/);
  assert.match(health, /"steps": NSNull\(\)/);
  assert.match(health, /options: \.cumulativeSum/);
  assert.doesNotMatch(health, /options: [^\n]*separateBySource/);
  assert.match(health, /Calendar\(identifier: \.gregorian\)/);
  assert.match(health, /intervalComponents: DateComponents\(day: 1\)/);
});

test('health data stays read-only, on demand and cancellable with no native network or log sink', () => {
  assert.doesNotMatch(health, /store\.(save|delete|enableBackgroundDelivery)|HKObserverQuery|URLSession|print\(|NSLog\(|os_log/);
  assert.match(health, /health_not_connected/);
  assert.match(health, /getRequestStatusForAuthorization/);
  assert.match(health, /targetEnvironment\(simulator\)/);
  assert.match(health, /"revoked": false/);
  assert.match(health, /generation \+= 1/);
  assert.match(health, /store\.stop\(pending\.query\)/);
  assert.match(health, /UIApplication\.openSettingsURLString/);
  assert.doesNotMatch(health, /prefs:|x-apple-health:/i);
});

test('native reminders preserve unrelated notifications and never publish free-form health text', () => {
  assert.match(reminders, /private let prefix = "threeb\.health\.reminder\."/);
  assert.doesNotMatch(reminders, /removeAllPendingNotificationRequests|removeAllDeliveredNotifications/);
  assert.match(reminders, /removeDeliveredNotifications/);
  assert.match(reminders, /pendingCount/);
  assert.match(reminders, /hasPrefix\(self\.prefix\)/);
  assert.doesNotMatch(reminders, /content\.(title|body) = (call|item)/);
  assert.match(reminders, /UNCalendarNotificationTrigger\(dateMatching: date, repeats: true\)/);
  assert.doesNotMatch(reminders, /UNTimeIntervalNotificationTrigger|86400|date\.timeZone =/);
  const schedule = reminders.split('@objc func schedule')[1].split('@objc func cancelAll')[0];
  assert.doesNotMatch(schedule, /requestAuthorization/);
  assert.match(reminders, /input\.count <= 8/);
  assert.match(reminders, /await previous\?\.value/);
});
