import {READ_STORAGE_KEY,normalizeReadMode,safeParseStorage,safeWriteStorage} from './model.js';

export function applyReadMode(value,root=typeof document!=='undefined'?document.documentElement:null){
 const mode=normalizeReadMode(value);
 if(root){
  root.dataset.threebLargeText=mode.large?'true':'false';
  root.dataset.threebHighContrast=mode.contrast?'true':'false';
  root.dataset.threebCalmMotion=mode.calm?'true':'false';
 }
 return mode;
}
export function readReadMode(storage=typeof localStorage!=='undefined'?localStorage:null){
 return storage?safeParseStorage(storage,READ_STORAGE_KEY,normalizeReadMode):normalizeReadMode(null);
}
export function saveReadMode(value,storage=typeof localStorage!=='undefined'?localStorage:null){
 const mode=applyReadMode(value);
 return storage?safeWriteStorage(storage,READ_STORAGE_KEY,mode):false;
}
export function restoreReadMode(){
 return applyReadMode(readReadMode());
}
