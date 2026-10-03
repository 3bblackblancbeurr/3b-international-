export function mechanismFor(item){
 if(item?.type!=='hubMissionAction')return null;
 if(item.missionId==='blue_blackout'&&item.actionId?.startsWith('relay:'))return 'relay';
 if(item.missionId==='eight_signals'&&item.actionId?.startsWith('frequency:'))return 'frequency';
 return null;
}
export function switchRelay(board,index){
 if(!Array.isArray(board)||board.length!==9||!Number.isInteger(index)||index<0||index>8)return board;
 const x=index%3,y=Math.floor(index/3);
 return board.map((on,i)=>Math.abs(i%3-x)+Math.abs(Math.floor(i/3)-y)<=1?!on:on);
}
export const relayConnected=board=>Array.isArray(board)&&board.length===9&&board.every(v=>v===true);
export function initialRelay(id){
 let h=2166136261;for(const c of String(id))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 let board=Array(9).fill(true);const sequence=[];
 for(let i=0;i<5;i++){h=(Math.imul(h,1664525)+1013904223)>>>0;const cell=h%9;sequence.push(cell);board=switchRelay(board,cell);}
 if(relayConnected(board)){sequence.push(4);board=switchRelay(board,4);}
 return {board,sequence};
}
