import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Download, ExternalLink, FileCheck2, LockKeyhole, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { useLoyalty } from '../loyalty/LoyaltyContext.jsx';
import { Button } from '../design-system/index.jsx';
import { passportRequest } from './verification-client.js';
import { PassportVerificationError, presentationForOwner, proofState, remainingSeconds, safeHttpsUrl, validateProof, validateProofRequest, validateRegistry, validateTicket } from './verification-contract.js';
import './passport-verification.css';

const SCOPES = Object.freeze({
  'passport.basic': ['Passeport actif', 'État actif et version du Passeport 3B.'],
  'identity.verified': ['Identité civile vérifiée', 'Confirmation d’une vérification par un prestataire externe.'],
  'profile.public': ['Profil public 3B', 'Nom d’affichage et pseudo public 3B.'],
  'access.entitlements': ['Droits d’accès 3B', 'Droits d’accès actifs enregistrés sur ton compte.'],
});
const STATES = { issued: 'Émise · vérification serveur requise', consumed: 'Utilisée', revoked: 'Révoquée', expired: 'Expirée' };
const clock = value => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
const date = value => { const timestamp = Date.parse(value); return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'Date indisponible'; };
const isVerified = identity => identity?.identityVerificationStatus === 'verified' && Number.isFinite(Date.parse(identity.identityVerifiedAt)) && Date.parse(identity.identityVerifiedAt) <= Date.now() && ['identity_verified', 'high_assurance'].includes(identity.identityAssuranceLevel);

function panelMessage(message) { return message ? <p className="pv-message" role="status">{message}</p> : null; }

