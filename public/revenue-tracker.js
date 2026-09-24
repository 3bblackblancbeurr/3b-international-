(()=>{
  const KEY="revenue_session_v1";
  let id=localStorage.getItem(KEY);
  if(!/^[0-9a-f-]{36}$/i.test(id||"")){
    id=crypto.randomUUID();
    localStorage.setItem(KEY,id);
  }
  const params=new URLSearchParams(location.search);
  const channel=(params.get("utm_source")||params.get("ref")||"direct").toLowerCase().replace(/[^a-z0-9._-]/g,"").slice(0,64)||"direct";
  async function track(event,metadata={}){
    try{
      await fetch("/api/revenue-event",{
        method:"POST",
        keepalive:true,
        headers:{"content-type":"application/json"},
        body:JSON.stringify({event,sessionId:id,page:location.pathname,channel,metadata}),
      });
    }catch{}
  }
  window.RevenueTracker={track};
})();
