import {createGuardianHandler} from './handler.js';
import {INVISIBLE_EPISODE,getInvisibleEpisode,INVISIBLE_REALMS,INVISIBLE_EPISODES} from '../../../src/world/invisible/catalog.js';
import {normalizeInvisibleState,invisibleEpisodeProgress} from '../../../src/world/invisible/progression.js';
import {GUARDIAN_STORIES} from '../../../src/world/story-canon.js';

// prepare-invisible-guardian.mjs embeds the same canonical story files used by the world reducer.
Deno.serve(createGuardianHandler({
 base:Deno.env.get('SUPABASE_URL')!,serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
 anonKey:Deno.env.get('SUPABASE_ANON_KEY')!,env:(name:string)=>Deno.env.get(name)||'',
 episode:INVISIBLE_EPISODE,normalizeState:normalizeInvisibleState,getEpisode:getInvisibleEpisode,
 progressFor:invisibleEpisodeProgress,guardianPersonas:GUARDIAN_STORIES,realms:INVISIBLE_REALMS,episodes:INVISIBLE_EPISODES,
}));
