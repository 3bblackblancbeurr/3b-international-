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

// Each pad owns one pointer; the other thumb can keep using a different pad.
export class PointerGesture {
  constructor(){this.current=null;}
  begin(id,sample){
    if(this.current)return false;
    this.current={...sample,pointer:id};return true;
  }
  get(id){return this.current?.pointer===id?this.current:null;}
  end(id){const gesture=this.get(id);if(gesture)this.current=null;return gesture;}
  cancel(id){return this.end(id)!==null;}
}

// A tap must stay within its threshold for the whole gesture, with only one finger.
export class TapControl {
  constructor(threshold=8){this.threshold=threshold;this.reset();}
  reset(){this.pointers=new Set();this.tap=null;}
  begin(id,x,y){
    if(this.pointers.has(id))return;
    this.pointers.add(id);
    this.tap=this.pointers.size===1?{id,x,y}:null;
  }
  move(id,x,y){
    if(this.tap?.id===id&&Math.hypot(x-this.tap.x,y-this.tap.y)>this.threshold)this.tap=null;
  }
  end(id,x,y){
    this.move(id,x,y);
    const tapped=this.tap?.id===id;
    this.cancel(id);
    return tapped;
  }
  cancel(id){this.pointers.delete(id);if(this.tap?.id===id)this.tap=null;}
}
