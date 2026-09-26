import {Eye,EyeOff,Focus,LayoutGrid,Settings2,Sparkles} from 'lucide-react';

function Toggle({label,detail,active,onChange,Icon}){
 return <button type="button" className={'control-setting-toggle'+(active?' is-active':'')} onClick={()=>onChange(!active)} aria-pressed={active}>
  <span><Icon size={16}/></span>
  <div><strong>{label}</strong><small>{detail}</small></div>
  <i aria-hidden="true"><b/></i>
 </button>;
}

export default function CommandSettingsPanel({
 privacyMode,onPrivacyChange,focus,onFocusChange,compact,onCompactChange,reduced,onReducedChange
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
  </div>
  <p className="control-settings-note">Ces préférences restent locales à cet appareil. Elles ne changent aucune permission serveur.</p>
 </section>;
}
