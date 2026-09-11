// A bounded fixed-step simulation keeps combat and movement consistent across displays.
export function createStepper(step = 1 / 60) {
  let accumulated = 0;
  return {
    reset() { accumulated = 0; },
    advance(elapsed, update) {
      accumulated += Math.min(.2, Math.max(0, elapsed));
      let count = 0;
      while (accumulated + 1e-9 >= step && count < 12) {
        accumulated -= step;
        count++;
        if (update(step) === false) { accumulated = 0; break; }
      }
      return count;
    },
  };
}

export function actionState(game, id) {
  if (id === 'arena') return { label: 'Esquive', remaining: game.dash, duration: 2.8 };
  if (id === 'maze') {
    const nearby = game.switches.some(s => !s.used && Math.abs(s.x-game.cell.x)+Math.abs(s.y-game.cell.y)<=1);
    return { label: nearby ? 'Ouvrir le passage' : 'Éclat de lumière', remaining: nearby ? 0 : game.flashCooldown, duration: 9, unavailable: !nearby && game.lamp <= 12 };
  }
  if (id === 'refuge') return { label: game.contextAction().label, remaining: game.interact, duration: .35 };
  return { label: 'Tourner la tuile', remaining: 0, duration: 1 };
}
