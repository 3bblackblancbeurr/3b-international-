import {createPwaQuickKitCommerce} from '../server/pwa-quickkit-commerce.js';

const ACTIONS=new Set(['activate','checkout','status','webhook']);

function jsonError(message,status=400){
 return Response.json({error:message},{
  status,
  headers:{
   'cache-control':'no-store',
   'content-security-policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
   'cross-origin-resource-policy':'same-origin',
   'referrer-policy':'no-referrer',
   'x-content-type-options':'nosniff',
   'x-frame-options':'DENY',
  },
 });
}

export async function handlePwaQuickKitRoute(request,{commerce}={}){
 const url=new URL(request.url);
 const action=url.searchParams.get('action')||'';
 const extra=[...url.searchParams.keys()].filter(key=>key!=='action');
 if(extra.length)return jsonError('Paramètre non autorisé.');
 if(!ACTIONS.has(action))return jsonError('Route introuvable.',404);
 const api=commerce||createPwaQuickKitCommerce();
 return api[action](request);
}

export default {fetch:request=>handlePwaQuickKitRoute(request)};
