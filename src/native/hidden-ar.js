import {Capacitor,registerPlugin} from '@capacitor/core';
const HiddenWorldAR=registerPlugin('HiddenWorldAR');
export const isNativeHiddenAR=()=>Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android';
export async function hiddenARCapabilities(){
 if(!isNativeHiddenAR())return {platform:'web',available:false,reason:'native-app-required'};
 try{return {...await HiddenWorldAR.getCapabilities(),platform:'android'};}
 catch{return {platform:'android',available:false,reason:'update-required'};}
}
export async function openHiddenAR(){
 if(!isNativeHiddenAR())throw Error('Le portail spatial nécessite la version Android de 3B.');
 return HiddenWorldAR.openPortal({sceneId:'portal-lab'});
}
