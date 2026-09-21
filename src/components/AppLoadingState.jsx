export default function AppLoadingState({label='Ouverture de 3B…',compact=false}){
 return <div className={'app-loading-state'+(compact?' is-compact':'')} role="status" aria-live="polite">
  <div className="app-loading-mark" aria-hidden="true"><span>3B</span><i/></div>
  <div>
   <strong>{label}</strong>
   <small>BLACK · BLANC · BEUR</small>
  </div>
 </div>;
}
