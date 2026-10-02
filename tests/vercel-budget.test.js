import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyVercelBudget} from '../scripts/verify-vercel-budget.mjs';

test('Vercel static output and function tracing stay inside the 3B budgets', () => {
  const result = verifyVercelBudget();
  assert.equal(result.ok, true, JSON.stringify(result.failures));
  assert.ok(result.public.headroom > 0);
  assert.ok(result.dist.headroom === null || result.dist.headroom > 0);
  assert.ok(result.apiFunctions.count <= result.apiFunctions.budget);
  assert.ok(result.largestPublic.bytes <= 10_000_000);
});
