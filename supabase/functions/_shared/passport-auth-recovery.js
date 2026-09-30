// Official Auth admin passkey endpoints, called only after backup-key possession is proven.
// No JWT is issued here. Historical activation makes every revocation error fatal.
export async function revokeAuthPasskeys({request,userId,required=false}) {
 const path='/auth/v1/admin/users/'+userId+'/passkeys';
 const first=await request(path);
 if(!first.ok) {
   if(!required&&first.status===404)return {supported:false,revoked:0};
   throw Error('auth_passkey_revocation_failed');
 }
 const rows=first.data;
 if(!Array.isArray(rows)||rows.length>100||rows.some(key=>!key||typeof key.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key.id)))throw Error('auth_passkey_revocation_failed');
 for(const key of rows) {
   const response=await request(path+'/'+key.id,'DELETE');
   if(!response.ok)throw Error('auth_passkey_revocation_failed');
 }
 const check=await request(path);
 if(!check.ok||!Array.isArray(check.data)||check.data.length!==0)throw Error('auth_passkey_revocation_failed');
 return {supported:true,revoked:rows.length};
}
