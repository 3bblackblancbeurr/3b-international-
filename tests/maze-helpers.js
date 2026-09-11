import {createMazeMotion} from '../src/games/maze-motion.js';
import {paths} from '../src/games/maze.js';
export function placeMazePlayer(game,point){game.cell={x:point.x,y:point.y};game.motion=createMazeMotion(game.cell);game.displayCell=game.motion.position;game.reveal(true);}
export function solveMaze(game,limit=30000){
 for(let frame=0;game.status==='playing'&&frame<limit;frame++){
  const goal=game.nearestGoal(),route=paths(game.grid,goal),at=route.parent[game.cell.y*game.cols+game.cell.x];
  const threat=paths(game.grid,game.cell).dist[game.shadow.y*game.cols+game.shadow.x];if(threat>=0&&threat<=5&&game.flashCooldown<=0)game.action();
  const next=at<0?goal:{x:at%game.cols,y:Math.floor(at/game.cols)};
  game.update(1/60,{x:next.x-game.displayCell.x,y:next.y-game.displayCell.y});
 }
 return game;
}
