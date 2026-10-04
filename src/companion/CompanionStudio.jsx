import React, { useEffect, useRef, useState } from 'react';
import { Hand, Music2, Sparkles, Move, Orbit, ArrowDownToLine, Moon, MessageCircle, Send, Zap, Heart, Focus, Volume2, VolumeX, X, Check, ChevronDown } from 'lucide-react';
import { Button } from '../design-system/index.jsx';
import { COMPANION_PERSONALITIES } from './companion-personality.js';

const ACTIONS = [
  { id: 'dance', label: 'Danse', hint: 'Le rythme dans les jambes', icon: Music2 },
  { id: 'breakdance', label: 'Breakdance', hint: 'Un autre style', icon: Zap },
  { id: 'pocket', label: 'Surprise', hint: 'Qu’y a-t-il dans sa poche ?', icon: Sparkles },
  { id: 'hologram', label: 'Hologramme', hint: 'Une lumière entre ses mains', icon: Orbit },
  { id: 'hang', label: 'Les lettres', hint: 'S’accrocher à un titre', icon: Move },
  { id: 'fall', label: 'Cascade', hint: 'Tomber et se relever', icon: ArrowDownToLine },
  { id: 'walk', label: 'Promenade', hint: 'Explorer ton écran', icon: Move },
  { id: 'highfive', label: 'Tape-là', hint: 'Une main pour toi', icon: Hand },
  { id: 'hello', label: 'Coucou', hint: 'Un signe de la main', icon: Heart },
  { id: 'curious', label: 'Une question', hint: 'À toi de lui répondre', icon: MessageCircle },
  { id: 'focus', label: 'Concentration', hint: 'Une présence tranquille', icon: Focus },
  { id: 'rest', label: 'Une pause', hint: 'Souffler un peu', icon: Moon },
];
const FEATURED_ACTIONS = ['dance', 'highfive', 'hologram', 'walk'];
const TABS = [['play', 'Jouer'], ['talk', 'Discuter'], ['character', 'Caractère']];

