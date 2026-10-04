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
export function companionArtFrame({ action = 'idle', time = 0, reduced = false, facing = 1, ready = {} } = {}) {
  const kind = companionPoseAction(action);
  const t = reduced ? 0 : clock(time);
  let atlas = 'actions';
  let index = ACTION_FRAMES[kind];
  if (kind === 'land' && t > .68) return originalCompanionFrame();
  if (kind === 'walk') { atlas = 'walk'; index = (facing < 0 ? 4 : 0) + Math.floor(t * 7) % 4; }
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
  return { source:sheet.src, atlas, index, sourceWidth:sheet.width, sourceHeight:sheet.height,
    crop:[x,y,width,height], target:[(1024-drawWidth)/2,(hanging ? 1490 : 1529)-drawHeight,drawWidth,drawHeight] };
}

/** Bounded secondary motion complements the pose art; lettering is never mirrored. */
export function computeCoutureMotion({ action = 'idle', time = 0, reduced = false, speaking = false, facing = 1, gazeX = 0, gazeY = 0 } = {}) {
  const kind = companionPoseAction(action);
  const t = reduced ? 0 : clock(time);
  const motion = reduced ? 0 : 1;
  const breath = Math.sin(t * 1.55) * motion;
  const lookX = reduced ? 0 : clamp(gazeX,-1,1);
  const lookY = reduced ? 0 : clamp(gazeY,-1,1);
  let x = lookX * .34;
  let y = -breath * .22;
  let rotation = (Math.sin(t * .53) * .28 + lookX * .5) * motion;
  let scaleX = 1;
  let scaleY = 1 + breath * .0025;
  let shadowScale = 1 - Math.max(0,breath) * .035;
  let brightness = 1;
  const beat = Math.sin(t * 7.85) * motion;
  if (kind === 'walk') { y -= Math.abs(beat) * .4; rotation = beat * .5; shadowScale = 1-Math.abs(beat)*.08; }
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
  const voicePulse = speaking ? .25 + Math.abs(Math.sin(t*8.7)) * .25 : 0;
  return { x,y,rotation,scaleX,scaleY,shadowScale,brightness,
    yaw:(facing < 0 ? -1 : 1)*1.3*motion+lookX*2, pitch:lookY*-.75,
    core:(kind === 'sleep' ? .10 : .22)+(breath+1)*.055+voicePulse,
    eye:(kind === 'sleep' ? .03 : .12)+(speaking ? .16 : 0),
    glint:Math.pow(Math.max(0,Math.sin(t*.72-1.8)),18)*.5*motion,
  };
}

export function coutureFramePolicy({ active = true, visible = true, reduced = false, action = 'idle', size = 112 } = {}) {
  return { animate:Boolean(active && visible && !reduced),
    fps:['walk','dance','breakdance','celebrate'].includes(companionPoseAction(action)) ? 30 : size > 160 ? 24 : 20 };
}
