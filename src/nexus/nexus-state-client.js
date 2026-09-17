import {authClient} from '../loyalty/client.js';
import {createPurchaseRequestId} from '../economy/supabase-purchase-client.js';
async function rpc(name,args={}){const {data,error}=await authClient.rpc(name,args);if(error)throw error;return Array.isArray(data)?data[0]:data;}
export async function ensureNexusCity(originCountry='International'){return rpc('nexus_ensure_city',{p_origin_country:originCountry});}
export async function loadNexusState(){return rpc('nexus_get_state');}
export async function buyNexusBuilding({buildingCode,x,z,rotation=0,requestId=createPurchaseRequestId()}){return rpc('nexus_purchase_and_place_building',{p_building_code:buildingCode,p_x:Math.round(x),p_z:Math.round(z),p_rotation:Math.round(rotation/15)*15,p_request_id:requestId});}
export async function moveNexusBuilding({placementId,x,z,rotation=0,expectedRevision,requestId=createPurchaseRequestId()}){return rpc('nexus_move_building',{p_placement_id:placementId,p_x:Math.round(x),p_z:Math.round(z),p_rotation:Math.round(rotation/15)*15,p_expected_revision:expectedRevision,p_request_id:requestId});}
export async function upgradeNexusBuilding({placementId,requestId=createPurchaseRequestId()}){return rpc('nexus_upgrade_building',{p_placement_id:placementId,p_request_id:requestId});}
export async function removeNexusBuilding({placementId,requestId=createPurchaseRequestId()}){return rpc('nexus_remove_building',{p_placement_id:placementId,p_request_id:requestId});}
export async function displayNexusCollectible({itemInstanceId,x,z,rotation=0,expectedRevision}){const snapped=Math.round(rotation/90)*90%360;return rpc('nexus_display_collectible',{p_item_instance_id:itemInstanceId,p_x:Math.round(x),p_z:Math.round(z),p_rotation:snapped,p_expected_revision:expectedRevision});}
export async function removeNexusCollectibleDisplay({itemInstanceId,expectedRevision}){return rpc('nexus_remove_collectible_display',{p_item_instance_id:itemInstanceId,p_expected_revision:expectedRevision});}
export async function saveNexusPreferences({name,visibility,dayMode,weather,ambience,expectedRevision}){return rpc('nexus_set_city_preferences',{p_name:name,p_visibility:visibility,p_day_mode:dayMode,p_weather:weather,p_ambience:ambience,p_expected_revision:expectedRevision});}
