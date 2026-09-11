import {MAZE_HERO_FRAMES} from './maze-hero-frames.js';

export const MAZE_HERO_ASSET='kais-explorer.webp';
export const MAZE_WALK_FRAMES=6;
const VIEWS=[0,1,2,3,4,3,2,1];

export function mazeHeroFrame(direction,frame){
 const facing=((Math.round(direction)%8)+8)%8,row=MAZE_HERO_FRAMES.rows[VIEWS[facing]];
 return {...row.frames[Math.max(0,Math.min(MAZE_WALK_FRAMES,Math.floor(frame)))],height:row.height,flip:facing>4};
}

export function drawMazeHero(c,image,pose,x,y){
 const f=mazeHeroFrame(pose.direction,pose.frame),[sx,sy,sw,sh]=f.rect,scale=88/f.height;
 c.save();c.translate(x,y);if(f.flip)c.scale(-1,1);
 c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 // A stable head/torso anchor keeps the body steady while the drawn feet and arms move.
 c.drawImage(image,sx,sy,sw,sh,(sx-f.headX)*scale,(sy-f.top-f.height)*scale,sw*scale,sh*scale);
 c.restore();
}
