import React,{useState} from 'react';
import WeaponEmblem from './WeaponEmblem.jsx';

/** Still renders of the same equipped models; no extra WebGL contexts in the grid. */
export default function WeaponTile({weapon}){
 const [failed,setFailed]=useState(false);
 return <span className="weapon-tile" aria-hidden="true">{failed?<WeaponEmblem weapon={weapon}/>:<img src={'/world/weapon-studio/'+weapon.id+'.jpg'} alt="" width="360" height="240" loading="lazy" decoding="async" onError={()=>setFailed(true)}/>}</span>;
}
