import {distance,route,move,lineClear,clear} from './space.js';
import {POINTS} from './data.js';
export function createCompanion(position){return {position:{x:position.x+1.6,z:position.z+1},mode:'follow',target:null,path:[],repath:0,stuck:0,arrived:false,heading:Math.PI,teleported:false};}
export function commandWolf(w,player,state){
 const f=state.flags;
 if(state.zone==='france'&&f.guardian&&!f.trial&&distance(player,POINTS.seal)<10){w.mode='hold';w.target={...POINTS.seal};}
 else if(state.zone==='france'&&f.met&&!f.trace&&distance(player,POINTS.trace)<10){w.mode='search';w.target={...POINTS.trace};}
 else if(state.zone==='france'&&!f.secret&&distance(player,POINTS.secret)<(state.bond>=2?11:8)){w.mode='search';w.target={...POINTS.secret};}
 else{w.mode='follow';w.target=null;}
 w.path=[];w.repath=0;w.arrived=false;
}
export function updateWolf(w,dt,player,state,heading){
 w.teleported=false;w.repath-=dt;
 if(state.flags.trial&&w.mode==='hold'){w.mode='follow';w.target=null;}
 const follow={x:player.x-Math.sin(heading)*1.4+Math.cos(heading)*1.65,z:player.z-Math.cos(heading)*1.4-Math.sin(heading)*1.65};
 // If the preferred shoulder is inside a wall, stay near the player rather than
 // routing to the zone's spawn. Every alternative is checked against collisions.
 const alternatives=[follow,...Array.from({length:8},(_,i)=>({x:player.x+Math.sin(i*Math.PI/4)*1.3,z:player.z+Math.cos(i*Math.PI/4)*1.3})),player];
 const safeFollow=alternatives.find(p=>clear(p,state.zone,state.flags,.28)&&lineClear(player,p,state.zone,state.flags,.28))||player;
 const target=w.mode==='follow'?safeFollow:w.target;
 const remaining=distance(w.position,target);w.arrived=w.mode!=='follow'&&remaining<.65;
 if(w.arrived||w.mode==='follow'&&remaining<1)return {dx:0,dz:0,travel:0};
 if(lineClear(w.position,target,state.zone,state.flags,.28))w.path=[target];
 else if(w.repath<=0){w.path=route(w.position,target,state.zone,state.flags);w.repath=1.2;}
 while(w.path.length&&distance(w.position,w.path[0])<.4)w.path.shift();
 const recover=()=>{if(w.stuck>5&&distance(player,w.position)>10&&w.mode==='follow'&&clear(safeFollow,state.zone,state.flags,.28)){w.position={...safeFollow};w.path=[];w.repath=0;w.stuck=0;w.teleported=true;}};
 const next=w.path[0];if(!next){w.stuck+=dt;recover();return {dx:0,dz:0,travel:0};}
 const d=distance(w.position,next),speed=Math.min(6.8,Math.max(1.3,remaining*1.5)),step=Math.min(d,speed*dt),dx=(next.x-w.position.x)/d*step,dz=(next.z-w.position.z)/d*step;
 const previous={...w.position};w.position=move(w.position,dx,dz,state.zone,state.flags,.24);const travel=distance(previous,w.position);w.stuck=travel<.001?w.stuck+dt:0;
 if(travel>.001)w.heading+=Math.atan2(Math.sin(Math.atan2(dx,dz)-w.heading),Math.cos(Math.atan2(dx,dz)-w.heading))*(1-Math.exp(-dt*12));
 // A stranded follower reappears only at a checked safe place; never through a wall.
 recover();
 return {dx:w.position.x-previous.x,dz:w.position.z-previous.z,travel};
}
