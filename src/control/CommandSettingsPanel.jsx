import {Eye,EyeOff,Focus,LayoutGrid,RotateCcw,Settings2,Sparkles,Vibrate} from 'lucide-react';

function Toggle({label,detail,active,onChange,Icon}){
 return <button type="button" className={'control-setting-toggle'+(active?' is-active':'')} onClick={()=>onChange(!active)} aria-pressed={active}>
  <span><Icon size={16}/></span>
  <div><strong>{label}</strong><small>{detail}</small></div>
  <i aria-hidden="true"><b/></i>
 </button>;
}

const MODULES=[
 ['brief','Brief du jour'],
 ['alerts','Centre d’attention'],
 ['nexus','Nexus 3B'],
 ['integrations','Intégrations'],
 ['traffic','Radar 3B'],
 ['dev','Dev Center'],
 ['health','App Health'],
 ['security','Security Center'],
 ['projects','Projects Center']
];

export default function CommandSettingsPanel({
 privacyMode,onPrivacyChange,focus,onFocusChange,compact,onCompactChange,reduced,onReducedChange,
 haptics,onHapticsChange,hiddenModules,onModuleToggle,onResetModules
}){
 return <section className="control-section control-settings control-hide-in-focus" id="cc-settings" aria-label="Personnalisation Command OS">
  <header className="control-section-heading">
   <div><p className="control-kicker"><Settings2 size={13}/> PERSONNALISATION · LOCALE</p><h2>Réglages Command OS</h2></div>
   <Sparkles size={20}/>
  </header>
  <div className="control-settings-grid">
   <Toggle label="Privacy Mode" detail="Masquer les informations sensibles à l’écran" active={privacyMode} onChange={onPrivacyChange} Icon={privacyMode?EyeOff:Eye}/>
   <Toggle label="Mode Focus" detail="Ne garder que priorité et prochaine action" active={focus} onChange={onFocusChange} Icon={Focus}/>
   <Toggle label="Vue compacte" detail="Réduire l’espace vertical sans réduire la lisibilité" active={compact} onChange={onCompactChange} Icon={LayoutGrid}/>
   <Toggle label="Réduire mouvements" detail="Couper localement les animations du cockpit" active={reduced} onChange={onReducedChange} Icon={Sparkles}/>
   <Toggle label="Haptique" detail="Retour tactile subtil sur les actions importantes" active={haptics} onChange={onHapticsChange} Icon={Vibrate}/>
  </div>

  <div className="control-module-settings">
   <div className="control-module-settings-head"><div><span>MODULES VISIBLES</span><strong>Organise ton cockpit</strong></div><button type="button" onClick={onResetModules}><RotateCcw size={14}/>Réinitialiser</button></div>
   <div className="control-module-settings-grid">
    {MODULES.map(([id,label])=>{
     const visible=!hiddenModules?.[id];
     return <button type="button" key={id} className={visible?'is-visible':''} onClick={()=>onModuleToggle(id)} aria-pressed={visible}>
      <span>{visible?<Eye size={14}/>:<EyeOff size={14}/>}</span><strong>{label}</strong><small>{visible?'Visible':'Masqué'}</small>
     </button>;
    })}
   </div>
  </div>

  <p className="control-settings-note">Ces préférences restent locales à cet appareil. Elles ne changent aucune permission serveur et ne masquent jamais la barrière propriétaire.</p>
 </section>;
}