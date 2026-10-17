export const CHAT_LIMITS=Object.freeze({memberDailyLimit:20,sharedDailyLimit:100,windowSeconds:86400});
const PROVIDERS=['gpt','claude','gemini'];

// Presence is configuration readiness, never a successful call to a provider.
// Keep the public/private copy identical: each Edge Function deploys independently.
export function aiCapabilities(env){
 const enabled=env('AI_ENABLED')==='true';
 const caps={
  image:enabled&&!!env('OPENAI_API_KEY')&&!!env('OPENAI_IMAGE_MODEL'),
  gpt:enabled&&!!env('OPENAI_API_KEY')&&!!env('OPENAI_CHAT_MODEL'),
  claude:enabled&&!!env('ANTHROPIC_API_KEY')&&!!env('ANTHROPIC_CHAT_MODEL'),
  gemini:enabled&&!!env('GEMINI_API_KEY')&&!!env('GEMINI_CHAT_MODEL')
 };
 const providers=PROVIDERS.filter(name=>caps[name]);
 return{...caps,albert:{configured:providers.length>0,providers,reason:!enabled?'disabled':providers.length?'configured':'provider_missing',mode:'generalist',history:true,tools:false,voice:'browser-text',limits:{...CHAT_LIMITS}}};
}