export default function PassportVerification({ identity, syncing, goTo }) {
  const account = useLoyalty();
  const userId = account.user?.id || null;
  const allowed = Boolean(!syncing && userId && identity?.userId === userId && identity.passportState === 'active');
  const owner = useRef({ userId, allowed });
  if (owner.current.userId !== userId || owner.current.allowed !== allowed) owner.current = { userId, allowed };
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  const [now, setNow] = useState(Date.now);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [idv, setIdv] = useState(null);
  const [registryState, setRegistry] = useState(null);
  const [errors, setErrors] = useState({});
  const [notices, setNotices] = useState({});
  const [ticketState, setTicket] = useState(null);
  const [issuedProofState, setIssuedProof] = useState(null);
  const [partnerId, setPartnerId] = useState('');
  const [scopes, setScopes] = useState([]);
  const [nonce, setNonce] = useState('');
  const [consent, setConsent] = useState(false);
  const [copyState, setCopyValue] = useState(null);
  const [idvLinkState, setIdvLink] = useState(null);
  const [idvConsent, setIdvConsent] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const copyRef = useRef(null);
  // The render itself rejects an old account's secrets; cleanup effects are secondary.
  const ticket = presentationForOwner(ticketState, userId, allowed && !authRequired);
  const issuedProof = presentationForOwner(issuedProofState, userId, allowed && !authRequired);
  const registry = presentationForOwner(registryState, userId, allowed && !authRequired);
  const copyValue = presentationForOwner(copyState, userId, allowed && !authRequired);
  const idvLink = presentationForOwner(idvLinkState, userId, allowed && !authRequired)?.url;

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const connected = () => { setOnline(true); setRevision(value => value + 1); };
    const disconnected = () => setOnline(false);
    window.addEventListener('online', connected); window.addEventListener('offline', disconnected);
    return () => { clearInterval(tick); window.removeEventListener('online', connected); window.removeEventListener('offline', disconnected); owner.current = {}; };
  }, []);

  useEffect(() => {
    setTicket(null); setIssuedProof(null); setRegistry(null); setIdv(null); setErrors({}); setNotices({}); setBusy('');
    setPartnerId(''); setScopes([]); setNonce(''); setConsent(false); setCopyValue(null); setIdvLink(null); setIdvConsent(false); setAuthRequired(false);
  }, [userId, allowed]);

  useEffect(() => {
    if (!allowed || !online) { setLoading(false); return; }
    const controller = new AbortController(), requestOwner = owner.current;
    setLoading(true);
    Promise.allSettled([
      passportRequest('passport-recognition', { action: 'status' }, userId, controller.signal).then(validateRegistry),
      passportRequest('passport-idv', { action: 'readiness' }, userId, controller.signal),
    ]).then(([recognition, identityReadiness]) => {
      if (controller.signal.aborted || owner.current !== requestOwner) return;
      const nextErrors = {};
      if (recognition.status === 'fulfilled') {
        const next = recognition.value;
        setRegistry({ ...next, ownerUserId: userId, partners: next.partners.filter(partner => typeof partner.id === 'string' && typeof partner.name === 'string' && Array.isArray(partner.scopes)).map(partner => ({ ...partner, scopes: partner.scopes.filter(scope => Object.hasOwn(SCOPES, scope)) })) });
        setIssuedProof(current => current && next.proofs.some(proof => proof.id === current.proofId && ['revoked', 'consumed', 'expired'].includes(proof.status)) ? null : current);
      } else {
        setRegistry(null);
        nextErrors.partner = recognition.status === 'rejected' ? recognition.reason?.message : 'Le registre partenaire n’a pas retourné un état complet.';
      }
      if (identityReadiness.status === 'fulfilled') setIdv(identityReadiness.value);
      else { setIdv(null); nextErrors.idv = identityReadiness.reason?.message || 'Le service d’identité est indisponible.'; }
      if ([recognition, identityReadiness].some(result => result.status === 'rejected' && result.reason?.status === 401)) {
        setAuthRequired(true); setTicket(null); setIssuedProof(null); setCopyValue(null); setIdvLink(null);
      } else if (recognition.status === 'fulfilled' || identityReadiness.status === 'fulfilled') setAuthRequired(false);
      setErrors(current => ({ ...current, partner: nextErrors.partner || '', idv: nextErrors.idv || '' }));
      setLoading(false);
    });
    return () => controller.abort();
  }, [allowed, userId, online, revision]);

  useEffect(() => {
    if (ticket && !remainingSeconds(ticket.expiresAt, now)) {
      setTicket(null); setCopyValue(null); setNotices(current => ({ ...current, qr: 'Ce code a expiré. Génère un nouveau code pour une prochaine présentation.' }));
    }
    if (issuedProof && !remainingSeconds(issuedProof.expiresAt, now)) {
      setIssuedProof(null); setCopyValue(null); setNotices(current => ({ ...current, partner: 'L’attestation a expiré. Une nouvelle demande du partenaire est nécessaire.' }));
    }
  }, [now, ticket, issuedProof]);

  useEffect(() => { if (copyValue) { copyRef.current?.focus(); copyRef.current?.select(); } }, [copyValue]);

  const partners = registry?.partners || [];
  const selectedPartner = partners.find(partner => partner.id === partnerId);
  const verified = isVerified(identity);
  const idvReady = idv?.enabled === true && idv.productionFlowApproved === true && idv.physicalEnvironment === 'production' && idv.logicalEnvironment === 'live';
  const blocked = Boolean(!online || loading || busy || !allowed || authRequired);
  const partnerReady = registry?.readiness?.ready === true && partners.length > 0;
  const registryAvailable = Boolean(registry && registry.readiness.registryReady !== false);
  const issueReady = partnerReady && selectedPartner && scopes.length > 0 && /^[A-Za-z0-9_-]{32,128}$/.test(nonce) && consent;

  async function perform(kind, service, body, accept, validate = value => value) {
    if (blocked) return;
    const requestOwner = owner.current;
    setBusy(kind); setErrors(current => ({ ...current, [kind]: '' })); setNotices(current => ({ ...current, [kind]: '' })); setCopyValue(null);
    try {
      const result = validate(await passportRequest(service, body, userId));
      if (owner.current === requestOwner) accept(result);
    } catch (error) {
      if (owner.current === requestOwner) {
        setErrors(current => ({ ...current, [kind]: error?.message || 'La demande n’a pas abouti. Réessaie.' }));
        if (error?.status === 401) { setAuthRequired(true); setTicket(null); setIssuedProof(null); setCopyValue(null); setIdvLink(null); }
      }
    } finally { if (owner.current === requestOwner) setBusy(''); }
  }

  async function copy(value, label) {
    const requestOwner = owner.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      if (owner.current === requestOwner) setNotices(current => ({ ...current, general: label + ' copié.' }));
    } catch { if (owner.current === requestOwner) setCopyValue({ value, label, ownerUserId: userId }); }
  }

  function downloadProof() {
    if (!issuedProof || !remainingSeconds(issuedProof.expiresAt)) return;
    const document = { type: '3B-partner-attestation', proof: issuedProof.proofJWT, proofId: issuedProof.proofId, partnerName: issuedProof.partnerName, expiresAt: issuedProof.expiresAt };
    const url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }));
    const link = window.document.createElement('a'); link.href = url; link.download = 'attestation-3b-' + issuedProof.proofId.replace(/[^A-Za-z0-9_-]/g, '').slice(0,64) + '.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotices(current => ({ ...current, general: 'Attestation exportée. Elle reste soumise à son expiration et à la vérification du partenaire.' }));
  }

  function issuePartnerProof(event) {
    event.preventDefault();
    try {
      if (!partnerReady) throw new PassportVerificationError('Aucun partenaire n’est disponible pour cette demande.');
      const request = validateProofRequest({ partnerId, scopes, nonce, consent }, selectedPartner);
      perform('partner', 'passport-recognition', { action: 'issue', ...request }, result => {
        setIssuedProof({ ...result, ownerUserId: userId }); setConsent(false); setNonce(''); setRevision(value => value + 1);
        setNotices(current => ({ ...current, partner: 'Attestation émise par 3B. Transmets-la au partenaire pour vérification.' }));
      }, validateProof);
    } catch (error) { setErrors(current => ({ ...current, partner: error.message })); }
  }

  return <section className="passport-verification" aria-labelledby="passport-verification-heading">
    <header className="pv-heading">
      <div><p className="pv-eyebrow">PRÉSENTATION · VÉRIFICATION · CONSENTEMENT</p><h2 id="passport-verification-heading">Faire vérifier ton Passeport 3B</h2><p>Présente un code temporaire ou une attestation dédiée à un partenaire.</p></div>
      <span className="pv-status"><LockKeyhole size={15} aria-hidden="true" /> Partage sous ton contrôle</span>
    </header>
    <p className="pv-boundary">Le Passeport 3B est une identité numérique privée. L’acceptation d’une attestation dépend du partenaire et de son accord avec 3B.</p>
    {!online && <p className="pv-message" role="status">Tu es hors ligne. Les présentations et vérifications nécessitent une connexion Internet.</p>}
    {!allowed || authRequired ? <div className="pv-locked"><ShieldCheck size={28} aria-hidden="true" /><div><h3>{syncing ? 'Vérification de la session…' : authRequired ? 'Reconnecte-toi pour présenter ton passeport' : 'Un Passeport 3B actif est requis'}</h3><p>{syncing ? 'Les actions seront disponibles après la synchronisation de ton compte.' : 'Connecte-toi à ton compte pour présenter ton passeport et gérer tes attestations.'}</p></div>{!syncing && <Button onClick={() => goTo('member')}>Ouvrir mon compte</Button>}</div> : <>
      <div className="pv-toolbar"><span>{loading ? 'Actualisation des services…' : 'État retourné par les services 3B'}</span><Button variant="ghost" size="sm" disabled={blocked} onClick={() => { setRevision(value => value + 1); account.refresh(); }}><RefreshCw size={14} aria-hidden="true" /> Actualiser</Button></div>
      <div className="pv-grid">
        <section className="pv-panel" aria-labelledby="pv-qr-title">
          <div className="pv-panel-heading"><QrCode size={21} aria-hidden="true" /><span>01 · PRÉSENTATION</span></div>
          <h3 id="pv-qr-title">Un code. Une présentation.</h3><p>Le destinataire consulte le numéro, le profil public et le niveau de vérification de ton passeport. Le code expire après cinq minutes et ne sert qu’une seule fois.</p>
          {ticket ? <div className="pv-ticket"><img src={ticket.qrDataUrl} width="200" height="200" alt="Code QR temporaire pour vérifier ce Passeport 3B" /><div><strong>Expire dans {clock(remainingSeconds(ticket.expiresAt, now))}</strong><p>Le premier scan consomme le code. Générer un autre code annule le précédent.</p></div><div className="pv-actions"><Button variant="ghost" size="sm" onClick={() => copy(ticket.verifyUrl, 'Lien de présentation')}><Copy size={15} aria-hidden="true" /> Copier le lien</Button>{ticket.ticketId && <Button variant="ghost" size="sm" disabled={blocked} onClick={() => perform('qr', 'passport-identity', { action: 'revoke', ticketId: ticket.ticketId }, () => { setTicket(null); setNotices(current => ({ ...current, qr: 'Code révoqué par le serveur.' })); })}>Révoquer</Button>}</div></div> : <div className="pv-placeholder"><QrCode size={36} aria-hidden="true" /><span>Ton code apparaît uniquement à ta demande.</span></div>}
          <Button disabled={blocked} loading={busy === 'qr'} onClick={() => perform('qr', 'passport-identity', { action: 'issue' }, result => setTicket({ ...result, ownerUserId: userId }), validateTicket)}>{ticket ? 'Générer un nouveau code' : 'Générer mon code de présentation'}</Button>
          {errors.qr && <p className="pv-error" role="alert">{errors.qr}</p>}{panelMessage(notices.qr)}
        </section>
        <section className="pv-panel" aria-labelledby="pv-idv-title">
          <div className="pv-panel-heading"><ShieldCheck size={21} aria-hidden="true" /><span>02 · IDENTITÉ</span></div>
          <h3 id="pv-idv-title">Un niveau de confiance explicite.</h3><p>Un compte actif et un badge public n’attestent pas, à eux seuls, une identité civile.</p>
          <div className="pv-assurance" data-verified={verified}><CheckCircle2 size={23} aria-hidden="true" /><div><strong>{verified ? (identity.identityAssuranceLevel === 'high_assurance' ? 'Identité vérifiée · assurance renforcée' : 'Identité civile vérifiée') : identity.identityVerificationStatus === 'pending' ? 'Contrôle en cours' : 'Identité civile non vérifiée'}</strong><span>{verified ? 'Vérifiée le ' + date(identity.identityVerifiedAt) : 'Seule une confirmation externe peut valider cette identité.'}</span></div></div>
          {!verified && <><p className="pv-service-note">{idvReady ? 'Le parcours sécurisé du prestataire est disponible.' : loading ? 'Vérification de la disponibilité du prestataire…' : idv ? 'Le contrôle externe n’est pas encore ouvert. Ton niveau d’identité reste inchangé.' : 'La disponibilité du contrôle externe ne peut pas être confirmée. Actualise les services.'}</p>{idvReady && !account.identityClaimsComplete && <Button variant="ghost" onClick={() => goTo('member')}>Compléter mes informations d’identité</Button>}{idvReady && <label className="pv-consent pv-idv-consent"><input type="checkbox" checked={idvConsent} onChange={event => setIdvConsent(event.target.checked)} disabled={blocked || identity.identityVerificationStatus === 'pending'} /><span>J’autorise le prestataire IDnow à recevoir mes nom, prénom et date de naissance pour ce contrôle.</span></label>}<Button disabled={blocked || !idvReady || !idvConsent || !account.identityClaimsComplete || identity.identityVerificationStatus === 'pending'} loading={busy === 'idv'} onClick={() => perform('idv', 'passport-idv', { action: 'start', consent: true }, result => {
            const url = safeHttpsUrl(result.playerUrl); if (!url) throw new PassportVerificationError('Le prestataire n’a pas fourni de lien sécurisé.');
            setIdvLink({ url, ownerUserId: userId }); setIdvConsent(false); setNotices(current => ({ ...current, idv: 'Le parcours du prestataire est prêt. Ouvre-le pour continuer, puis actualise ton passeport à ton retour.' })); account.refresh();
          })}>Commencer le contrôle externe</Button></>}
          {idvLink && <a className="pv-provider-link" href={idvLink} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Ouvrir le parcours sécurisé <ExternalLink size={15} aria-hidden="true" /></a>}
          {errors.idv && <p className="pv-error" role="alert">{errors.idv}</p>}{panelMessage(notices.idv)}
        </section>
      </div>
      <section className="pv-panel pv-partner" aria-labelledby="pv-partner-title">
        <div className="pv-panel-heading"><FileCheck2 size={21} aria-hidden="true" /><span>03 · ATTESTATION PARTENAIRE</span></div>
        <h3 id="pv-partner-title">Uniquement ce que tu acceptes de partager.</h3><p>Une attestation signée cible un partenaire actif et sa demande. Elle expire rapidement ; le partenaire vérifie sa signature, son destinataire et son état côté serveur.</p>
        {partners.length === 0 ? <div className="pv-empty"><LockKeyhole size={22} aria-hidden="true" /><div><strong>{loading ? 'Consultation du registre…' : registryAvailable ? 'Aucun partenaire actif enregistré' : 'Le registre est actuellement indisponible'}</strong><p>{registryAvailable ? 'L’émission sera disponible lorsqu’un partenaire aura été intégré et son accord activé. Aucune reconnaissance externe n’est annoncée à ce stade.' : 'Actualise les services pour connaître la disponibilité. Aucune preuve locale ne remplace une attestation serveur.'}</p></div></div> : <form className="pv-proof-form" onSubmit={issuePartnerProof}>
          {!partnerReady && <p className="pv-message">L’émission d’attestations n’est pas disponible actuellement.</p>}
          <div className="pv-form-row"><label>Partenaire destinataire<select value={partnerId} onChange={event => { setPartnerId(event.target.value); setScopes([]); setConsent(false); setNonce(''); }} disabled={blocked || !partnerReady}><option value="">Choisir un partenaire actif</option>{partners.map(partner => <option key={partner.id} value={partner.id}>{partner.name}</option>)}</select></label>{selectedPartner && safeHttpsUrl(selectedPartner.website) && <a className="pv-provider-link" href={safeHttpsUrl(selectedPartner.website)} target="_blank" rel="noopener noreferrer">Voir le partenaire <ExternalLink size={14} aria-hidden="true" /></a>}</div>
          {selectedPartner && <><fieldset disabled={blocked || !partnerReady}><legend>Informations autorisées</legend><div className="pv-scopes">{selectedPartner.scopes.map(scope => <label key={scope}><input type="checkbox" checked={scopes.includes(scope)} disabled={scope === 'identity.verified' && !verified} onChange={event => { setScopes(current => event.target.checked ? [...current, scope] : current.filter(value => value !== scope)); setConsent(false); }} /><span><strong>{SCOPES[scope][0]}</strong><small>{SCOPES[scope][1]}{scope === 'identity.verified' && !verified ? ' — indisponible sans contrôle externe confirmé.' : ''}</small></span></label>)}</div></fieldset><label className="pv-challenge">Code de demande fourni par le partenaire<input value={nonce} onChange={event => { setNonce(event.target.value.trim()); setConsent(false); }} maxLength={128} autoComplete="off" spellCheck="false" placeholder="Colle le code communiqué par le partenaire" aria-describedby="pv-challenge-help" disabled={blocked || !partnerReady} /><small id="pv-challenge-help">32 à 128 lettres, chiffres, tirets ou traits de soulignement. Ce code relie l’attestation à sa demande ; un code inventé ici ne prouve aucune possession.</small></label><label className="pv-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={blocked || !partnerReady} /><span>J’autorise le partage des seules informations cochées avec <strong>{selectedPartner.name}</strong> pour cette demande.</span></label></>}
          <Button type="submit" disabled={blocked || !issueReady} loading={busy === 'partner'}>Émettre l’attestation signée</Button>
        </form>}
        {issuedProof && <div className="pv-issued"><div><CheckCircle2 size={21} aria-hidden="true" /><strong>Attestation pour {issuedProof.partnerName}</strong><span>Expire dans {clock(remainingSeconds(issuedProof.expiresAt, now))}</span></div><p>La preuve est disponible pendant cette ouverture. Après fermeture, le registre conserve son état ; son jeton n’est pas récupérable ici.</p><div className="pv-actions"><Button variant="ghost" size="sm" onClick={() => copy(issuedProof.proofJWT, 'Attestation signée')}><Copy size={15} aria-hidden="true" /> Copier l’attestation</Button><Button variant="ghost" size="sm" onClick={downloadProof}><Download size={15} aria-hidden="true" /> Télécharger</Button></div></div>}
        {errors.partner && <p className="pv-error" role="alert">{errors.partner}</p>}{panelMessage(notices.partner)}
        {Boolean(registry?.proofs?.length) && <div className="pv-history"><h4>Attestations récentes</h4><ul>{registry.proofs.map(proof => { const state = proofState(proof, now); return <li key={proof.id}><div><strong>{proof.partnerName || 'Partenaire'}</strong><span>{(proof.scopes || []).map(scope => SCOPES[scope]?.[0] || scope).join(' · ')}</span><small>Émise le {date(proof.issuedAt)} · {STATES[state]}</small></div>{state === 'issued' && <Button variant="ghost" size="sm" disabled={blocked} onClick={() => perform('partner', 'passport-recognition', { action: 'revoke', proofId: proof.id }, () => { setIssuedProof(current => current?.proofId === proof.id ? null : current); setRevision(value => value + 1); setNotices(current => ({ ...current, partner: 'Attestation révoquée par le serveur.' })); })}>Révoquer</Button>}</li>; })}</ul></div>}
      </section>
    </>}
    {allowed && notices.general && <p className="pv-message" role="status">{notices.general}</p>}
    {allowed && copyValue && <div className="pv-copy-fallback"><label>{copyValue.label} à copier manuellement<textarea ref={copyRef} value={copyValue.value} readOnly rows={3} spellCheck="false" /></label><Button variant="ghost" size="sm" onClick={() => setCopyValue(null)}>Fermer</Button></div>}
    <p className="pv-privacy"><LockKeyhole size={13} aria-hidden="true" />Les codes et attestations restent en mémoire dans cette page. Le téléchargement n’a lieu qu’à ta demande.</p>
  </section>;
}
