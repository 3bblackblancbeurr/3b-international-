const HALF_PI=Math.PI/2;

export const DICE_FACE_LAYOUT=Object.freeze([
  Object.freeze({value:1,position:Object.freeze([0,0,.806]),planeRotation:Object.freeze([0,0,0]),normal:Object.freeze([0,0,1]),targetRotation:Object.freeze([0,0,0])}),
  Object.freeze({value:2,position:Object.freeze([.806,0,0]),planeRotation:Object.freeze([0,HALF_PI,0]),normal:Object.freeze([1,0,0]),targetRotation:Object.freeze([0,-HALF_PI,0])}),
  Object.freeze({value:3,position:Object.freeze([0,0,-.806]),planeRotation:Object.freeze([0,Math.PI,0]),normal:Object.freeze([0,0,-1]),targetRotation:Object.freeze([0,Math.PI,0])}),
  Object.freeze({value:4,position:Object.freeze([-.806,0,0]),planeRotation:Object.freeze([0,-HALF_PI,0]),normal:Object.freeze([-1,0,0]),targetRotation:Object.freeze([0,HALF_PI,0])}),
  Object.freeze({value:5,position:Object.freeze([0,.806,0]),planeRotation:Object.freeze([-HALF_PI,0,0]),normal:Object.freeze([0,1,0]),targetRotation:Object.freeze([HALF_PI,0,0])}),
  Object.freeze({value:6,position:Object.freeze([0,-.806,0]),planeRotation:Object.freeze([HALF_PI,0,0]),normal:Object.freeze([0,-1,0]),targetRotation:Object.freeze([-HALF_PI,0,0])}),
]);

export function normalizeDiceValue(value){
  const numeric=Number(value);
  return Number.isInteger(numeric)&&numeric>=1&&numeric<=6?numeric:1;
}

export function diceFaceLayout(value){
  return DICE_FACE_LAYOUT[normalizeDiceValue(value)-1];
}
