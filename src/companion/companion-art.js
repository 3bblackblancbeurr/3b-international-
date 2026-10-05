import { companionPoseAction } from './companion-pose.js';

/** Original character artwork remains the reference and the universal fallback. */
export const COMPANION_ORIGINAL_ART = '/companion/robot-streetwear-v1.png';
export const COMPANION_ART_VIEW = Object.freeze({ width: 1024, height: 1536 });

// Measured alpha crops: authored poses do not fit a mechanical contact-sheet grid.
// A shared scale preserves anatomical size when the character sits or crouches.
export const COMPANION_ART_ATLASES = Object.freeze({
  actions: {
    src: '/companion/robot-couture-actions-v2.png', width: 1448, height: 1086, scale: 2.8,
    frames: [[52,6,276,542],[415,5,276,542],[726,144,346,387],[1131,3,268,547],
      [35,553,329,506],[387,544,325,518],[792,536,211,517],[1076,686,360,368]],
  },
  walk: {
    src: '/companion/robot-couture-walk-directional-v3.png', width: 1448, height: 1086, scale: 2.96,
    frames: [[11,5,363,516],[408,5,238,516],[734,5,358,517],[1156,5,263,517],
      [11,536,344,515],[383,537,304,513],[727,537,355,517],[1136,536,296,519]],
    // Head mass, measured inside each alpha crop. Bounding-box centres move as
    // the hands and shoes swing; using those centres made the head jump sideways.
    anchors: [187.2,128.4,178.5,146.7,167.1,145.4,170.9,109.3],
  },
  dance: {
    src: '/companion/robot-couture-dance-v2.png', width: 1448, height: 1086, scale: 2.8,
    frames: [[21,48,389,510],[425,81,280,473],[755,55,343,502],[1179,29,261,532],
      [48,662,266,358],[352,661,391,364],[745,602,410,407],[1179,613,240,411]],
  },
});

const ACTION_FRAMES = Object.freeze({
  hello:0, wave:0, wake:0, notification:0, highfive:1, rest:2, sit:2, sleep:2,
  think:3, curious:3, focus:3, secret:3, dance:4, breakdance:4, celebrate:4,
  pocket:5, hologram:5, reward:5, hang:6, fall:6, land:7,
});
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, finite(value)));
const clock = time => Math.max(0, finite(time)) % 100000;

export function companionArtSources(action) {
  const kind = companionPoseAction(action);
  if (kind === 'walk') return ['walk'];
  if (['dance', 'breakdance', 'celebrate'].includes(kind)) return ['actions', 'dance'];
  return Object.hasOwn(ACTION_FRAMES, kind) ? ['actions'] : [];
}

export function originalCompanionFrame() {
  return { source:COMPANION_ORIGINAL_ART, atlas:'original', index:0,
    sourceWidth:1024, sourceHeight:1536, crop:[0,0,1024,1536], target:[0,0,1024,1536] };
}

/** A pose never becomes a primitive mannequin when an image or network fails. */
export function companionArtFrame({ action = 'idle', time = 0, reduced = false, facing = 1, ready = {}, gait } = {}) {
  const kind = companionPoseAction(action);
  const t = reduced ? 0 : clock(time);
  let atlas = 'actions';
  let index = ACTION_FRAMES[kind];
  if (kind === 'land' && t > .68) return originalCompanionFrame();
  if (kind === 'walk') {
    atlas = 'walk';
    const phase = reduced ? 0 : Number.isFinite(gait) ? Math.max(0,gait)*4 : t*7;
    index = (facing < 0 ? 4 : 0) + Math.floor(phase) % 4;
  }
  if (['dance', 'celebrate', 'breakdance'].includes(kind) && ready.dance) {
    atlas = 'dance';
    index = (kind === 'breakdance' ? 4 : 0) + Math.floor(t * (kind === 'breakdance' ? 4 : 5)) % 4;
  }
  if (index == null || !ready[atlas]) return originalCompanionFrame();
  const sheet = COMPANION_ART_ATLASES[atlas];
  const [x,y,width,height] = sheet.frames[index];
  // The stage anchors hanging hands at 20% of its height; retain that contract.
  const hanging = atlas === 'actions' && index === 6;
  const standing = atlas === 'walk' || (atlas === 'actions' && [0,1,3].includes(index));
  const scale = hanging ? 2.30 : standing ? 1512 / (height - 6) : sheet.scale;
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  const left = atlas === 'walk' ? (facing < 0 ? 482 : 542)-sheet.anchors[index]*scale : (1024-drawWidth)/2;
  return { source:sheet.src, atlas, index, sourceWidth:sheet.width, sourceHeight:sheet.height,
    crop:[x,y,width,height], target:[left,(hanging ? 1490 : 1529)-drawHeight,drawWidth,drawHeight] };
}

/** One gait cycle follows actual travel; dragging never advances the stage odometer. */
export function companionGaitPhase(locomotion, size = 112) {
  if (!locomotion || !Number.isFinite(locomotion.distance)) return undefined;
  return Math.max(0,locomotion.distance)/Math.max(28,finite(size,112)*.5);
}

export function coutureTransitionDuration(from, to, { reduced = false, active = true } = {}) {
  if (reduced || !active || !from || !to || (from.atlas === to.atlas && from.index === to.index)) return 0;
  return from.atlas === to.atlas && ['walk','dance'].includes(to.atlas) ? .072 : .16;
}

