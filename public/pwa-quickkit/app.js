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
    button.textContent = 'Analyser le site';
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


const proCheckout = document.getElementById('proCheckout');
if (proCheckout) {
  proCheckout.addEventListener('click', async () => {
    const note = document.getElementById('proCheckoutNote');
    const original = proCheckout.textContent;
    proCheckout.disabled = true;
    proCheckout.textContent = 'Préparation…';
    try {
      const response = await fetch('/api/pwa-quickkit-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      if (note) note.textContent = data.message || 'Le checkout Pro live n’est pas encore activé. Aucun paiement réel n’a été lancé.';
    } catch {
      if (note) note.textContent = 'Le checkout Pro live n’est pas encore activé. Aucun paiement réel n’a été lancé.';
    } finally {
      proCheckout.disabled = false;
      proCheckout.textContent = original;
    }
  });
}

const checkoutState = new URLSearchParams(location.search).get('checkout');
if (checkoutState === 'success') {
  const note = document.getElementById('proCheckoutNote');
  if (note) note.textContent = 'Paiement test reçu. Les droits Pro restent verrouillés tant que le système d’accès n’est pas branché.';
}
