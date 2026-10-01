// The official SDK owns the WebAuthn ceremony, token issuance, persistence and SIGNED_IN event.
// This module never creates or installs a session or a JWT itself.
export function createPasskeyLogin({auth,readiness,supported,enabled=false}) {
 const unwrap=result=>{if(result.error)throw Error(result.error.code==='passkey_disabled'?'La connexion par clé d’accès n’est pas encore activée.':result.error.message||'La clé n’a pas pu être vérifiée.');return result.data;};
 const ready=async()=>{if(!enabled||!supported())throw Error('La connexion par clé d’accès est en préparation sur cet appareil.');const status=await readiness();if(!status.enabled||status.mode!=='supabase_auth_passkey')throw Error('La connexion par clé d’accès attend sa validation sur le service hébergé.');return status;};
 const owner=async expected=>{const session=unwrap(await auth.getSession())?.session;if(!expected||session?.user?.id!==expected)throw Error('La session a changé. Reconnecte-toi.');return session;};
 return {
   readiness:async()=>enabled&&supported()?readiness():{enabled:false,mode:'supabase_auth_passkey'},
   async signIn({captchaToken='',signal}={}) {
     await ready();if(signal?.aborted)throw Error('Connexion annulée.');
     if(unwrap(await auth.getSession())?.session)throw Error('Déconnecte le compte ouvert avant de choisir une autre clé.');
     const data=unwrap(await auth.signInWithPasskey({options:{captchaToken,signal}}));
     if(!data?.user?.id||!data.session?.access_token||data.session.user?.id!==data.user.id)throw Error('La connexion n’a pas abouti.');
     return data; // Already persisted by the SDK; no setSession fallback.
   },
   async list(expected) {await owner(expected);const keys=unwrap(await auth.passkey.list());await owner(expected);if(!Array.isArray(keys))throw Error('Lecture des clés indisponible.');return keys;},
   async register(expected,{signal}={}) {
     await owner(expected);await ready();if(signal?.aborted)throw Error('Ajout annulé.');
     const data=unwrap(await auth.registerPasskey({options:{signal}}));await owner(expected);
     if(!data?.id)throw Error('L’ajout de la clé n’a pas abouti.');return data;
   },
   async revoke(expected,passkeyId) {
     await owner(expected);if(!/^[0-9a-f-]{36}$/i.test(passkeyId))throw Error('Clé invalide.');
     unwrap(await auth.passkey.delete({passkeyId}));await owner(expected);
     const keys=unwrap(await auth.passkey.list());await owner(expected);
     if(!Array.isArray(keys)||keys.some(key=>key.id===passkeyId))throw Error('La révocation n’a pas été confirmée.');return true;
   }
 };
}
