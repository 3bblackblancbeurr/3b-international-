import React from 'react';
import {AlertTriangle,RefreshCw} from 'lucide-react';

export default class ModuleBoundary extends React.Component{
 constructor(props){
  super(props);
  this.state={failed:false};
 }
 static getDerivedStateFromError(){
  return{failed:true};
 }
 componentDidCatch(error){
  if(import.meta.env?.DEV)console.error('3B Command OS module error',error);
 }
 reset=()=>this.setState({failed:false});
 render(){
  if(!this.state.failed)return this.props.children;
  return <section className="control-section control-module-fallback" role="status">
   <AlertTriangle size={19}/>
   <div><strong>{this.props.label||'Module momentanément indisponible'}</strong><small>Les autres fonctions de Command OS continuent de fonctionner.</small></div>
   <button type="button" onClick={this.reset}><RefreshCw size={14}/>Réessayer</button>
  </section>;
 }
}
