import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const root = 'android/app/src/main/';
const native = `${root}java/app/vercel/threebinternational/health/`;

test('Android health permissions stay read-only, foreground-only and optional', () => {
  const manifest = read(`${root}AndroidManifest.xml`);
  const healthPermissions = [...manifest.matchAll(/<uses-permission android:name="(android\.permission\.health\.[^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(healthPermissions, ['android.permission.health.READ_STEPS']);
  assert.doesNotMatch(manifest, /SCHEDULE_EXACT_ALARM|USE_EXACT_ALARM|READ_HEALTH_DATA_IN_BACKGROUND|READ_HEALTH_DATA_HISTORY/);
  assert.match(manifest, /START_VIEW_PERMISSION_USAGE/);
  assert.match(manifest, /android\.health\.connect\.action\.SHOW_ONBOARDING/);
  assert.match(manifest, /HealthReminderReceiver" android:exported="false"/);
  assert.match(manifest, /HealthReminderRestoreReceiver" android:exported="false"/);
});

test('API24 compatibility isolates SDK entry and its broker below Android9', () => {
  const source = read(`${native}ThreeBHealthPlugin.kt`);
  const outer = source.split('private object Api28')[0].replace(/^import .+$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(outer, /HealthConnectClient|StepsRecord|HealthPermission|\bInstant\b|\bZoneId\b/);
  for (const method of ['getStatus', 'requestStepsPermission', 'readSteps', 'openSettings', 'disconnect']) {
    const section = outer.split(`fun ${method}(`)[1].split(/\n    (?:@|private fun|override fun)/)[0];
    assert.ok(section.indexOf('Build.VERSION.SDK_INT < 28') < section.indexOf('Api28.'), method);
  }
  assert.match(read(`${root}res/values/health.xml`), />false<\/bool>/);
  assert.match(read(`${root}res/values-v28/health.xml`), />true<\/bool>/);
  assert.match(read(`${root}AndroidManifest.xml`), /HealthDataSdkService"\s+android:enabled="@bool\/health_connect_enabled"/);
});

test('Android step totals use prioritized aggregation, preserve absence and never upload', () => {
  const source = read(`${native}ThreeBHealthPlugin.kt`);
  assert.match(source, /client\.aggregate\(AggregateRequest/);
  assert.match(source, /put\("steps", total \?: JSONObject\.NULL\)/);
  assert.match(source, /granted\.any \{ it != readSteps \}/);
  assert.match(source, /readJob\?\.cancel\(\)/);
  assert.match(source, /withTimeout\(40_000\)/);
  assert.match(source, /permissionGeneration != generation|token != generation/);
  assert.match(source, /currentCoroutineContext\(\)\.ensureActive\(\)/);
  assert.doesNotMatch(source, /readRecords\(|insertRecords\(|deleteRecords\(|dataOriginFilter\s*=|android\.util\.Log|OkHttp|HttpURLConnection/);
  const store = read(`${native}HealthReminderStore.java`);
  assert.match(store, /manager\.setWindow\(/);
  assert.doesNotMatch(store, /setExact|setRepeating|HealthConnectClient|StepsRecord|readSteps\(/);
  assert.match(store, /put\("id", id\)\.put\("time", time\)/);
  assert.match(store, /VISIBILITY_PRIVATE/);
});

test('all 3B Capacitor native plugins are registered before BridgeActivity initialization', () => {
  const activity = read(`${root}java/app/vercel/threebinternational/MainActivity.java`);
  const start = activity.indexOf('protected void onCreate(Bundle savedInstanceState)');
  const bridgeInit = activity.indexOf('super.onCreate(savedInstanceState);', start);
  assert.ok(start >= 0 && bridgeInit > start, 'Android startup must initialize the bridge');
  for (const nativePlugin of [
    'CompanionPlugin', 'ImmersivePlugin', 'HiddenWorldARPlugin',
    'ThreeBHealthPlugin', 'ThreeBHealthRemindersPlugin',
  ]) {
    const declaration = activity.indexOf(`registerPlugin(${nativePlugin}.class);`, start);
    assert.ok(declaration >= start && declaration < bridgeInit,
      `${nativePlugin} must register before Capacitor initializes its bridge`);
  }
});
