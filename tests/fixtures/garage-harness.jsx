import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import VehicleLabPreview from '../../src/games/underground/VehicleLabPreview.jsx';
import {createFranceVerticalSliceVehicle} from '../../src/games/underground/FranceVerticalSliceV1.js';
import '../../src/games/underground/underground.css';
const vehicle=createFranceVerticalSliceVehicle();
function Harness(){const[instance,setInstance]=useState(0);return <div className="u3b-shell"><button id="test-remount" onClick={()=>setInstance(n=>n+1)}>Remonter pour test</button><main className="u3b-page"><VehicleLabPreview key={instance} vehicle={vehicle}/></main></div>;}
createRoot(document.getElementById('root')).render(<React.StrictMode><Harness/></React.StrictMode>);
