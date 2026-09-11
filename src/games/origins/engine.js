import { clamp } from '../core.js';
import { readDoorCampaign, doorUnlocked, doorPerks, completeDoorLevel } from '../door-campaign.js';
import { createOriginsLevel, ZONES, ORIGINS_RUNE_ORDER, RUNE_NAMES, validOriginsRun } from './level.js';
import { moveBody, wrapAngle } from './motion.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const attacks = {
  light: { duration: 0.3, impact: 0.11, range: 2.7, damage: 18 },
  heavy: { duration: 0.62, impact: 0.29, range: 3.5, damage: 34 },
  charged: { duration: 0.78, impact: 0.25, range: 4.2, damage: 58 },
  counter: { duration: 0.34, impact: 0.1, range: 3.3, damage: 32 },
  aerial: { duration: 0.48, impact: 0.16, range: 3, damage: 28 },
};
const SETS = ['defeated', 'activated', 'opened', 'picked', 'moved'];
export class OriginsGame {
  constructor(saved = null, level = saved?.selected || 1, { restart = false, skipIntro = false } = {}) {
    this.campaign = readDoorCampaign(saved);
    this.stageNumber = this.floor = clamp(Math.floor(level) || 1, 1, doorUnlocked(this.campaign));
    this.campaign.selected = this.stageNumber;
    this.level = createOriginsLevel(this.stageNumber);
    this.difficulty = this.level.difficulty;
    this.perks = doorPerks(this.campaign);
    this.maxEnergy = this.perks.focus * 20;
    this.status = 'playing';
    this.mode = skipIntro ? 'play' : 'intro';
    this.introTime = 0;
    this.time = 0;
    this.zone = 0;
    this.fragments = 0;
    this.score = 0;
    this.hits = 0;
    this.falls = 0;
    this.usedElixirs = 0;
    this.elixirs = this.perks.elixirs;
    this.player = {
      x: 0,
      z: 0,
      previousX: 0,
      previousZ: 0,
      y: 0,
      vy: 0,
      vx: 0,
      vz: 0,
      r: 0.42,
      hp: this.perks.hp,
      maxHp: this.perks.hp,
      energy: 35,
      facing: 0,
      heading: 0,
      attack: null,
      charge: -1,
      dodge: 0,
      dodgeCooldown: 0,
      parry: 0,
      parryCooldown: 0,
      invulnerable: 0,
      hit: 0,
      counter: 0,
      comboStep: 0,
      lastLight: -10,
      airTime: 0,
    };
    SETS.forEach((k) => (this[k] = new Set()));
    this.combo = 0;
    this.comboTime = 0;
    this.bestCombo = 0;
    this.perfects = 0;
    this.slow = 0;
    this.hitStop = 0;
    this.shake = 0;
    this.eventId = 0;
    this.events = [];
    this.projectiles = [];
    this.attackSlot = 0;
    this.gateTime = 0;
    this.runeSequence = [];
    this.message = 'Le Cercle Brisé t’appelle. Retrouve son premier symbole.';
    this.messageTime = 5;
    this.bossPhase = 1;
    const run =
      !restart &&
      saved?.originsRun?.level === this.stageNumber &&
      validOriginsRun(saved.originsRun, doorUnlocked(this.campaign))
        ? saved.originsRun
        : null;
    if (run) {
      for (const k of ['zone', 'fragments', 'score', 'hits', 'falls', 'usedElixirs', 'elixirs', 'time'])
        this[k] = run[k];
      this.player.hp = Math.min(this.perks.hp, run.hp);
      this.player.energy = Math.min(this.maxEnergy, run.energy);
      SETS.forEach((k) => (this[k] = new Set(run[k])));
      Object.assign(this.player, ZONES[this.zone].checkpoint);
      this.mode = 'play';
    }
    this.enemies = this.level.enemies.map((e) => ({
      ...e,
      originX: e.x,
      originZ: e.z,
      hp: this.defeated.has(e.id) ? 0 : e.maxHp,
      state: 'idle',
      timer: 0,
      cooldown: 0.7 + e.seed,
      heading: Math.PI,
      hit: 0,
      death: 0,
      turn: 0,
      phase: 1,
      perfect: false,
      attackAngle: 0,
      actionId: 0,
    }));
    this.runeSequence = ORIGINS_RUNE_ORDER.filter((id) => this.activated.has(id));
    this.checkpoint();
  }
  get canAct() {
    return this.status === 'playing' && this.mode === 'play';
  }
  get boss() {
    return this.enemies.find((e) => e.kind === 'boss');
  }
  get objective() {
    if (this.zone === 0 && this.activated.has('first-rune')) return 'Rejoins le Passage brisé.';
    if (this.zone === 1 && this.runeSequence.length === 3) return 'Rejoins la Cour des Oubliés.';
    if (this.zone === 2 && this.courtClear()) return 'Rejoins le Cercle.';
    if (this.zone === 3 && this.boss.hp <= 0) return 'Approche de la Porte interdite.';
    return ZONES[this.zone].goal;
  }
  say(message, seconds = 3) {
    this.message = message;
    this.messageTime = seconds;
  }
  cue(type, x = this.player.x, z = this.player.z, power = 1) {
    const event = { id: ++this.eventId, type, x, z, power };
    this.events.push(event);
    if (this.events.length > 48) this.events.shift();
    return event;
  }
  checkpoint() {
    this.checkpointData = {
      version: 1,
      level: this.stageNumber,
      zone: this.zone,
      hp: Math.max(1, Math.round(this.player.hp)),
      energy: Math.round(this.player.energy),
      fragments: this.fragments,
      score: Math.round(this.score),
      hits: this.hits,
      falls: this.falls,
      elixirs: this.elixirs,
      usedElixirs: this.usedElixirs,
      time: this.time,
      ...Object.fromEntries(SETS.map((k) => [k, [...this[k]]])),
    };
    this.saveRevision = (this.saveRevision || 0) + 1;
  }
  snapshot() {
    return {
      ...this.campaign,
      run: null,
      originsRun: this.won ? null : { ...this.checkpointData, time: this.time },
    };
  }
  skipIntro() {
    if (this.mode === 'intro') {
      this.mode = 'play';
      this.introTime = 4;
      this.cue('enter');
    }
  }
  barriers() {
    const gates = [];
    if (!this.activated.has('first-rune')) gates.push(18);
    if (this.runeSequence.length < 3) gates.push(40);
    if (!this.courtClear()) gates.push(65);
    if (this.boss.hp > 0) gates.push(92);
    return gates;
  }
  maxZ() {
    return this.barriers().find((z) => z > this.player.z - 1) || 110;
  }
  courtClear() {
    return this.enemies.filter((e) => e.zone === 2).every((e) => e.hp <= 0);
  }
  addEnergy(n) {
    const before = this.player.energy;
    this.player.energy = clamp(before + n, 0, this.maxEnergy);
    if (before < 75 && this.player.energy >= 75) {
      this.cue('ready');
      this.say('Fracture Matrix disponible.', 2.5);
    }
  }
  aim() {
    const p = this.player,
      near = this.enemies
        .filter((e) => e.hp > 0 && distance(e, p) < 4.7)
        .sort((a, b) => distance(a, p) - distance(b, p))[0];
    if (near) p.facing = Math.atan2(near.x - p.x, near.z - p.z);
  }
  attack(kind = 'light') {
    if (!this.canAct) return;
    const p = this.player;
    if (p.attack) {
      if (p.attack.elapsed > p.attack.duration * 0.45) this.buffer = { kind, until: this.time + 0.25 };
      return;
    }
    if (p.dodge > 0.13) return;
    if (kind === 'light' && p.counter > 0) {
      kind = 'counter';
      p.counter = 0;
    } else if (kind === 'light' && p.y > 0.3) kind = 'aerial';
    if (!attacks[kind]) return;
    if (kind === 'light') {
      p.comboStep = this.time - p.lastLight < 0.85 ? (p.comboStep % 3) + 1 : 1;
      p.lastLight = this.time;
    } else p.comboStep = 0;
    this.aim();
    p.charge = -1;
    const spec = attacks[kind];
    p.attack = {
      ...spec,
      kind,
      elapsed: 0,
      hit: false,
      angle: p.facing,
      damage: spec.damage + this.perks.attack + (kind === 'light' ? (p.comboStep - 1) * 4 : 0),
    };
    this.cue(kind, p.x, p.z, p.comboStep);
    this.say(
      kind === 'charged'
        ? 'Frappe chargée'
        : kind === 'counter'
          ? 'Riposte immédiate'
          : kind === 'aerial'
            ? 'Frappe aérienne'
            : '',
      0.5,
    );
  }
  startCharge() {
    if (this.canAct && !this.player.attack && this.player.dodge <= 0) this.player.charge = 0;
  }
  releaseCharge() {
    if (this.player.charge < 0) return;
    const kind = this.player.charge >= 0.65 ? 'charged' : 'heavy';
    this.player.charge = -1;
    this.attack(kind);
  }
  cancelCharge() {
    this.player.charge = -1;
  }
  dodge(input = { x: 0, z: 0 }) {
    if (!this.canAct || this.player.dodgeCooldown > 0) return;
    const p = this.player,
      n = Math.hypot(input.x, input.z);
    if (n > 0.1) p.facing = Math.atan2(input.x, input.z);
    p.attack = null;
    p.charge = -1;
    this.buffer = null;
    p.dodge = 0.34;
    p.dodgeCooldown = 0.8;
    p.invulnerable = 0.36;
    p.dashX = Math.sin(p.facing);
    p.dashZ = Math.cos(p.facing);
    if (p.y === 0) p.vy = 4.5;
    this.cue('dodge');
    const danger = this.enemies.find(
      (e) =>
        e.hp > 0 && e.state === 'windup' && e.timer < 0.24 && !e.perfect && this.inEnemyAttack(e, p),
    );
    if (danger) {
      danger.perfect = true;
      this.perfects++;
      p.counter = 1.6;
      this.slow = 0.33;
      this.addEnergy(24);
      this.cue('perfect');
      this.say('ESQUIVE PARFAITE · riposte disponible', 2);
    }
  }
  parry() {
    if (!this.canAct || this.player.parryCooldown > 0 || this.player.dodge > 0) return;
    this.player.attack = null;
    this.player.charge = -1;
    this.player.parry = 0.24;
    this.player.parryCooldown = 0.85;
    this.cue('guard');
  }
  power() {
    if (!this.canAct || this.player.energy < 75) return;
    const p = this.player;
    p.energy -= 75;
    p.attack = null;
    p.charge = -1;
    p.invulnerable = 0.85;
    p.counter = 0;
    this.buffer = null;
    this.slow = 0.65;
    this.hitStop = 0.045;
    this.shake = 0.23;
    this.cue('matrix');
    this.say('FRACTURE MATRIX', 2);
    for (const e of this.enemies)
      if (e.hp > 0 && distance(p, e) < 8) this.hurtEnemy(e, 82 + this.perks.attack, 2.1, true);
    this.projectiles = this.projectiles.filter((b) => distance(p, b) > 9);
  }
  heal() {
    if (!this.canAct || this.elixirs <= 0 || this.player.hp >= this.player.maxHp) return;
    this.elixirs--;
    this.usedElixirs++;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
    this.cue('heal');
    this.say('Élixir · +35 vitalité', 2);
  }
  impact(attack) {
    const p = this.player;
    let hits = 0;
    for (const e of this.enemies) {
      if (e.hp <= 0 || distance(p, e) > attack.range + e.r) continue;
      const angle = Math.atan2(e.x - p.x, e.z - p.z);
      if (Math.abs(wrapAngle(angle - attack.angle)) > (attack.kind === 'charged' ? 1.5 : 1.25)) continue;
      this.hurtEnemy(e, attack.damage, attack.kind === 'light' ? 0.42 : 1.2, attack.kind !== 'light');
      hits++;
    }
    if (hits) {
      this.hitStop = attack.kind === 'light' ? 0.025 : 0.045;
      this.shake = attack.kind === 'light' ? 0.08 : 0.18;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.comboTime = 3;
      this.addEnergy(7 + Math.min(12, this.combo * 2));
    } else this.comboTime = Math.min(this.comboTime, 1.4);
  }
  hurtEnemy(e, damage, force = 0, interrupt = false) {
    if (e.hp <= 0) return;
    e.hp = Math.max(0, e.hp - damage);
    e.hit = 0.25;
    e.actionId++;
    const dx = e.x - this.player.x,
      dz = e.z - this.player.z,
      len = Math.hypot(dx, dz) || 1;
    moveBody(e, (dx / len) * force, (dz / len) * force, this.level.obstacles, ZONES[e.zone].to - 1);
    const stagger =
      e.kind === 'boss'
        ? interrupt && !(e.poise > 0)
        : e.kind === 'sentinel'
          ? interrupt || !(e.poise > 0)
          : true;
    if (stagger) {
      e.state = 'stagger';
      e.timer = interrupt ? 0.48 : 0.18;
      if (e.kind === 'boss') e.poise = 4;
      else if (e.kind === 'sentinel') e.poise = 1.8;
    }
    this.cue('impact', e.x, e.z, damage);
    if (e.hp === 0) {
      e.state = 'dead';
      e.death = 1.5;
      this.defeated.add(e.id);
      this.score += e.kind === 'boss' ? 650 : e.kind === 'sentinel' ? 120 : 75;
      this.addEnergy(e.kind === 'boss' ? 35 : 12);
      this.cue('defeat', e.x, e.z, e.kind === 'boss' ? 3 : 1);
      if (e.kind === 'boss') {
        this.fragments += 2;
        this.say('Le Gardien tombe. La Porte t’attend.', 4);
        this.cue('boss-down');
        this.checkpoint();
      } else if (e.zone === 2 && this.courtClear()) {
        this.fragments += 2;
        this.say('La Cour est libérée · deux fragments retrouvés.', 4);
        this.cue('seal');
        this.checkpoint();
      }
    }
  }
  inEnemyAttack(e, p) {
    const d = distance(e, p);
    if (e.kind === 'corrupt') return d < 9;
    const range =
      e.kind === 'boss' ? (e.move === 'wave' ? 6.5 : 4.1) : e.kind === 'sentinel' ? 3.2 : 2.3;
    if (d > range + p.r) return false;
    if (e.move === 'wave') return true;
    return Math.abs(wrapAngle(Math.atan2(p.x - e.x, p.z - e.z) - e.attackAngle)) < 1.05;
  }
  hurt(damage, source) {
    const p = this.player;
    if (!this.canAct || p.invulnerable > 0) return false;
    if (p.parry > 0 && source) {
      p.parry = 0;
      p.counter = 1.5;
      p.invulnerable = 0.35;
      this.addEnergy(24);
      this.slow = 0.22;
      this.cue('perfect');
      this.say('PARADE PARFAITE · riposte disponible', 2);
      this.hurtEnemy(source, 18, 0.6, true);
      return false;
    }
    p.hp = Math.max(0, p.hp - damage);
    p.hit = 0.32;
    p.invulnerable = 0.7;
    p.attack = null;
    p.charge = -1;
    this.buffer = null;
    this.combo = 0;
    this.comboTime = 0;
    this.hits++;
    this.shake = 0.13;
    this.cue('hurt');
    if (source) {
      const dx = p.x - source.x,
        dz = p.z - source.z,
        n = Math.hypot(dx, dz) || 1;
      moveBody(p, (dx / n) * 0.65, (dz / n) * 0.65, this.level.obstacles, this.maxZ());
    }
    if (p.hp <= 0) {
      this.status = 'ended';
      this.mode = 'dead';
      this.won = false;
      this.cue('death');
      this.say('La lumière demeure. Reprends au dernier seuil.', 99);
    }
    return true;
  }
  closestInteraction() {
    return (
      this.level.objects
        .filter(
          (o) =>
            o.zone <= this.zone &&
            distance(o, this.player) < 2.4 &&
            !this.activated.has(o.id) &&
            !this.opened.has(o.id) &&
            !this.moved.has(o.id) &&
            (!o.hidden || this.moved.has('loose-stone')),
        )
        .sort((a, b) => distance(a, this.player) - distance(b, this.player))[0] || null
    );
  }
  interact() {
    if (!this.canAct) return;
    const o = this.closestInteraction();
    if (!o) return;
    if (o.kind === 'inscription') {
      this.say('Le Soleil guide la Lune. La Lune précède l’Étoile.', 7);
      this.cue('rune', o.x, o.z);
      return;
    }
    if (o.kind === 'stone') {
      this.moved.add(o.id);
      this.say('La pierre révèle une cache marquée du 3B.', 4);
      this.cue('stone', o.x, o.z);
      this.checkpoint();
      return;
    }
    if (o.kind === 'cache') {
      this.opened.add(o.id);
      this.score += 180;
      this.addEnergy(35);
      this.say('Mémoire 3B · +180 fragments de score · énergie +35', 4);
      this.cue('cache', o.x, o.z);
      this.checkpoint();
      return;
    }
    if (o.kind === 'gate') {
      if (this.fragments < 8 || this.boss.hp > 0) {
        this.say('Les huit fragments et la chute du Gardien sont nécessaires.', 3);
        return;
      }
      this.mode = 'gate';
      this.gateTime = 0;
      this.player.vx = this.player.vz = 0;
      this.cue('gate-silence');
      return;
    }
    if (o.id === 'first-rune') {
      this.activated.add(o.id);
      this.fragments += 2;
      this.addEnergy(40);
      this.say('Deux fragments répondent. Le passage s’ouvre.', 4);
      this.cue('seal', o.x, o.z);
      this.checkpoint();
      return;
    }
    if (o.id === ORIGINS_RUNE_ORDER[this.runeSequence.length]) {
      this.runeSequence.push(o.id);
      this.activated.add(o.id);
      this.cue('rune', o.x, o.z);
      if (this.runeSequence.length === 3) {
        this.fragments += 2;
        this.addEnergy(20);
        this.say('Les runes s’accordent. La Cour est accessible.', 4);
        this.cue('seal', o.x, o.z);
        this.checkpoint();
      } else this.say(`${RUNE_NAMES[o.id]} éveillé · ${this.runeSequence.length} / 3`, 2);
    } else {
      this.runeSequence = [];
      ORIGINS_RUNE_ORDER.forEach((id) => this.activated.delete(id));
      this.say('L’ordre se brise. Soleil → Lune → Étoile.', 4);
      this.cue('rune-error', o.x, o.z);
    }
  }
  enemyAttack(e) {
    e.turn++;
    e.actionId++;
    this.cue('enemy-attack', e.x, e.z, e.kind === 'boss' ? 2 : 1);
    if (e.kind === 'corrupt' || e.move === 'bolts') {
      const n = e.kind === 'boss' ? 5 : 1;
      for (let i = 0; i < n; i++) {
        const a = e.attackAngle + (i - (n - 1) / 2) * 0.26;
        this.projectiles.push({
          x: e.x + Math.sin(a),
          z: e.z + Math.cos(a),
          vx: Math.sin(a) * 8,
          vz: Math.cos(a) * 8,
          life: 2.8,
          source: e.id,
        });
      }
    } else if (this.inEnemyAttack(e, this.player))
      this.hurt(this.difficulty.damage * (e.kind === 'boss' ? 1.6 : e.kind === 'sentinel' ? 1.4 : 1), e);
    e.state = 'recover';
    e.timer = e.kind === 'boss' ? 0.65 : 0.45;
    e.cooldown =
      (e.kind === 'shadow' ? 1.3 : e.kind === 'boss' ? 1.5 : 2) + (Math.sin(e.seed + e.turn) + 1) * 0.2;
  }
  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      e.hit = Math.max(0, e.hit - dt);
      e.poise = Math.max(0, (e.poise || 0) - dt);
      if (e.hp <= 0) {
        e.death = Math.max(0, e.death - dt);
        continue;
      }
      e.cooldown = Math.max(0, e.cooldown - dt);
      if (e.zone !== this.zone) continue;
      const d = distance(e, p);
      if (d > 17) continue;
      if (e.kind === 'boss') {
        const phase = e.hp / e.maxHp < 0.32 ? 3 : e.hp / e.maxHp < 0.67 ? 2 : 1;
        if (phase !== e.phase) {
          e.phase = phase;
          this.bossPhase = phase;
          e.state = 'recover';
          e.timer = 0.9;
          this.cue('boss-phase', e.x, e.z, phase);
          this.say(
            phase === 2
              ? 'Le Gardien canalise l’énergie Matrix.'
              : 'Dernière phase · lis ses attaques avant de riposter.',
            3,
          );
        }
      }
      if (['windup', 'recover', 'stagger'].includes(e.state)) {
        e.timer -= dt;
        if (e.state === 'windup' && e.timer <= 0) this.enemyAttack(e);
        else if (e.timer <= 0) e.state = 'idle';
        continue;
      }
      const ranged = e.kind === 'corrupt',
        range = ranged ? 8 : e.kind === 'boss' ? 4 : e.kind === 'sentinel' ? 2.9 : 2;
      const angle = Math.atan2(p.x - e.x, p.z - e.z);
      e.heading += wrapAngle(angle - e.heading) * (1 - Math.exp(-dt * 9));
      if (
        d < range &&
        e.cooldown <= 0 &&
        this.attackSlot <= 0 &&
        this.enemies.filter((v) => v.state === 'windup' && v.zone === this.zone).length <
          (this.stageNumber < 35 ? 1 : 2)
      ) {
        e.state = 'windup';
        e.move =
          e.kind === 'boss' && e.phase >= 2
            ? e.turn % 3 === 1
              ? 'bolts'
              : e.turn % 3 === 2
                ? 'wave'
                : 'slam'
            : 'strike';
        e.timer =
          ((e.kind === 'boss' ? 1.15 : e.kind === 'sentinel' ? 1 : ranged ? 0.95 : 0.7) *
            this.difficulty.windup) /
          (e.phase === 3 ? 1.12 : 1);
        e.windup = e.timer;
        e.attackAngle = angle;
        e.perfect = false;
        this.attackSlot = 0.32;
        this.cue('telegraph', e.x, e.z, e.kind === 'boss' ? 2 : 1);
        continue;
      }
      let dx = 0,
        dz = 0;
      if (ranged) {
        const forward = d < 4 ? -1 : d > 7 ? 1 : 0,
          side = Math.sin(e.seed + this.time * 0.6) > 0 ? 1 : -1;
        dx = Math.sin(angle) * forward + Math.cos(angle) * side * 0.5;
        dz = Math.cos(angle) * forward - Math.sin(angle) * side * 0.5;
      } else if (d > range * 0.78) {
        const flank = d > 4 ? Math.sin(e.seed) * 0.4 : 0;
        dx = Math.sin(angle) + Math.cos(angle) * flank;
        dz = Math.cos(angle) - Math.sin(angle) * flank;
      } else if (e.cooldown > 0.3) {
        dx = Math.cos(angle) * Math.sin(e.seed) * 0.5;
        dz = -Math.sin(angle) * Math.sin(e.seed) * 0.5;
      }
      for (const other of this.enemies) {
        if (other === e || other.hp <= 0 || other.zone !== e.zone) continue;
        const gap = distance(e, other);
        if (gap < e.r + other.r + 0.55 && gap > 0.01) {
          dx += ((e.x - other.x) / gap) * 0.75;
          dz += ((e.z - other.z) / gap) * 0.75;
        }
      }
      const n = Math.hypot(dx, dz);
      if (n > 0.01) {
        moveBody(
          e,
          (dx / n) * e.speed * dt,
          (dz / n) * e.speed * dt,
          this.level.obstacles,
          ZONES[e.zone].to - 1,
        );
        e.z = Math.max(ZONES[e.zone].from + 1, e.z);
        e.moving = true;
      } else e.moving = false;
    }
  }
  finish() {
    if (this.won || this.mode !== 'gate' || this.gateTime < 5) return;
    this.score += 500 + this.stageNumber * 15 + Math.round(this.player.hp * 2);
    const result = completeDoorLevel({ ...this.campaign, originsRun: null }, this.stageNumber, {
      score: this.score,
      time: this.time,
      mistakes: this.hits + this.falls,
      usedElixirs: this.usedElixirs,
    });
    this.campaign = result.campaign;
    this.stars = result.stars;
    this.firstClear = result.first;
    this.status = 'ended';
    this.mode = 'victory';
    this.won = true;
    this.cue('victory');
    this.saveRevision++;
  }
  update(dt, input = { x: 0, z: 0 }) {
    if (this.status === 'ended') return;
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
    if (this.mode === 'intro') {
      this.introTime += dt;
      if (this.introTime >= 3.6) this.skipIntro();
      return;
    }
    if (this.mode === 'gate') {
      const before = this.gateTime;
      this.gateTime += dt;
      for (const [at, type] of [
        [0.5, 'gate-wake'],
        [1.4, 'gate-orbit'],
        [2.8, 'gate-beam'],
        [4.1, 'gate-shadow'],
      ])
        if (before < at && this.gateTime >= at) this.cue(type);
      this.finish();
      return;
    }
    this.time += dt;
    this.slow = Math.max(0, this.slow - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.messageTime = Math.max(0, this.messageTime - dt);
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }
    const step = dt * (this.slow > 0 ? 0.55 : 1),
      p = this.player;
    for (const key of [
      'dodge',
      'dodgeCooldown',
      'parry',
      'parryCooldown',
      'invulnerable',
      'hit',
      'counter',
    ])
      p[key] = Math.max(0, p[key] - step);
    this.attackSlot = Math.max(0, this.attackSlot - step);
    this.comboTime = Math.max(0, this.comboTime - step);
    if (this.comboTime === 0) this.combo = 0;
    if (p.charge >= 0) p.charge = Math.min(1.4, p.charge + step);
    p.previousX = p.x;
    p.previousZ = p.z;
    const n = Math.hypot(input.x, input.z),
      strength = Math.min(1, n),
      speed =
        (input.sprint ? 6.2 : 5.2) *
        (p.charge >= 0 ? 0.48 : p.attack?.kind === 'charged' ? 0.25 : p.attack ? 0.55 : 1);
    const tx = n > 0.07 ? (input.x / n) * speed * strength : 0,
      tz = n > 0.07 ? (input.z / n) * speed * strength : 0,
      ease = 1 - Math.exp(-step * (n > 0.07 ? 23 : 31));
    p.vx += (tx - p.vx) * ease;
    p.vz += (tz - p.vz) * ease;
    if (p.dodge > 0) {
      p.vx = p.dashX * 14;
      p.vz = p.dashZ * 14;
    } else if (n > 0.1 && !p.attack) p.facing = Math.atan2(input.x, input.z);
    moveBody(p, p.vx * step, p.vz * step, this.level.obstacles, this.maxZ());
    p.heading += wrapAngle(p.facing - p.heading) * (1 - Math.exp(-step * 19));
    if (p.y > 0 || p.vy > 0) {
      p.vy -= 15 * step;
      p.y = Math.max(0, p.y + p.vy * step);
      if (p.y === 0) {
        p.vy = 0;
        this.cue('land');
      }
    }
    const pit = this.level.pits.find(
      (h) => Math.abs(p.x - h.x) < h.w / 2 && Math.abs(p.z - h.z) < h.d / 2,
    );
    if (pit && p.y <= 0.03) {
      this.falls++;
      this.hurt(13);
      if (this.canAct) {
        Object.assign(p, ZONES[this.zone].checkpoint);
        p.vx = p.vz = p.vy = p.y = 0;
        p.invulnerable = 1;
        this.say('Le sol se dérobe. Esquive au-dessus des fissures ou contourne-les.', 4);
        this.cue('fall');
      }
    }
    if (p.attack) {
      p.attack.elapsed += step;
      if (!p.attack.hit && p.attack.elapsed >= p.attack.impact) {
        p.attack.hit = true;
        this.impact(p.attack);
      }
      if (p.attack.elapsed >= p.attack.duration) p.attack = null;
    }
    if (!p.attack && this.buffer) {
      const b = this.buffer;
      this.buffer = null;
      if (this.time <= b.until) this.attack(b.kind);
    }
    this.updateEnemies(step);
    if (!this.canAct) return;
    for (const b of this.projectiles) {
      b.life -= step;
      const segments = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vz) * step) / 0.25));
      for (let i = 0; i < segments && b.life > 0; i++) {
        b.x += (b.vx * step) / segments;
        b.z += (b.vz * step) / segments;
        if (this.level.obstacles.some((o) => distance(o, b) < o.r + 0.12)) {
          b.life = 0;
          break;
        }
        if (distance(p, b) < p.r + 0.2) {
          this.hurt(
            this.difficulty.damage,
            this.enemies.find((e) => e.id === b.source),
          );
          b.life = 0;
        }
      }
    }
    this.projectiles = this.projectiles.filter((b) => b.life > 0).slice(-32);
    for (const item of this.level.pickups)
      if (!this.picked.has(item.id) && distance(item, p) < 1) {
        this.picked.add(item.id);
        this.addEnergy(25);
        this.score += 30;
        this.cue('pickup', item.x, item.z);
        this.say('Énergie du Fragment +25', 1.5);
      }
    const zone = ZONES.findIndex((z) => p.z >= z.from && p.z < z.to);
    if (zone > this.zone) {
      this.zone = zone;
      p.hp = Math.min(p.maxHp, p.hp + 20);
      this.addEnergy(10);
      this.checkpoint();
      this.cue('zone');
      this.say(ZONES[zone].name, 4);
    }
  }
}