/** The console contains choices; animation and speech remain owned by the layer. */
export default function CompanionStudio({ living, onLivingChange, onAction, onSubmit, reply, history, voice, onVoiceToggle, onVoiceSample, onVoiceStop, focused, onResume, requestedTab }) {
  const [tab, setTab] = useState('play');
  const [draft, setDraft] = useState('');
  const logRef = useRef(null);
  const personality = COMPANION_PERSONALITIES.find(item => item.id === living.personality) || COMPANION_PERSONALITIES[0];
  useEffect(() => { if (requestedTab?.tab) setTab(requestedTab.tab); }, [requestedTab]);
  useEffect(() => {
    if (tab === 'talk' && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [history, tab]);

  function submit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    onSubmit(text);
  }
  function choose(choice) {
    if (choice.action) onAction(choice.action);
    else onSubmit(choice.text || choice.label, choice.page);
  }
  function renderAction({ id, label, hint, icon: Icon }) {
    return <Button key={id} type="button" variant="ghost" className="companion3b-action"
      onClick={() => { if (id === 'curious') setTab('talk'); onAction(id); }}
      aria-label={`${label} · ${hint}`} title={hint} aria-pressed={reply?.action === id}>
      <Icon size={20} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span>
      <span className="companion3b-action-signal" aria-hidden="true" />
    </Button>;
  }

  return <section className="companion3b-studio" aria-label="Ton compagnon vivant" data-tab={tab}>
    <div className="companion3b-studio-tabs" role="tablist" aria-label="Activités du compagnon">
      {TABS.map(([id, label]) => <Button
        key={id} id={`companion-tab-${id}`} type="button" variant="ghost" role="tab" aria-selected={tab === id}
        aria-controls={`companion-content-${id}`} tabIndex={tab === id ? 0 : -1}
        onClick={() => setTab(id)} onKeyDown={event => {
          const ids = TABS.map(([tabId]) => tabId);
          let target;
          if (event.key === 'ArrowRight') target = ids[(ids.indexOf(id) + 1) % ids.length];
          if (event.key === 'ArrowLeft') target = ids[(ids.indexOf(id) + ids.length - 1) % ids.length];
          if (event.key === 'Home') target = ids[0];
          if (event.key === 'End') target = ids[2];
          if (target) { event.preventDefault(); setTab(target); document.getElementById(`companion-tab-${target}`)?.focus(); }
        }}>{label}</Button>)}
    </div>

    {focused && <div className="companion3b-focus-notice" role="status"><Focus size={16} aria-hidden="true" /><span>Je te laisse te concentrer.</span><Button type="button" variant="ghost" onClick={onResume}>Reprendre</Button></div>}

    <div id="companion-content-play" role="tabpanel" aria-labelledby="companion-tab-play" hidden={tab !== 'play'}>
      <div className="companion3b-action-grid" role="group" aria-label="Tes envies du moment">
        {FEATURED_ACTIONS.map(id => renderAction(ACTIONS.find(action => action.id === id)))}
      </div>
      <details className="companion3b-more-actions">
        <summary><span>Toutes ses animations</span><ChevronDown size={16} aria-hidden="true" /></summary>
        <div className="companion3b-action-grid" role="group" aria-label="Autres animations">
          {ACTIONS.filter(action => !FEATURED_ACTIONS.includes(action.id)).map(renderAction)}
        </div>
        <p className="companion3b-studio-caption">Attrape-le dans l’application, puis relâche-le pour le voir retrouver son équilibre.</p>
      </details>
    </div>

    <div id="companion-content-talk" role="tabpanel" aria-labelledby="companion-tab-talk" hidden={tab !== 'talk'}>
      <div ref={logRef} className="companion3b-chat-log" role="log" aria-label="Votre discussion" aria-live="polite" aria-relevant="additions">
        {history.length ? history.map(entry => <p key={entry.id} data-speaker={entry.sender}><small>{entry.sender === 'user' ? 'Toi' : 'Compagnon 3B'}</small>{entry.message}</p>) : <p data-speaker="companion"><small>Compagnon 3B</small>Une danse, une blague, une devinette ? Dis-moi ce qui te ferait plaisir.</p>}
      </div>
      {!!reply?.choices?.length && <div className="companion3b-reply-choices" aria-label="Répondre au compagnon">{reply.choices.map((choice, index) => <Button variant="ghost" key={`${choice.label}-${index}`} onClick={() => choose(choice)}>{choice.label}</Button>)}</div>}
      <form className="companion3b-chat-form" onSubmit={submit}>
        <label className="companion3b-sr-only" htmlFor="companion3b-message">Ton message au compagnon</label>
        <input id="companion3b-message" type="text" value={draft} onChange={event => setDraft(event.target.value)} maxLength={300} autoComplete="off" enterKeyHint="send" placeholder="Dis-moi quelque chose…" />
        <Button type="submit" variant="champagne" disabled={!draft.trim()} aria-label="Envoyer au compagnon"><Send size={18} /></Button>
      </form>
    </div>

    <div id="companion-content-character" role="tabpanel" aria-labelledby="companion-tab-character" hidden={tab !== 'character'}>
      <div className="companion3b-personalities" role="group" aria-label="Choisir le caractère">{COMPANION_PERSONALITIES.map(item => <Button
        key={item.id} type="button" variant="ghost" className="companion3b-personality" aria-pressed={living.personality === item.id}
        aria-label={`${item.label} · ${item.description}`} title={item.description}
        onClick={() => onLivingChange({ personality: item.id })}>
        <strong>{item.label}</strong><Check size={15} aria-hidden="true" />
      </Button>)}</div>
      <p className="companion3b-personality-description">{personality.description}</p>
      <div className="companion3b-toggles">
        <label><span><strong>Prendre des initiatives</strong><small>Promenades, petites scènes et questions spontanées</small></span><input type="checkbox" role="switch" checked={living.initiative} onChange={event => onLivingChange({ initiative: event.target.checked })} /></label>
      </div>
    </div>

    <div className="companion3b-voice-tools">
    <div className="companion3b-voice-control">
      <Button type="button" variant="ghost" aria-pressed={living.voiceEnabled} onClick={onVoiceToggle} disabled={!voice.available}>
        {living.voiceEnabled ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}<span>{living.voiceEnabled ? 'Voix activée' : 'Activer sa voix'}</span>
      </Button>
      {voice.speaking && <Button type="button" variant="ghost" className="companion3b-voice-stop" onClick={onVoiceStop} aria-label="Arrêter la phrase"><X size={17} aria-hidden="true" /></Button>}
      {!voice.available && <small>Les réponses restent disponibles à l’écrit.</small>}
    </div>
    {voice.available && <details className="companion3b-voice-design">
      <summary><span>Voix et timbre</span><ChevronDown size={14} aria-hidden="true" /></summary>
      <div className="companion3b-voice-fields">
        <label htmlFor="companion3b-voice-style">Timbre<select id="companion3b-voice-style" value={living.voiceStyle || 'grave'} onChange={event => onLivingChange({ voiceStyle: event.target.value })}>
          <option value="grave">Grave · posé et profond</option><option value="naturelle">Naturel · proche de toi</option><option value="lumineuse">Lumineux · vif et clair</option><option value="calme">Calme · doux et lent</option>
        </select></label>
        <label htmlFor="companion3b-voice-id">Voix de l’appareil<select id="companion3b-voice-id" value={(voice.voices || []).some(item => item.id === living.voiceId) ? living.voiceId : 'auto'} onChange={event => onLivingChange({ voiceId: event.target.value })}>
          <option value="auto">Voix française automatique</option>{(voice.voices || []).map(item => <option key={item.id} value={item.id}>{item.name} · {item.lang}</option>)}
        </select></label>
      </div>
      <Button type="button" variant="ghost" onClick={onVoiceSample}><Volume2 size={16} aria-hidden="true"/>Écouter cette voix</Button>
      <small>Les voix proposées dépendent de ton téléphone ou de ton navigateur.</small>
    </details>}
    {living.voiceEnabled && voice.statusLabel && <p className="companion3b-voice-status" role="status">{voice.statusLabel}</p>}
    </div>
  </section>;
}
