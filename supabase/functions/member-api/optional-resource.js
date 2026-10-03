// Optional resources must not block identity, nor turn an outage into an empty inventory.
export async function readOptionalRows(load){
 try{
  const rows=await load();
  return Array.isArray(rows)?rows:null;
 }catch{return null;}
}
