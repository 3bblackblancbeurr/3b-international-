import test from 'node:test';
import assert from 'node:assert/strict';

function applyTx(state,tx){
  if(tx.nonce!==state.nonce)return state;
  if(tx.amount<=0||tx.amount>state.balance)return state;
  return {balance:state.balance-tx.amount,nonce:state.nonce+1,applied:state.applied+1};
}

test('finite model: replay cannot spend the same nonce twice and balance never goes negative',()=>{
  for(let balance=0;balance<=4;balance++){
    for(let nonce=0;nonce<=3;nonce++){
      for(let amount=1;amount<=5;amount++){
        const start={balance,nonce,applied:0};
        const tx={nonce,amount};
        const once=applyTx(start,tx);
        const twice=applyTx(once,tx);
        assert.ok(once.balance>=0);
        assert.ok(twice.balance>=0);
        assert.ok(twice.applied<=1);
        if(amount<=balance){
          assert.equal(once.applied,1);
          assert.equal(twice,once);
        }else{
          assert.deepEqual(once,start);
        }
      }
    }
  }
});

test('finite model: stale and future nonces cannot change state',()=>{
  for(let balance=0;balance<=4;balance++){
    for(let nonce=0;nonce<=3;nonce++){
      const state={balance,nonce,applied:0};
      for(const candidate of [nonce-1,nonce+1,nonce+2]){
        const next=applyTx(state,{nonce:candidate,amount:1});
        assert.deepEqual(next,state);
      }
    }
  }
});

const transitions={
  requested:new Set(['policy_checked','rejected','cancelled']),
  policy_checked:new Set(['risk_checked','rejected','cancelled']),
  risk_checked:new Set(['human_approved','rejected','cancelled']),
  human_approved:new Set(['threshold_approved','rejected','cancelled']),
  threshold_approved:new Set(['broadcast','cancelled']),
  broadcast:new Set(['reconciled']),
  reconciled:new Set(),
  rejected:new Set(),
  cancelled:new Set(),
};

function reachable(from,to,seen=new Set()){
  if(from===to)return true;
  if(seen.has(from))return false;
  seen.add(from);
  return [...transitions[from]].some(next=>reachable(next,to,new Set(seen)));
}

test('Vault model: broadcast requires policy, risk, human and threshold stages',()=>{
  assert.ok(reachable('requested','broadcast'));
  assert.ok(!transitions.requested.has('broadcast'));
  assert.ok(!transitions.policy_checked.has('broadcast'));
  assert.ok(!transitions.risk_checked.has('broadcast'));
  assert.ok(!transitions.human_approved.has('broadcast'));
  assert.ok(transitions.threshold_approved.has('broadcast'));
});

test('Vault model: terminal states cannot return to signing flow',()=>{
  for(const terminal of ['reconciled','rejected','cancelled']){
    assert.equal(transitions[terminal].size,0);
    assert.ok(!reachable(terminal,'broadcast'));
    assert.ok(!reachable(terminal,'threshold_approved'));
  }
});
