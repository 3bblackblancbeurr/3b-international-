/** Deterministic, renderer-independent joint choreography. All angles are radians. */
export const COMPANION_POSE_ACTIONS = Object.freeze([
  'idle', 'walk', 'hello', 'wave', 'dance', 'breakdance', 'curious', 'rest', 'sit',
  'sleep', 'wake', 'pocket', 'hologram', 'hang', 'fall', 'land', 'highfive',
  'celebrate', 'reward', 'secret', 'guardian', 'support', 'clock', 'notification', 'focus', 'think',
]);

export const NEUTRAL_COMPANION_POSE = Object.freeze({
  rootX: 0, rootY: 0, rootZ: 0, rootYaw: .12, rootPitch: 0,
  torsoX: 0, torsoY: 0, torsoZ: 0, headX: 0, headY: 0, headZ: 0,
  shoulderLX: 0, shoulderLY: 0, shoulderLZ: -.09, elbowL: -.12, elbowLZ: 0, wristLX: 0, wristLZ: 0,
  shoulderRX: 0, shoulderRY: 0, shoulderRZ: .09, elbowR: -.12, elbowRZ: 0, wristRX: 0, wristRZ: 0,
  hipLX: 0, hipLZ: -.025, kneeL: .04, ankleL: 0,
  hipRX: 0, hipRZ: .025, kneeR: .04, ankleR: 0,
  eyeL: 1, eyeR: 1, browL: -.08, browR: .08, mouth: .12, fingers: .14,
  object: 0, hologram: 0, glow: 1, propSpin: 0, cameraScale: 1, cameraLift: 0,
});

const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const smooth = (a, b, value) => { const x = clamp((value-a)/(b-a), 0, 1); return x*x*(3-2*x); };

export function companionPoseAction(action) {
  const aliases = { salute: 'hello', surprise: 'curious', jump: 'celebrate', greet: 'hello', question: 'think', calm: 'rest', nudge: 'curious', tease: 'curious', stretch: 'wake', project: 'hologram' };
  const next = aliases[action] || action;
  return COMPANION_POSE_ACTIONS.includes(next) ? next : 'idle';
}

