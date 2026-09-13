import test from 'node:test';
import assert from 'node:assert/strict';
import {ECONOMY_XP_MAX,economyLevel,nextLevelXp,xpProgress,purchaseTotal,canAfford,rewardEventKey,migrateLegacyEconomy} from '../shared/economy.js';

test('XP est borné à 10 000 et donne 10 niveaux',()=>{
 assert.equal(economyLevel(0),1);
 assert.equal(economyLevel(999),1);
 assert.equal(economyLevel(1000),2);
 assert.equal(economyLevel(9999),10);
 assert.equal(economyLevel(ECONOMY_XP_MAX),10);
 assert.equal(economyLevel(999999),10);
});

test('prochain palier et progression restent cohérents',()=>{
 assert.equal(nextLevelXp(0),1000);
 assert.equal(nextLevelXp(1450),2000);
 assert.equal(nextLevelXp(10000),10000);
 assert.equal(xpProgress(1500),50);
 assert.equal(xpProgress(10000),100);
});

test('achat Coins valide quantité et solde',()=>{
 assert.equal(purchaseTotal(500,2),1000);
 assert.equal(canAfford(1000,500,2),true);
 assert.equal(canAfford(999,500,2),false);
 assert.throws(()=>purchaseTotal(500,0));
 assert.throws(()=>purchaseTotal(-1,1));
 assert.throws(()=>purchaseTotal(500,100));
});

test('clé événement est stable et typée',()=>{
 assert.equal(rewardEventKey('guardian','celiane','run-123'),'guardian:celiane:run-123');
 assert.equal(rewardEventKey('key','France / Justice','abc'),'key:France---Justice:abc');
 assert.throws(()=>rewardEventKey('unknown','x','y'));
 assert.throws(()=>rewardEventKey('quest','','y'));
});

test('migration legacy ne perd pas les valeurs et respecte les bornes',()=>{
 assert.deepEqual(migrateLegacyEconomy({xp:4200,points:875}),{xp:4200,coins:875});
 assert.deepEqual(migrateLegacyEconomy({xp:15000,points:-10}),{xp:10000,coins:0});
});
