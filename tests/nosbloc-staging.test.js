import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { normalizeMemberHandle, normalizeProjectPayload, reviewPreview, validateProjectPayload } from "../src/nosbloc/staging-contract.js";

const read = rel => readFileSync(new URL(rel, import.meta.url), "utf8");
const client=read("../src/nosbloc/staging-client.js");
const loyaltyClient=read("../src/loyalty/client.js");
const loyaltyContext=read("../src/loyalty/LoyaltyContext.jsx");
const panel=read("../src/nosbloc/NosblocServerPanel.jsx");
const edge=read("../supabase/functions/nosbloc-staging/index.ts");
const baseSql=read("../supabase/staging/20260926030000_nosbloc_server_staging_v1.sql");
const prerequisiteSql=read("../supabase/staging/20260926031000_nosbloc_staging_prerequisites.sql");
const apiSql=read("../supabase/staging/20260926032000_nosbloc_staging_authenticated_api.sql");
const hardeningSql=read("../supabase/staging/20260926033000_nosbloc_staging_advisor_hardening.sql");
const indexSql=read("../supabase/staging/20260926034000_nosbloc_staging_fk_indexes.sql");
const stagingManifest=JSON.parse(read("../supabase/staging/DEPLOYED_NOSBLOC_STAGING.json"));
const productionManifest=JSON.parse(read("../supabase/functions/DEPLOYED_FUNCTIONS_SNAPSHOT.json"));

test("staging client is pinned to the isolated project and sends the real session JWT",()=>{
 assert.match(client,/zykdfgahzqqanlyxjtbe/);
 assert.match(client,/NOSBLOC_STAGING_ENV_MISMATCH/);
 assert.match(client,/Authorization: `Bearer \$\{session\.access_token\}`/);
 assert.doesNotMatch(client,/SERVICE_ROLE/);
 assert.match(loyaltyClient,/VITE_SUPABASE_URL/);
 assert.match(loyaltyClient,/VITE_SUPABASE_PUBLISHABLE_KEY/);
 assert.match(loyaltyClient,/3b_nosbloc_staging_auth_v1/);
});

test("staging Passport uses isolated Auth metadata without calling production member APIs",()=>{
 assert.match(loyaltyContext,/function stagingProfile/);
 assert.match(loyaltyContext,/NOSBLOC_STAGING_APP/);
 assert.match(loyaltyContext,/if\(NOSBLOC_STAGING_APP\)/);
 assert.match(panel,/authClient\.auth\.signUp/);
 assert.match(panel,/authClient\.auth\.signInWithPassword/);
 assert.match(panel,/PASSEPORT DE TEST ISOLÉ/);
});

test("project contract normalizes payloads and requires exact 100 percent",()=>{
 const p=normalizeProjectPayload({id:"p-123",title:"Ville Test",type:"world",template:"Ville",description:"Une description suffisamment longue pour valider le contrat de synchronisation staging.",safety:{moderation:true},rights:{contentOwned:true,thirdPartyLicensed:true,audienceReviewed:true},splits:[{id:"owner",name:"Zakaria",role:"Direction",shareBps:10000,status:"owner"}]});
 assert.equal(validateProjectPayload(p).valid,true);
 assert.equal(reviewPreview(p).agreementsAccepted,true);
 assert.equal(normalizeMemberHandle("Zakaria_3B"),"zakaria_3b");
});

test("review preview blocks unaccepted collaborators",()=>{
 const p={id:"p-456",title:"Projet équipe",type:"game",template:"Course",description:"Une expérience mobile complète avec contrôles, équipe et modération avant diffusion.",safety:{moderation:true},rights:{contentOwned:true,thirdPartyLicensed:true,audienceReviewed:true},splits:[{id:"o",name:"O",role:"Direction",shareBps:5000,status:"owner"},{id:"m",name:"M",role:"3D",shareBps:5000,status:"invited"}]};
 assert.equal(reviewPreview(p).ready,false);
 p.splits[1].status="accepted";
 assert.equal(reviewPreview(p).ready,true);
});

test("Edge function is exact-project pinned, JWT-only and has no privileged browser key",()=>{
 assert.match(edge,/STAGING_PROJECT_REF = "zykdfgahzqqanlyxjtbe"/);
 assert.match(edge,/nosbloc_stg_snapshot_api/);
 assert.match(edge,/nosbloc_stg_sync_project_api/);
 assert.match(edge,/nosbloc_stg_invite_api/);
 assert.match(edge,/nosbloc_stg_moderate_api/);
 assert.doesNotMatch(edge,/SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE/);
 assert.doesNotMatch(edge,/"publish"|"payout"|"payment"|"discover"/);
});

test("staging prerequisites create Passport profiles only inside the isolated Auth project",()=>{
 assert.match(prerequisiteSql,/references auth\.users/);
 assert.match(prerequisiteSql,/nosbloc_stg_auth_profile/);
 assert.match(prerequisiteSql,/raw_user_meta_data/);
 assert.match(prerequisiteSql,/loyalty_rate/);
 assert.match(prerequisiteSql,/loyalty_session_valid/);
});

test("staging schema keeps public features locked and versions immutable",()=>{
 assert.match(baseSql,/references public\.member_profiles/);
 assert.match(baseSql,/discover_enabled boolean not null default false/);
 assert.match(baseSql,/payments_enabled boolean not null default false/);
 assert.match(baseSql,/payouts_enabled boolean not null default false/);
 assert.match(baseSql,/visibility text not null default 'private' check\(visibility='private'\)/);
 assert.match(baseSql,/nosbloc_stg_versions_immutable/);
 assert.match(baseSql,/nosbloc_stg_audit_immutable/);
 assert.match(baseSql,/invited_user_id=p_user/);
 assert.match(baseSql,/membership_status not in\('owner','accepted'\)/);
});

test("authenticated API derives identity from auth.uid and denies direct table access",()=>{
 assert.match(apiSql,/auth\.uid\(\)/);
 assert.match(apiSql,/security definer/gi);
 assert.match(apiSql,/private\.nosbloc_stg_current_user/);
 assert.match(apiSql,/grant execute .* to authenticated/gi);
 assert.match(hardeningSql,/as restrictive for all to authenticated using \(false\)/);
 assert.match(hardeningSql,/set search_path/);
});

test("human moderation stays private and indexed for future volume",()=>{
 assert.match(baseSql,/public_badge_key='director_founder'/);
 assert.match(baseSql,/status=p_decision,visibility='private',publication_locked=true,discover_locked=true,monetization_locked=true/);
 assert.match(indexSql,/nosbloc_stg_invited_user_idx/);
 assert.match(indexSql,/nosbloc_stg_moderation_project_idx/);
 assert.match(indexSql,/nosbloc_stg_projects_review_version_idx/);
});

test("deployment manifest records staging while production manifest stays unchanged",()=>{
 assert.equal(stagingManifest.project_ref,"zykdfgahzqqanlyxjtbe");
 assert.equal(stagingManifest.production_project_ref,"ttvhcezucsbbmnafrotq");
 assert.equal(stagingManifest.production_modified,false);
 assert.equal(stagingManifest.edge_function.slug,"nosbloc-staging");
 assert.equal(stagingManifest.edge_function.verify_jwt,true);
 assert.deepEqual(stagingManifest.locks,{publication:true,discover:true,payments:true,payouts:true});
 assert.equal(productionManifest.functions.some(row=>row.slug==="nosbloc-staging"),false);
 assert.equal(existsSync(new URL("../supabase/migrations/20260926030000_nosbloc_server_staging_v1.sql",import.meta.url)),false);
});
