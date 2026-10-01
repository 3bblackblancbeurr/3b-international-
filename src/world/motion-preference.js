export function worldReducedMotion(view=globalThis.window,doc=globalThis.document){
 return doc?.documentElement?.dataset?.motion==='reduced'||!!view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function watchWorldMotion(onChange,view=globalThis.window,doc=globalThis.document){
 const media=view?.matchMedia?.('(prefers-reduced-motion: reduce)'),notify=()=>onChange(worldReducedMotion(view,doc));
 const Observer=view?.MutationObserver||globalThis.MutationObserver;
 const observer=Observer&&doc?.documentElement?new Observer(notify):null;
 media?.addEventListener?.('change',notify);observer?.observe(doc.documentElement,{attributes:true,attributeFilter:['data-motion']});
 return()=>{media?.removeEventListener?.('change',notify);observer?.disconnect();};
}