/** Motion uses action-local time so pocket retrieval and landings have an actual beginning. */
export function computeCompanionPose({ action = 'idle', time = 0, facing = 1, speaking = false, reduced = false, gazeX = 0, gazeY = 0 } = {}) {
  const pose = { ...NEUTRAL_COMPANION_POSE };
  const kind = companionPoseAction(action);
  const t = reduced ? (kind === 'pocket' ? 2.2 : kind === 'land' ? 1.2 : .6) : Math.max(0, finite(time)) % 100000;
  const sin = Math.sin;
  const s = sin(t*2.1);
  const breath = reduced ? 0 : sin(t*1.75);
  const direction = facing < 0 ? -1 : 1;
  pose.rootYaw = direction*.13;
  pose.rootY = breath*.012;
  pose.torsoX = breath*.013;
  pose.headY = reduced ? 0 : sin(t*.57)*.075;
  pose.headZ = reduced ? 0 : sin(t*.83)*.025;
  pose.shoulderLX = breath*.015;
  pose.shoulderRX = -breath*.015;
  const blinkPhase = (t+2.9)%5.4;
  const blink = reduced ? 1 : blinkPhase < .14 ? .12 + Math.abs(blinkPhase-.07)/.07*.88 : 1;
  pose.eyeL = blink;
  pose.eyeR = blink;

  switch (kind) {
    case 'walk': {
      const stride = sin(t*7.6);
      pose.rootYaw = direction*.88;
      pose.hipLX = -.57*stride;
      pose.hipRX = .57*stride;
      pose.kneeL = .07 + Math.max(0, -sin(t*7.6+.35))*.82;
      pose.kneeR = .07 + Math.max(0, sin(t*7.6+.35))*.82;
      pose.ankleL = -pose.hipLX*.35-pose.kneeL*.42;
      pose.ankleR = -pose.hipRX*.35-pose.kneeR*.42;
      pose.shoulderLX = .49*stride;
      pose.shoulderRX = -.49*stride;
      pose.elbowL = -.25-Math.max(0, stride)*.12;
      pose.elbowR = -.25-Math.max(0, -stride)*.12;
      pose.rootY = .024+Math.abs(sin(t*7.6))*.044;
      pose.rootZ = stride*.025;
      pose.torsoY = stride*.06;
      pose.headY = -direction*.17;
      break;
    }
    case 'hello': case 'wave':
      pose.shoulderRZ = 2.43;
      pose.shoulderRX = -.22;
      pose.elbowR = -.44;
      pose.wristRZ = sin(t*10)*.36;
      pose.wristRX = -.22;
      pose.fingers = .02;
      pose.headZ = -.09;
      pose.rootZ = -.045;
      pose.eyeL *= 1.13; pose.eyeR *= 1.13;
      break;
    case 'dance': {
      const beat = sin(t*8.5);
      pose.rootY = .065+Math.abs(beat)*.10;
      pose.rootX = sin(t*4.25)*.08;
      pose.rootZ = sin(t*4.25)*.11;
      pose.rootYaw += sin(t*2.125)*.34;
      pose.torsoY = sin(t*4.25)*.18;
      pose.torsoZ = -sin(t*4.25)*.09;
      pose.shoulderLX = -.44+beat*.52;
      pose.shoulderRX = -.44-beat*.52;
      pose.shoulderLZ = -.55-sin(t*4.25)*.48;
      pose.shoulderRZ = .55+sin(t*4.25)*.48;
      pose.elbowL = -.85+beat*.3;
      pose.elbowR = -.85-beat*.3;
      pose.hipLX = -.14+beat*.32;
      pose.hipRX = -.14-beat*.32;
      pose.hipLZ = -.08-Math.max(0, sin(t*4.25))*.13;
      pose.hipRZ = .08+Math.max(0, -sin(t*4.25))*.13;
      pose.kneeL = .30+Math.max(0, -beat)*.40;
      pose.kneeR = .30+Math.max(0, beat)*.40;
      pose.headX = .02+beat*.10;
      pose.headZ = -pose.rootZ*.5;
      pose.glow = 1.3+Math.max(0, beat)*.8;
      pose.fingers = .28;
      pose.cameraScale = 1.08;
      break;
    }
    case 'breakdance':
      pose.rootY = -1.10;
      pose.rootZ = -1.08+sin(t*4)*.02;
      pose.rootYaw = t*2.1;
      pose.rootPitch = 0;
      pose.torsoZ = -.1;
      pose.shoulderLZ = 1.08;
      pose.shoulderLX = 0;
      pose.elbowL = -.08;
      pose.wristLX = -.35;
      pose.shoulderRZ = -1.0;
      pose.elbowR = -.87;
      pose.hipLX = -.4+sin(t*5)*.22;
      pose.hipRX = .6-sin(t*5)*.22;
      pose.hipLZ = -.50;
      pose.hipRZ = -.65;
      pose.kneeL = .12; pose.kneeR = .20;
      pose.headZ = .35;
      pose.cameraScale = 1.55;
      pose.cameraLift = -.65;
      pose.fingers = .02;
      pose.glow = 1.8;
      break;
    case 'curious': case 'think': case 'focus':
      pose.headZ = -.20;
      pose.headX = .08;
      pose.headY = .12;
      pose.shoulderRX = -1.00;
      pose.shoulderRZ = -.15;
      pose.elbowR = -1.40;
      pose.wristRX = .26;
      pose.browR = -.3;
      pose.eyeR *= .65;
      pose.torsoZ = -.035;
      pose.fingers = .68;
      if (kind === 'focus') { pose.eyeL *= .78; pose.glow = .7; }
      break;
    case 'rest': case 'sit': case 'sleep':
      pose.rootY = -.45;
      pose.hipLX = -1.23; pose.hipRX = -1.23;
      pose.kneeL = 1.58; pose.kneeR = 1.58;
      pose.ankleL = -.20; pose.ankleR = -.20;
      pose.shoulderLX = -.60; pose.shoulderRX = -.60;
      pose.elbowL = -.20; pose.elbowR = -.20;
      pose.shoulderLZ = -.06; pose.shoulderRZ = .06;
      pose.torsoX = .09;
      pose.headX = kind === 'sleep' ? .25 : -.025;
      pose.eyeL = kind === 'sleep' ? .10 : blink*.78;
      pose.eyeR = pose.eyeL;
      pose.glow = kind === 'sleep' ? .38 : .7;
      pose.cameraLift = -.24;
      break;
    case 'wake':
      pose.shoulderLZ = -2.55;
      pose.shoulderRZ = 2.55;
      pose.elbowL = -.45; pose.elbowR = -.45;
      pose.torsoX = -.08;
      pose.headX = -.10;
      pose.rootY = .03+.025*s;
      pose.eyeL *= .70; pose.eyeR *= .70;
      break;
    case 'pocket': {
      const reach = smooth(.05, .8, t);
      const lift = smooth(.85, 2.0, t);
      pose.shoulderRX = .15*reach-.98*lift;
      pose.shoulderRZ = -.10*reach+.37*lift;
      pose.elbowR = -.35*reach-.65*lift;
      pose.wristRX = -.25*lift;
      pose.headX = .17*(1-lift)-.06*lift;
      pose.headY = -.18*reach;
      pose.object = smooth(1.05, 1.5, t);
      pose.propSpin = t*1.2;
      pose.glow = 1+.6*lift;
      pose.fingers = .38*(1-lift);
      break;
    }
    case 'hologram':
      pose.shoulderLX = -.90;
      pose.shoulderLZ = -.32;
      pose.elbowL = -.91;
      pose.wristLX = .35;
      pose.shoulderRX = -.45;
      pose.elbowR = -1.30;
      pose.headY = .18;
      pose.hologram = smooth(.05, .9, t);
      pose.propSpin = t*.5;
      pose.glow = 1.35;
      pose.fingers = .02;
      break;
    case 'hang':
      pose.shoulderLZ = -3.39;
      pose.shoulderRZ = 3.39;
      pose.shoulderLX = -.10; pose.shoulderRX = -.10;
      pose.elbowL = -.09; pose.elbowR = -.09;
      pose.wristLX = -.38; pose.wristRX = -.38;
      pose.rootZ = sin(t*2.0)*.055;
      pose.hipLX = -.18+sin(t*2)*.12;
      pose.hipRX = -.18-sin(t*2)*.12;
      pose.kneeL = .35; pose.kneeR = .35;
      pose.headX = -.12;
      pose.fingers = .85;
      pose.cameraScale = 1.16;
      pose.cameraLift = .26;
      break;
    case 'fall':
      pose.rootZ = sin(t*9)*.10;
      pose.shoulderLZ = -1.70;
      pose.shoulderRZ = 1.70;
      pose.elbowL = -.50; pose.elbowR = -.50;
      pose.hipLX = -.45; pose.hipRX = -.34;
      pose.kneeL = .8; pose.kneeR = .57;
      pose.eyeL = 1.28; pose.eyeR = 1.28;
      pose.mouth = .8;
      pose.cameraScale = 1.30;
      break;
    case 'land': {
      const crouch = 1-smooth(.16, 1.05, t);
      pose.rootY = -.35*crouch;
      pose.hipLX = -.90*crouch; pose.hipRX = -.90*crouch;
      pose.kneeL = 1.55*crouch; pose.kneeR = 1.55*crouch;
      pose.ankleL = -.55*crouch; pose.ankleR = -.55*crouch;
      pose.torsoX = .25*crouch;
      pose.shoulderLZ = -.45*crouch; pose.shoulderRZ = .45*crouch;
      pose.elbowL = -.52*crouch; pose.elbowR = -.52*crouch;
      pose.cameraScale = 1+.1*crouch;
      break;
    }
    case 'highfive':
      pose.shoulderRX = -1.1;
      pose.shoulderRZ = 1.28;
      pose.elbowR = -.62;
      pose.wristRX = -.52;
      pose.fingers = 0;
      pose.rootY = .035;
      pose.headZ = -.09;
      pose.cameraScale = 1.10;
      break;
    case 'celebrate': case 'reward':
      pose.shoulderLZ = -2.30+s*.17;
      pose.shoulderRZ = 2.30-s*.17;
      pose.elbowL = -.40; pose.elbowR = -.40;
      pose.rootY = Math.abs(sin(t*5.0))*.18;
      pose.hipLX = -.08; pose.hipRX = -.08;
      pose.kneeL = .13; pose.kneeR = .13;
      pose.glow = 1.7+Math.abs(s)*.5;
      pose.object = kind === 'reward' ? .9 : 0;
      pose.propSpin = t*2;
      pose.fingers = .03;
      pose.cameraScale = kind === 'reward' ? 1.25 : 1.15;
      break;
    case 'secret':
      pose.shoulderRX = -1.11;
      pose.elbowR = -1.37;
      pose.shoulderRZ = -.12;
      pose.headX = .1;
      pose.eyeL *= .65; pose.eyeR *= .65;
      pose.glow = .6;
      pose.fingers = .65;
      break;
    case 'guardian':
      pose.shoulderLZ = -.18; pose.shoulderRZ = .18;
      pose.elbowL = -.35; pose.elbowR = -.35;
      pose.hipLZ = -.065; pose.hipRZ = .065;
      pose.headX = -.06;
      pose.glow = 1.5;
      break;
    case 'support':
      pose.shoulderRX = -.70;
      pose.shoulderRZ = -.31;
      pose.elbowR = -1.50;
      pose.headZ = -.12;
      pose.browL = .15; pose.browR = -.15;
      pose.glow = 1.35;
      break;
    case 'clock':
      pose.shoulderLX = -.48;
      pose.elbowL = -1.2;
      pose.shoulderLZ = .34;
      pose.headX = .23;
      pose.headY = .24;
      pose.wristLZ = -.5;
      break;
    case 'notification':
      pose.shoulderRX = -.84;
      pose.elbowR = -.85;
      pose.shoulderRZ = .25;
      pose.headZ = -.06;
      pose.object = 1;
      pose.propSpin = t;
      pose.glow = 1.4;
      break;
    default: break;
  }
  pose.headY += clamp(finite(gazeX), -1, 1)*.20;
  pose.headX += clamp(finite(gazeY), -1, 1)*.13;
  if (speaking && kind !== 'sleep') {
    pose.mouth = reduced ? .5 : .3+Math.abs(sin(t*17.3))*.65;
    pose.headX += reduced ? 0 : sin(t*7.2)*.026;
    pose.glow += .15;
  }
  return pose;
}

