import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const manifest=JSON.parse(readFileSync(new URL('../config/3b-infrastructure.json',import.meta.url),'utf8'));
const env=readFileSync(new URL('../.env.example',import.meta.url),'utf8');
const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const catalog=readFileSync(new URL('../src/games/catalog.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');

test('infrastructure 3B canonique reste sur les services officiels',()=>{
 assert.equal(manifest.github.repository,'3bblackblancbeurr/3b-international-');
 assert.equal(manifest.github.defaultBranch,'main');
 assert.equal(manifest.supabase.projectId,'ttvhcezucsbbmnafrotq');
 assert.equal(manifest.vercel.productionUrl,'https://3b-international.vercel.app');
 assert.match(env,/SUPABASE_URL=https:\/\/ttvhcezucsbbmnafrotq\.supabase\.co/);
 assert.match(env,/APP_URL=https:\/\/3b-international\.vercel\.app/);
 assert.equal(vercel.git.deploymentEnabled.main,true);
 assert.equal(vercel.git.deploymentEnabled['*'],false);
});

test('la vraie Course des clés et Penalty Rush restent sur leurs références canoniques',()=>{
 assert.match(catalog,/https:\/\/troisb-course-des-cles-demo\.stetienne86pp\.chatgpt\.site\//);
 assert.match(app,/gameSlug === "penalty-rush"/);
 assert.equal(manifest.games.penaltyRush.route,'/jeux/penalty-rush');
});

test('aucune adresse e-mail propriétaire complète n’est publiée dans le manifeste',()=>{
 const raw=JSON.stringify(manifest);
 assert.doesNotMatch(raw,/stetienne86pp@gmail\.com/i);
});
