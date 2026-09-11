import test from 'node:test';
import assert from 'node:assert/strict';
import {MAZE_HERO_FRAMES} from '../src/games/maze-hero-frames.js';
import {mazeHeroFrame,drawMazeHero,MAZE_WALK_FRAMES} from '../src/games/maze-hero.js';

test('all facing and gait frames stay within the artwork and preserve a stable head anchor',()=>{
 for(let direction=0;direction<8;direction++)for(let frame=0;frame<=MAZE_WALK_FRAMES;frame++){
  const f=mazeHeroFrame(direction,frame),[x,y,w,h]=f.rect;
  assert.ok(x>=0&&y>=0&&x+w<=MAZE_HERO_FRAMES.width&&y+h<=MAZE_HERO_FRAMES.height);
  assert.ok(f.headX>=x&&f.headX<=x+w&&f.top>=y&&f.top<=y+h);
  const calls=[],c={save(){},restore(){},translate(...v){calls.push(['translate',...v]);},scale(...v){calls.push(['scale',...v]);},drawImage(...v){calls.push(['draw',...v]);}};
  drawMazeHero(c,{}, {direction,frame},250,190);
  const draw=calls.find(v=>v[0]==='draw'),s=draw[8]/w;
  assert.ok(Math.abs((f.headX-x)*s+draw[6])<1e-7,'head centred on the world anchor');
  assert.ok(Math.abs((f.top-y)*s+draw[7]+88)<1e-7,'stable head height');
  assert.equal(calls.some(v=>v[0]==='scale'&&v[1]===-1),direction>4);
 }
});

test('front and back have their own art, while side pairs use consistent mirrored walking poses',()=>{
 assert.notDeepEqual(mazeHeroFrame(0,0).rect,mazeHeroFrame(4,0).rect);
 for(const [right,left]of [[1,7],[2,6],[3,5]])for(let frame=0;frame<=MAZE_WALK_FRAMES;frame++){
  assert.deepEqual(mazeHeroFrame(right,frame).rect,mazeHeroFrame(left,frame).rect);
  assert.equal(mazeHeroFrame(right,frame).flip,false);assert.equal(mazeHeroFrame(left,frame).flip,true);
 }
 assert.equal(new Set(MAZE_HERO_FRAMES.rows[2].frames.map(f=>f.rect.join(':'))).size,7);
});
