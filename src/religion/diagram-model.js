export const RELATION_LABELS=Object.freeze({
 parent:'Filiation selon le texte',
 lineage:'Succession textuelle · générations parfois omises',
 union:'Union selon le récit',
 sibling:'Fratrie selon le texte',
});
export const normalizeFigure=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export function filterReligionFigures(corpus,{branch='all',query=''}={}){
 const origins=new Set(corpus.nodes.slice(0,25).map(node=>node.id));
 const needle=normalizeFigure(query).trim();
 return corpus.nodes.filter(node=>(
  branch==='all'||
  branch==='origins'&&origins.has(node.id)||
  branch==='family'&&(node.group==='biblical'&&!origins.has(node.id)||node.id==='abraham')||
  branch==='matthew'&&(node.group==='matthew'||['juda','marie','jesus'].includes(node.id))||
  branch==='quran'&&node.sources.some(source=>source.url.startsWith('https://quran.com/'))
 )&&(!needle||normalizeFigure(`${node.name} ${node.aliases||''}`).includes(needle)));
}

/** Documentary graph only: sculpture positions never determine a relationship. */
export function buildReligionDiagram(corpus,{eligibleIds,focusId='abraham',scope='around',includeLiterary=false}={}){
 const eligible=new Set(eligibleIds||corpus.nodes.map(node=>node.id));
 const pool=corpus.nodes.filter(node=>eligible.has(node.id));
 const focus=eligible.has(focusId)?focusId:pool[0]?.id||null;
 const permitted=corpus.edges.filter(edge=>eligible.has(edge.source)&&eligible.has(edge.target)&&RELATION_LABELS[edge.kind]&&(includeLiterary||edge.kind!=='lineage'));
 const selected=new Set(scope==='all'?pool.map(node=>node.id):focus?[focus]:[]);
 if(scope!=='all'&&focus){
  let frontier=[focus];
  const depthLimit=scope==='around'?2:pool.length;
  for(let depth=0;frontier.length&&depth<depthLimit;depth++){
   const next=[];
   for(const id of frontier){
    for(const edge of permitted){
     const directed=edge.kind==='parent'||edge.kind==='lineage';
     let target=null;
     if(scope==='ancestors'&&directed&&edge.target===id)target=edge.source;
     if(scope==='descendants'&&directed&&edge.source===id)target=edge.target;
     if(scope==='around'&&(directed||depth===0)){
      if(edge.source===id)target=edge.target;
      if(edge.target===id)target=edge.source;
     }
     if(target&&!selected.has(target)){selected.add(target);next.push(target);}
    }
   }
   frontier=next;
  }
 }
 const nodes=pool.filter(node=>selected.has(node.id));
 const edges=permitted.filter(edge=>selected.has(edge.source)&&selected.has(edge.target));
 const directed=edges.filter(edge=>edge.kind==='parent'||edge.kind==='lineage');
 const ranks=new Map(nodes.map(node=>[node.id,0]));
 const indegree=new Map(nodes.map(node=>[node.id,0]));
 for(const edge of directed)indegree.set(edge.target,indegree.get(edge.target)+1);
 const queue=nodes.filter(node=>indegree.get(node.id)===0).map(node=>node.id);
 let visited=0;
 for(let index=0;index<queue.length;index++){
  const id=queue[index];visited++;
  for(const edge of directed.filter(edge=>edge.source===id)){
   ranks.set(edge.target,Math.max(ranks.get(edge.target),ranks.get(id)+1));
   indegree.set(edge.target,indegree.get(edge.target)-1);
   if(indegree.get(edge.target)===0)queue.push(edge.target);
  }
 }
 // Reject a malformed future corpus instead of manufacturing a plausible lineage.
 if(visited!==nodes.length)throw new Error('Le corpus contient une boucle de filiation. Le schéma ne peut pas être établi.');
 const columns=[];
 for(const node of nodes){const rank=ranks.get(node.id);(columns[rank]??=[]).push(node);}
 // A deterministic barycentric pass reduces crossed links without altering any edge.
 const order=new Map();
 columns.forEach(column=>column.forEach((node,index)=>order.set(node.id,index)));
 for(let pass=0;pass<3;pass++){
  columns.forEach(column=>{
   const score=node=>{const parents=directed.filter(edge=>edge.target===node.id).map(edge=>order.get(edge.source));return parents.length?parents.reduce((sum,value)=>sum+value,0)/parents.length:order.get(node.id);};
   column.sort((a,b)=>score(a)-score(b));column.forEach((node,index)=>order.set(node.id,index));
  });
 }
 const maxRows=Math.max(1,...columns.map(column=>column.length));
 const width=Math.max(440,columns.length*242+64),height=Math.max(300,maxRows*104+100);
 const layout=columns.flatMap((column,rank)=>column.map((node,row)=>({
  ...node,x:32+rank*242,y:50+(height-100-column.length*104)/2+row*104,width:202,height:78,rank,
 })));
 return{nodes:layout,edges,width,height,focusId:focus,scope,includeLiterary};
}

export function diagramEdgePath(edge,positions){
 const source=positions.get(edge.source),target=positions.get(edge.target);
 if(!source||!target)return'';
 const sameColumn=source.x===target.x;
 const sx=source.x+source.width,sy=source.y+source.height/2;
 const tx=sameColumn?target.x+target.width:target.x,ty=target.y+target.height/2;
 const bend=sameColumn?48:Math.max(24,(tx-sx)*.5);
 return`M ${sx} ${sy} C ${sx+bend} ${sy}, ${sameColumn?tx+bend:tx-bend} ${ty}, ${tx} ${ty}`;
}