/** Exponential smoothing gives the same transition speed at 24, 30 or 60 fps. */
export function blendCompanionPose(previous, target, deltaSeconds, snap = false) {
  if (!previous || snap) return { ...target };
  const alpha = 1-Math.exp(-clamp(finite(deltaSeconds), 0, .1)*12);
  const next = {};
  for (const key of Object.keys(NEUTRAL_COMPANION_POSE)) {
    const from = finite(previous[key], NEUTRAL_COMPANION_POSE[key]);
    const to = finite(target[key], NEUTRAL_COMPANION_POSE[key]);
    // Root rotations use the shortest turn, including repeated breakdance revolutions.
    const distance = key === 'rootYaw' ? Math.atan2(Math.sin(to-from), Math.cos(to-from)) : to-from;
    next[key] = from+distance*alpha;
  }
  return next;
}

export function companionFramePolicy({ active = true, visible = true, reduced = false, action = 'idle', size = 118, devicePixelRatio = 1 } = {}) {
  const quiet = ['idle', 'rest', 'sit', 'sleep', 'focus', 'guardian', 'secret', 'think'].includes(companionPoseAction(action));
  return { animate: !!active && !!visible && !reduced, fps: quiet ? (size > 160 ? 24 : 18) : (size > 160 ? 40 : 30), dpr: clamp(finite(devicePixelRatio, 1), 1, size > 160 ? 1.75 : 1.5) };
}
