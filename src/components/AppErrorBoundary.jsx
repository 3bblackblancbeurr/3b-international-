import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state={hasError:false};
  }

  static getDerivedStateFromError(){
    return {hasError:true};
  }

  componentDidCatch(error,info){
    console.error('[3B app crash]',error,info);
  }

  render(){
    if(!this.state.hasError)return this.props.children;
    return <main className="app-crash" role="alert">
      <section>
        <p className="eyebrow">3B International</p>
        <div className="app-crash-mark" aria-hidden="true">3B</div>
        <h1>L’application a rencontré un problème.</h1>
        <p>Ta progression enregistrée n’est pas supprimée. Recharge l’application pour reprendre proprement.</p>
        <div className="app-crash-actions">
          <button type="button" className="primary-button" onClick={()=>window.location.reload()}>Recharger 3B</button>
          <a className="secondary-button" href="/">Retour à l’accueil</a>
        </div>
      </section>
    </main>;
  }
}
