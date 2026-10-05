const AUTH_INTENT_KEY = '3b-auth-intent';

export function resolveInitialAuthState(search = '', intent = '', hash = '') {
 const params = new URLSearchParams(typeof search === 'string' ? search : '');
 const fragment = new URLSearchParams(typeof hash === 'string' ? hash.replace(/^#/, '') : '');
 const callbackError = [params, fragment].some(values =>
  ['error', 'error_code', 'error_description'].some(key => values.has(key))
 );
 if (callbackError) {
  return {
   mode: params.get('reset') === '1' ? 'reset-password' : 'login',
   notice: '',
   error: 'Ce lien n’a pas pu être validé. Demande un nouveau message ou reconnecte-toi.'
  };
 }
 if (params.get('reset') === '1') return {mode: 'reset-password', notice: ''};
 if (params.get('auth') === 'confirmed') {
  return {
   mode: 'login',
   notice: 'Adresse e-mail confirmée. Connecte-toi avec ton e-mail et ton mot de passe.'
  };
 }
 return {mode: intent === 'register' ? 'register' : 'login', notice: ''};
}

export function readInitialAuthState(browser = globalThis.window) {
 let search = '', hash = '', intent = '';
 try { search = browser?.location?.search || ''; } catch {}
 try { hash = browser?.location?.hash || ''; } catch {}
 try { intent = browser?.sessionStorage?.getItem(AUTH_INTENT_KEY) || ''; } catch {}
 return resolveInitialAuthState(search, intent, hash);
}

export function rememberAuthMode(mode, browser = globalThis.window) {
 try {
  const storage = browser?.sessionStorage;
  if (mode === 'register') storage?.setItem(AUTH_INTENT_KEY, 'register');
  else storage?.removeItem(AUTH_INTENT_KEY);
 } catch {}
}

export function registrationCompletedState(email, connected = false) {
 return {
  mode: 'login',
  notice: connected === true
   ? 'Compte créé et connecté.'
   : 'Compte créé. Vérifie ton e-mail, puis connecte-toi ici.',
  fields: {
   identifier: typeof email === 'string' ? email.trim().toLowerCase() : '',
   password: '',
   passwordConfirm: ''
  }
 };
}
