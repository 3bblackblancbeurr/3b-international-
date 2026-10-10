const $ = id => document.getElementById(id);
let lastResult = null;

function showStatus(message, type = 'info') {
  const el = $('status');
  el.textContent = message;
  el.className = `status show ${type}`;
}
function clearStatus(){ $('status').className='status'; $('status').textContent=''; }
function esc(value){ return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function labelForCategory(name){ return name; }

function buildQuickFixMailto(data){
  const url = data?.finalUrl || '';
  const score = Number.isFinite(data?.score) ? `${data.score}/100` : 'non renseigné';
  const priorities = (data?.recommendations || []).slice(0,5).map((r,i)=>`${i+1}. ${r.title}`).join('\n');
  const subject = `PWA QuickKit - Correction Express - ${url ? new URL(url).hostname : 'mon site'}`;
  const body = [
    'Bonjour,',
    '',
    'Je souhaite une Correction Express PWA QuickKit.',
    `Site : ${url}`,
    `Score QuickKit : ${score}`,
    '',
    priorities ? `Priorités détectées :\n${priorities}` : 'Priorités détectées : à confirmer',
    '',
    'Merci de me confirmer le périmètre et le prix avant toute facturation.'
  ].join('\n');
  return `mailto:3bblackblancbeurr@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function render(data){
  lastResult = data;
  $('results').classList.add('show');
  $('scoreRing').style.setProperty('--score', data.score);
  $('scoreValue').textContent = data.score;
  $('grade').textContent = data.grade;
  $('passed').textContent = `${data.summary.passed}/${data.summary.total}`;
  $('failed').textContent = data.summary.failed;
  $('responseMs').textContent = `${data.summary.responseMs} ms`;
  $('auditedHost').textContent = new URL(data.finalUrl).hostname;
  $('auditDate').textContent = `Audit du ${new Date(data.auditedAt).toLocaleString('fr-FR')}`;
  $('categoryGrid').innerHTML = Object.entries(data.categories).map(([name,score]) => `
    <div class="category"><div class="category-top"><span>${esc(labelForCategory(name))}</span><strong>${score}%</strong></div><div class="bar"><i style="width:${score}%"></i></div></div>`).join('');
  $('checks').innerHTML = data.checks.map(c => `
    <div class="check"><div class="dot ${c.pass?'pass':'fail'}">${c.pass?'✓':'!'}</div><div><div class="check-title">${esc(c.label)}</div><div class="detail">${esc(c.detail)}</div></div><span class="pill">${esc(c.category)}</span></div>`).join('');
  $('recommendations').innerHTML = data.recommendations.length ? data.recommendations.map(r => `
    <div class="rec"><div class="rec-top"><span class="priority ${esc(r.priority)}">${esc(r.priority)}</span><strong>${esc(r.title)}</strong></div><p>${esc(r.fix)}</p></div>`).join('') : '<div class="rec"><strong>Excellent.</strong><p>Aucune correction prioritaire détectée dans cet audit statique.</p></div>';

  const quickFix = $('quickFixCta');
  if (quickFix) quickFix.href = buildQuickFixMailto(data);
  const quickFixOffer = $('quickFixOffer');
  if (quickFixOffer) quickFixOffer.href = buildQuickFixMailto(data);

  $('results').scrollIntoView({behavior:'smooth',block:'start'});
}

$('auditForm').addEventListener('submit', async event => {
  event.preventDefault();
  const target = $('urlInput').value.trim();
  if(!target) return;
  const button = $('auditButton');
  button.disabled = true;
  button.textContent = 'Analyse…';
  showStatus('Connexion sécurisée au site et vérification des critères…');
  try{
    const response = await fetch(`/api/pwa-audit?url=${encodeURIComponent(target)}`, {headers:{accept:'application/json'}});
    const data = await response.json().catch(()=>({error:'Réponse serveur invalide.'}));
    if(!response.ok) throw new Error(data.error || 'Audit impossible.');
    clearStatus();
    render(data);
  }catch(error){
    showStatus(error.message || 'Audit impossible.', 'error');
  }finally{
    button.disabled = false;
    button.textContent = 'Analyser gratuitement';
  }
});

$('copyButton').addEventListener('click', async () => {
  if(!lastResult) return;
  const text = `PWA QuickKit — ${lastResult.finalUrl}\nScore: ${lastResult.score}/100 (${lastResult.grade})\nRéussis: ${lastResult.summary.passed}/${lastResult.summary.total}\nÀ corriger: ${lastResult.summary.failed}\nPriorités:\n${lastResult.recommendations.slice(0,6).map((r,i)=>`${i+1}. ${r.title}: ${r.fix}`).join('\n')}`;
  await navigator.clipboard.writeText(text);
  $('copyButton').textContent='Copié ✓'; setTimeout(()=>$('copyButton').textContent='Copier le résumé',1300);
});

$('jsonButton').addEventListener('click', () => {
  if(!lastResult) return;
  const blob = new Blob([JSON.stringify(lastResult,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`pwa-quickkit-${new URL(lastResult.finalUrl).hostname}.json`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
});

const PRO_TOKEN_KEY = 'pwa_quickkit_pro_token_v1';
const proCheckout = document.getElementById('proCheckout');
const proNote = document.getElementById('proCheckoutNote');
let proAvailability = null;

async function checkProAvailability() {
  const response = await fetch('/api/pwa-quickkit-checkout', {
    method: 'GET', headers: { accept: 'application/json' },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !['off', 'test', 'live'].includes(data.mode)
    || typeof data.checkoutConfigured !== 'boolean' || data.offerState !== 'in_preparation') {
    throw new Error('La disponibilité Pro ne peut pas être vérifiée pour le moment. Aucun paiement n’a été ouvert.');
  }
  proAvailability = data;
  if (data.mode === 'test' && data.checkoutConfigured) {
    proCheckout.textContent = 'Tester la démo · aucun débit réel';
    proNote.textContent = 'MODE TEST · Pro est en préparation. La démo simule un abonnement de 9,90 €/mois, sans débit réel et sans accès à des fonctions Pro livrées.';
  } else {
    proCheckout.textContent = 'Revérifier la disponibilité Pro';
    proNote.textContent = data.mode === 'live'
      ? 'MODE RÉEL · Pro reste en préparation et n’est pas proposé à la vente sur cette page. Aucun abonnement ni paiement n’a été ouvert.'
      : data.mode === 'test'
        ? 'MODE TEST · La démo est indisponible pour le moment. Aucun paiement n’a été ouvert.'
        : 'Pro est indisponible et reste en préparation. Aucun paiement n’a été ouvert.';
  }
}

function showProActive(data = {}) {
  if (proCheckout) {
    proCheckout.textContent = data.mode === 'test' ? 'Démo Pro active · aucun débit réel' : 'Accès Pro actif ✓';
    proCheckout.disabled = true;
  }
  if (proNote) {
    const end = data.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleDateString('fr-FR') : null;
    proNote.textContent = data.mode === 'test'
      ? 'MODE TEST · Activation de démonstration uniquement ; les fonctions Pro restent en préparation.'
      : data.cancelAtPeriodEnd
      ? `Pro actif jusqu’au ${end || 'terme de la période'} puis résiliation.`
      : `Pro actif${end ? ` · prochaine échéance autour du ${end}` : ''}.`;
  }
}

async function refreshProStatus() {
  const token = localStorage.getItem(PRO_TOKEN_KEY);
  if (!token) return false;
  try {
    const response = await fetch('/api/pwa-quickkit-status', {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.active) {
      showProActive(data);
      return true;
    }
    localStorage.removeItem(PRO_TOKEN_KEY);
  } catch { /* A temporary network error must not erase the local token. */ }
  return false;
}

async function activateCheckoutReturn() {
  const params = new URLSearchParams(location.search);
  if (params.get('checkout') !== 'success') return false;
  const sessionId = params.get('session_id') || '';
  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) return false;

  if (proNote) proNote.textContent = 'Activation sécurisée de ton accès Pro…';
  try {
    const response = await fetch('/api/pwa-quickkit-activate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.active || !data.token) throw new Error(data.error || 'Activation impossible.');
    localStorage.setItem(PRO_TOKEN_KEY, data.token);
    showProActive(data);
    history.replaceState(null, '', location.pathname + location.hash);
    return true;
  } catch (error) {
    if (proNote) proNote.textContent = error.message || 'Le paiement est confirmé mais l’activation doit être réessayée.';
    return false;
  }
}

if (proCheckout) {
  proCheckout.addEventListener('click', async () => {
    if (proCheckout.disabled) return;
    proCheckout.disabled = true;
    proCheckout.textContent = 'Vérification…';
    try {
      // An availability check never creates a payment session. A separate,
      // explicitly labelled click can open the test-only demonstration.
      if (proAvailability?.mode !== 'test' || !proAvailability.checkoutConfigured) {
        await checkProAvailability();
        return;
      }
      const response = await fetch('/api/pwa-quickkit-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ attemptId: crypto.randomUUID(), expectedMode: 'test' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.mode !== 'test' || !data.url) {
        throw new Error(data.error || 'La démo test est indisponible. Aucun paiement réel n’est proposé ici.');
      }
      const checkoutUrl = new URL(data.url);
      if (checkoutUrl.origin !== 'https://checkout.stripe.com') throw new Error('Le lien de démonstration est invalide.');
      window.location.assign(checkoutUrl.href);
    } catch (error) {
      proAvailability = null;
      proCheckout.textContent = 'Vérifier la disponibilité Pro';
      if (proNote) proNote.textContent = error.message;
    } finally {
      proCheckout.disabled = false;
      if (proCheckout.textContent === 'Vérification…') proCheckout.textContent = 'Tester la démo · aucun débit réel';
    }
  });
}

(async () => {
  const activated = await activateCheckoutReturn();
  if (!activated) await refreshProStatus();
})();
