import {BufferGeometry,Mesh,ShaderMaterial,DoubleSide} from 'three';

export function cityConstructionGridVisible({constructionMode=false,tool,previewOnly=false}={}){
 return !previewOnly&&(constructionMode||['build','move','road','landscape','signal','erase'].includes(tool));
}

// A single terrain mesh draws the entire grid. World coordinates match integer placement.
// Derivatives fade fine cells at a distance instead of creating a shimmering solid sheet.
export function createCityConstructionGrid(){
 const emptyGeometry=new BufferGeometry();
 const material=new ShaderMaterial({
  transparent:true,depthWrite:false,depthTest:true,side:DoubleSide,toneMapped:false,
  uniforms:{opacity:{value:.42}},
  vertexShader:`varying vec2 mapPosition;
   void main(){vec4 world=modelMatrix*vec4(position,1.0);mapPosition=world.xz;gl_Position=projectionMatrix*viewMatrix*world;}`,
  fragmentShader:`varying vec2 mapPosition;
   uniform float opacity;
   float dottedGrid(float cell){
    vec2 p=mapPosition/cell;
    vec2 pixel=max(fwidth(p),vec2(.00001));
    vec2 distanceToLine=abs(fract(p+.5)-.5);
    vec2 line=1.0-smoothstep(pixel*.35,pixel*1.15,distanceToLine);
    // Short white dashes with empty gaps in both directions.
    vec2 phase=fract(p*4.0);
    vec2 dash=1.0-smoothstep(vec2(.42),vec2(.58),phase);
    return max(line.x*dash.y,line.y*dash.x);
   }
   void main(){
    float footprint=max(length(vec2(dFdx(mapPosition.x),dFdy(mapPosition.x))),length(vec2(dFdx(mapPosition.y),dFdy(mapPosition.y))));
    float fine=1.0-smoothstep(.08,.22,footprint);
    float medium=1.0-smoothstep(.4,1.1,footprint);
    float wide=1.0-smoothstep(1.6,4.4,footprint);
    float distant=1.0-smoothstep(8.0,22.0,footprint);
    float ink=max(max(dottedGrid(1.0)*fine,dottedGrid(5.0)*medium*(1.0-fine)),max(dottedGrid(20.0)*wide*(1.0-medium),dottedGrid(100.0)*distant*(1.0-wide)));
    float alpha=ink*opacity;if(alpha<.015)discard;
    gl_FragColor=vec4(vec3(1.0),alpha);
   }`,
 });
 const mesh=new Mesh(emptyGeometry,material);mesh.name='city-construction-grid';mesh.position.y=.12;mesh.visible=false;
 // The terrain owns its geometry. The grid shares it, so rebuilds allocate no extra terrain.
 mesh.raycast=()=>{};
 return {mesh,setTerrain(geometry){mesh.geometry=geometry;},setMode(props){mesh.visible=cityConstructionGridVisible(props);},dispose(){mesh.removeFromParent();emptyGeometry.dispose();material.dispose();}};
}
