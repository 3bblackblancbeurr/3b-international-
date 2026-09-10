// A floating stick uses screen pixels, so the same gesture works at any canvas scale.
export class DragControl {
  constructor(){this.cancel();}
  begin(id,x,y){
    if(this.pointerId!==null)return false;
    this.pointerId=id;this.origin={x,y};this.point={x,y};
    return true;
  }
  move(id,x,y){
    if(id!==this.pointerId)return false;
    let dx=x-this.origin.x,dy=y-this.origin.y;
    const length=Math.hypot(dx,dy),radius=48;
    // Follow long drags so reversing direction never requires crossing the screen again.
    if(length>radius){this.origin={x:x-dx/length*radius,y:y-dy/length*radius};dx=x-this.origin.x;dy=y-this.origin.y;}
    this.point={x,y};
    const distance=Math.hypot(dx,dy),strength=Math.max(0,(distance-6)/(radius-6));
    this.input=distance?{x:dx/distance*strength,y:dy/distance*strength}:{x:0,y:0};
    return true;
  }
  end(id){if(id!==this.pointerId)return false;this.cancel();return true;}
  cancel(){this.pointerId=null;this.origin=null;this.point=null;this.input={x:0,y:0};}
  visual(){return this.origin?{x:this.origin.x,y:this.origin.y,dx:this.point.x-this.origin.x,dy:this.point.y-this.origin.y}:null;}
}
