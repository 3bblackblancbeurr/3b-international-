import test from 'node:test';
import assert from 'node:assert/strict';
import {DragControl,PointerGesture,TapControl} from '../src/games/touchControls.js';
import {Arena} from '../src/games/arena.js';
import {Refuge} from '../src/games/refuge.js';
import {Maze} from '../src/games/maze.js';

test('a drag anywhere moves Kaïs; releasing immediately stops both action games',()=>{
  for(const Game of [Arena,Refuge])for(const origin of [[30,80],[300,700],[850,300]]){
    const control=new DragControl(),game=new Game(),start=game.player.x;
    control.begin(1,...origin);control.move(1,origin[0]+48,origin[1]);
    game.update(.04,control.input);assert.ok(game.player.x>start);
    control.end(1);const stopped=game.player.x;game.update(.04,control.input);
    assert.equal(game.player.x,stopped);
  }
});
test('touch jitter does not move, and diagonals never exceed running speed',()=>{
  const control=new DragControl();control.begin(0,100,100);control.move(0,104,103);
  assert.deepEqual(control.input,{x:0,y:0});
  control.move(0,900,900);assert.ok(Math.abs(Math.hypot(control.input.x,control.input.y)-1)<1e-10);
  control.move(0,872,872);assert.ok(control.input.x===0||control.input.x>0);
  control.move(0,850,850);assert.ok(control.input.x<0&&control.input.y<0);
});
test('a second finger cannot steal or release the movement gesture',()=>{
  const control=new DragControl();control.begin(10,200,200);control.move(10,248,200);
  assert.equal(control.begin(11,50,50),false);assert.equal(control.move(11,10,10),false);
  assert.equal(control.end(11),false);assert.deepEqual(control.input,{x:1,y:0});
  control.end(10);assert.deepEqual(control.input,{x:0,y:0});assert.equal(control.visual(),null);
});
test('pause/cancellation clears a held direction and requires a new gesture',()=>{
  const control=new DragControl();control.begin(1,100,100);control.move(1,100,150);control.cancel();
  assert.equal(control.move(1,150,150),false);assert.deepEqual(control.input,{x:0,y:0});
  assert.equal(control.begin(2,300,400),true);assert.deepEqual(control.input,{x:0,y:0});
});
test('dragging follows maze corridors without crossing walls',()=>{
  const game=new Maze(42),control=new DragControl();
  const start={...game.cell},direction=game.grid[start.y][start.x+1]===0?{x:1,y:0}:{x:0,y:1};
  control.begin(1,200,400);control.move(1,200+direction.x*48,400+direction.y*48);
  game.update(.14,control.input);assert.deepEqual(game.cell,{x:start.x+direction.x,y:start.y+direction.y});
  control.end(1);const stopped={...game.cell};game.update(.14,control.input);assert.deepEqual(game.cell,stopped);
});

test('a board tap tolerates small touch jitter and only activates once',()=>{
  const tap=new TapControl();
  tap.begin(1,100,100);tap.move(1,104,102);
  assert.equal(tap.end(2,100,100),false);
  assert.equal(tap.end(1,104,102),true);
  assert.equal(tap.end(1,104,102),false);
});

test('orbiting out and back does not accidentally select a board piece',()=>{
  const tap=new TapControl();
  tap.begin(1,100,100);tap.move(1,150,100);tap.move(1,100,100);
  assert.equal(tap.end(1,100,100),false);
  tap.begin(2,100,100);
  assert.equal(tap.end(2,120,100),false);
  tap.begin(3,100,100);
  assert.equal(tap.end(3,100,100),true);
});

test('neither finger of a pinch can select a board piece',()=>{
  for(const firstUp of [1,2]){
    const tap=new TapControl();
    tap.begin(1,100,100);tap.begin(2,150,100);
    assert.equal(tap.end(firstUp,firstUp===1?100:150,100),false);
    const lastUp=firstUp===1?2:1;
    assert.equal(tap.end(lastUp,lastUp===1?100:150,100),false);
    tap.begin(3,100,100);
    assert.equal(tap.end(3,100,100),true);
  }
});

test('cancellation, lost capture and focus loss invalidate the pending board tap',()=>{
  const tap=new TapControl();
  tap.begin(1,100,100);tap.cancel(1);
  assert.equal(tap.end(1,100,100),false);
  tap.begin(2,100,100);tap.reset();
  assert.equal(tap.end(2,100,100),false);
  tap.begin(3,100,100);tap.cancel(4);
  assert.equal(tap.end(3,100,100),true);
});

test('two game pads keep independent fingers without accepting a replacement finger',()=>{
  const left=new PointerGesture(),right=new PointerGesture();
  assert.equal(left.begin(1,{x:100,y:300}),true);
  assert.equal(right.begin(2,{x:300,y:300}),true);
  assert.equal(right.begin(3,{x:500,y:300}),false);
  assert.equal(right.end(3),null);
  assert.equal(right.cancel(3),false);
  assert.deepEqual(right.get(2),{pointer:2,x:300,y:300});
  assert.deepEqual(left.get(1),{pointer:1,x:100,y:300});
  assert.equal(right.end(2).pointer,2);
  assert.equal(left.get(1).pointer,1);
});

test('a cancelled action gesture cannot later complete a shot or dive',()=>{
  const gesture=new PointerGesture();
  gesture.begin(1,{x:100,y:100,t:500,path:[]});
  assert.equal(gesture.cancel(1),true);
  assert.equal(gesture.get(1),null);
  assert.equal(gesture.end(1),null);
  assert.equal(gesture.cancel(1),false);
  assert.equal(gesture.begin(2,{x:200,y:100,t:900,path:[]}),true);
  assert.equal(gesture.end(2).pointer,2);
  assert.equal(gesture.end(2),null);
});