// Contiguous bands form a small continuous 2D rig. Each shared boundary has the
// same position in both adjacent bands, so the hood can follow a gaze while the
// shoes remain planted. No image is replaced, recoloured, or mirrored.
export const COUTURE_JOINT_BANDS = Object.freeze([0,192,344,544,768,976,1192,1360,1536]);
const HEAD_WEIGHTS = [1,1,.54,.16,.025,0,0,0,0];
const TORSO_WEIGHTS = [0,0,.30,.85,.80,.24,0,0,0];
export function coutureJointMatrices({ headDrift = 0, headLift = 0, torsoDrift = 0, torsoLift = 0 } = {}, strength = 1) {
  const weight = clamp(strength,0,1);
  const points = COUTURE_JOINT_BANDS.map((y,index) => ({ y,
    dx:(clamp(headDrift,-24,24)*HEAD_WEIGHTS[index]+clamp(torsoDrift,-12,12)*TORSO_WEIGHTS[index])*weight,
    dy:(clamp(headLift,-12,12)*HEAD_WEIGHTS[index]+clamp(torsoLift,-12,12)*TORSO_WEIGHTS[index])*weight,
  }));
  return points.slice(0,-1).map((point,index) => {
    const next = points[index+1];
    const shear = (next.dx-point.dx)/(next.y-point.y);
    const stretch = (next.dy-point.dy)/(next.y-point.y);
    return [1,0,shear,1+stretch,point.dx-shear*point.y,point.dy-stretch*point.y];
  });
}

/** Bounded secondary motion complements the pose art; lettering is never mirrored. */
export function computeCoutureMotion({ action = 'idle', time = 0, motionTime = time, gait, reduced = false, speaking = false, facing = 1, gazeX = 0, gazeY = 0 } = {}) {
  const kind = companionPoseAction(action);
  const t = reduced ? 0 : clock(time);
  const alive = reduced ? 0 : clock(motionTime);
  const motion = reduced ? 0 : 1;
  const breath = Math.sin(alive * 1.55) * motion;
  const lookX = reduced ? 0 : clamp(gazeX,-1,1);
  const lookY = reduced ? 0 : clamp(gazeY,-1,1);
  let x = lookX * .34;
  let y = -breath * .22;
  let rotation = (Math.sin(alive * .53) * .28 + lookX * .5) * motion;
  let scaleX = 1;
  let scaleY = 1 + breath * .0025;
  let shadowScale = 1 - Math.max(0,breath) * .035;
  let brightness = 1;
  const beat = Math.sin(t * 7.85) * motion;
  if (kind === 'walk') {
    const step = Math.sin((Number.isFinite(gait) ? gait : t*1.75)*Math.PI*2)*motion;
    y -= Math.abs(step)*.36; rotation = step*.38; shadowScale = 1-Math.abs(step)*.06;
  }
  if (['dance','breakdance','celebrate'].includes(kind)) {
    x += Math.sin(t * 3.92) * 1.5 * motion; y -= Math.abs(beat) * .8;
    rotation += Math.sin(t * 3.92) * 2.1 * motion; shadowScale -= Math.abs(beat) * .1;
  }
  if (kind === 'hang') { rotation = Math.sin(t*2)*2.1*motion; x = Math.sin(t*2)*.35*motion; }
  if (kind === 'fall') rotation += Math.sin(t*6)*2*motion;
  if (kind === 'land') { const settle = Math.max(0,1-t/.7)*motion; scaleY -= settle*.035; scaleX += settle*.018; }
  if (['hello','wave','highfive'].includes(kind)) { rotation -= Math.sin(t*2.5)*.9*motion; y -= Math.max(0,Math.sin(t*2))*.35*motion; }
  if (kind === 'sleep') brightness = .78;
  if (kind === 'focus') brightness = .94;
  const voicePulse = speaking ? .25 + Math.abs(Math.sin(alive*8.7)) * .25 : 0;
  return { x,y,rotation,scaleX,scaleY,shadowScale,brightness,
    shadowOpacity:['hang','fall'].includes(kind) ? .12 : 1,
    headDrift:lookX*12+Math.sin(alive*.63)*3.2*motion,
    headLift:lookY*4+(speaking ? Math.sin(alive*6.8)*2.4 : -breath*2)*motion,
    torsoDrift:Math.sin(alive*.86)*2.2*motion,
    torsoLift:-breath*4.2,
    yaw:(facing < 0 ? -1 : 1)*1.3*motion+lookX*2, pitch:lookY*-.75,
    core:(kind === 'sleep' ? .10 : .22)+(breath+1)*.055+voicePulse,
    eye:(kind === 'sleep' ? .03 : .12)+(speaking ? .16 : 0),
    glint:Math.pow(Math.max(0,Math.sin(alive*.72-1.8)),18)*.5*motion,
  };
}

export function coutureFramePolicy({ active = true, visible = true, reduced = false, action = 'idle', speaking = false, size = 112 } = {}) {
  return { animate:Boolean(active && visible && !reduced),
    fps:['walk','dance','breakdance','celebrate','hang','fall','land','hello','wave','highfive'].includes(companionPoseAction(action)) || speaking ? 60 : size > 160 ? 30 : 24 };
}
