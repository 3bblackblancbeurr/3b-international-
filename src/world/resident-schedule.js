// Route distances are measured on the same curved streets used by navigation.
export function residentSchedule(route,time,kind='traveler'){
 const stop=kind==='artisan'?8:kind==='elder'?10:5,speed=route.speed,total=route.total;
 if(!total)return{position:route.points[0],moving:false,activity:kind==='artisan'?'Work':'Talk'};
 const leg=total/speed,cycle=(time+route.offset)%(leg*2+stop*2),out=cycle<leg,rest=cycle>=leg&&cycle<leg+stop||cycle>=leg*2+stop;
 let along=out?cycle*speed:cycle<leg+stop?total:cycle<leg*2+stop?total-(cycle-leg-stop)*speed:0,index=0;
 while(along>route.lengths[index]&&index<route.lengths.length-1)along-=route.lengths[index++];
 const t=along/Math.max(.001,route.lengths[index]),a=route.points[index],b=route.points[index+1];
 return{position:{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},moving:!rest,activity:rest?(kind==='artisan'?'Work':'Talk'):null};
}
