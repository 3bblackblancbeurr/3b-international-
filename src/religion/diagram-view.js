import {buildReligionDiagram,diagramEdgePath,RELATION_LABELS} from './diagram-model.js';
import './diagram.css';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function createReligionDiagram(container,corpus,{onChange}={}){
 let state={eligibleIds:corpus.nodes.map(node=>node.id),focusId:'abraham',selected:null,scope:'around',includeLiterary:false,matches:[],query:''};
 let scale=.9,graph,disposed=false;
 container.innerHTML=`<div class="diagram-heading"><div><small>LES LIENS DES TEXTES, PAS À PAS</small><h2>Comprendre la transmission.</h2><p>De gauche à droite : le sens des filiations et des successions. Les unions et les fratries restent distinctes.</p></div></div><div class="diagram-controls"><label>Parcours du schéma<select data-diagram-scope><option value="around">Autour de la figure · 2 étapes</option><option value="ancestors">Toute son ascendance du corpus</option><option value="descendants">Toute sa descendance du corpus</option><option value="all">Toutes les figures du parcours</option></select></label><label class="diagram-literary"><input type="checkbox" data-diagram-literary> Inclure les successions textuelles</label></div><div class="diagram-context" aria-live="polite"></div><div class="diagram-search-results"></div><div class="diagram-nav"><span>Glissez les barres de défilement pour parcourir le schéma.</span><div role="group" aria-label="Taille du schéma"><button type="button" data-diagram-zoom="out" aria-label="Réduire le schéma">−</button><output data-diagram-scale>90 %</output><button type="button" data-diagram-zoom="in" aria-label="Agrandir le schéma">＋</button><button type="button" data-diagram-zoom="reset">Recentrer</button></div></div><div class="diagram-viewport" tabindex="0" role="region" aria-label="Schéma des relations documentées, défilable au clavier"><div class="diagram-space"><div class="diagram-canvas"></div></div></div><details class="diagram-edge-list"><summary>Lire les relations et leurs références</summary><div></div></details><p class="diagram-caution">Une flèche décrit un lien du texte indiqué. L’espacement ne représente ni des dates, ni une durée, ni une preuve de parenté historique. Une succession textuelle peut omettre des générations.</p>`;
 const viewport=container.querySelector('.diagram-viewport'),canvas=container.querySelector('.diagram-canvas'),space=container.querySelector('.diagram-space');
 function applyScale(){
  if(!graph)return;
  canvas.style.transform=`scale(${scale})`;space.style.width=`${graph.width*scale}px`;space.style.height=`${graph.height*scale}px`;
  container.querySelector('[data-diagram-scale]').textContent=Math.round(scale*100)+' %';
 }
 function center(){
  const node=graph?.nodes.find(node=>node.id===graph.focusId);if(!node)return;
  viewport.scrollLeft=Math.max(0,(node.x+node.width/2)*scale-viewport.clientWidth/2);
  viewport.scrollTop=Math.max(0,(node.y+node.height/2)*scale-viewport.clientHeight/2);
 }
 function render({recenter=false}={}){
  if(disposed)return;
  try{graph=buildReligionDiagram(corpus,state);}catch(error){
   canvas.innerHTML='';container.querySelector('.diagram-context').textContent=error.message;container.querySelector('.diagram-context').setAttribute('role','alert');return;
  }
  container.querySelector('.diagram-context').removeAttribute('role');
  const positions=new Map(graph.nodes.map(node=>[node.id,node])),matches=new Set(state.matches);
  const related=new Set(graph.edges.filter(edge=>edge.source===state.selected||edge.target===state.selected).flatMap(edge=>[edge.source,edge.target]));
  canvas.style.width=graph.width+'px';canvas.style.height=graph.height+'px';
  canvas.innerHTML=`<svg width="${graph.width}" height="${graph.height}" aria-hidden="true"><defs><marker id="diagram-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>${graph.edges.map(edge=>`<path class="diagram-edge ${edge.kind}${edge.source===state.selected||edge.target===state.selected?' connected':''}" d="${diagramEdgePath(edge,positions)}" ${edge.kind==='parent'||edge.kind==='lineage'?'marker-end="url(#diagram-arrow)"':''}><title>${esc(positions.get(edge.source)?.name)} → ${esc(positions.get(edge.target)?.name)} · ${esc(RELATION_LABELS[edge.kind])} · ${esc(edge.reference)} · ${esc(edge.tradition)}</title></path>`).join('')}</svg>${graph.nodes.map(node=>`<button type="button" class="diagram-node${node.id===state.selected?' selected':''}${related.has(node.id)?' related':''}${matches.has(node.id)&&state.query?' match':''}" data-person="${esc(node.id)}" style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px" aria-label="Découvrir ${esc(node.name)}" aria-pressed="${node.id===state.selected}"><span>${esc(node.name)}</span><small>${esc(node.aliases||node.sources[0]?.label||'Voir les textes')}</small></button>`).join('')}`;
  const focus=positions.get(graph.focusId);
  container.querySelector('.diagram-context').innerHTML=`<strong>${esc(state.scope==='all'?'Le parcours complet':focus?.name||'Aucune figure')}</strong><span>${graph.nodes.length} figure${graph.nodes.length>1?'s':''} · ${graph.edges.length} relation${graph.edges.length>1?'s':''}${state.query?' · '+state.matches.length+' résultat'+(state.matches.length>1?'s':'')+' de recherche, contexte conservé':''}</span>`;
  const results=container.querySelector('.diagram-search-results');
  results.hidden=!state.query;
  results.innerHTML=state.query?(state.matches.length?'<p>Choisir une figure trouvée'+(state.matches.length>12?' · les 12 premiers résultats, affinez votre recherche':'')+'</p><div>'+corpus.nodes.filter(node=>matches.has(node.id)).slice(0,12).map(node=>'<button type="button" data-person="'+esc(node.id)+'">'+esc(node.name)+'</button>').join('')+'</div>':'<p>Aucune figure trouvée. Le contexte précédent est conservé ; essayez un autre nom.</p>'):'';
  container.querySelector('.diagram-edge-list>div').innerHTML=graph.edges.map(edge=>`<article><div><button type="button" data-person="${esc(edge.source)}">${esc(positions.get(edge.source)?.name)}</button><span aria-hidden="true"> ${edge.kind==='parent'||edge.kind==='lineage'?'→':'↔'} </span><button type="button" data-person="${esc(edge.target)}">${esc(positions.get(edge.target)?.name)}</button></div><p>${esc(RELATION_LABELS[edge.kind])} · ${esc(edge.reference)} · ${esc(edge.tradition)}</p></article>`).join('')||'<p>Aucun lien documenté avec ces critères. Aucun raccord n’est ajouté.</p>';
  applyScale();if(recenter)requestAnimationFrame(center);
 }
 function change(event){
  if(event.target.matches('[data-diagram-scope]'))state.scope=event.target.value;
  if(event.target.matches('[data-diagram-literary]'))state.includeLiterary=event.target.checked;
  render({recenter:true});onChange?.(state);
 }
 function click(event){
  const button=event.target.closest('[data-diagram-zoom]');if(!button)return;
  if(button.dataset.diagramZoom==='reset'){scale=.9;applyScale();center();return;}
  scale=Math.max(.55,Math.min(1.6,Math.round((scale+(button.dataset.diagramZoom==='in'?.1:-.1))*100)/100));applyScale();
 }
 container.addEventListener('change',change);container.addEventListener('click',click);
 return{
  update(next,{recenter=false}={}){const previous=state.focusId;state={...state,...next};render({recenter:recenter||previous!==state.focusId});},
  selected:()=>state.selected,
  center,
  focus(){[...canvas.querySelectorAll('[data-person]')].find(button=>button.dataset.person===graph?.focusId)?.focus({preventScroll:true});},
  destroy(){disposed=true;container.removeEventListener('change',change);container.removeEventListener('click',click);},
 };
}
