import { readFileSync, writeFileSync } from 'node:fs';

// Capacitor regenerates the SPM package during sync; restore the exact npm version.
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const version = manifest.dependencies['@capacitor/ios'];
if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error('Use an exact Capacitor iOS version.');
const path = new URL('../ios/App/CapApp-SPM/Package.swift', import.meta.url);
const source = readFileSync(path, 'utf8');
const pattern = /(url: "https:\/\/github\.com\/ionic-team\/capacitor-swift-pm\.git",\s*)(?:from|exact): "[^"]+"/;
if (!pattern.test(source)) throw Error('Cannot locate the generated Capacitor SPM dependency.');
writeFileSync(path, source.replace(pattern, `$1exact: "${version}"`));
