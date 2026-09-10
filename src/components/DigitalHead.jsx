import { useEffect, useRef, useState } from "react";
import {portraitMotion} from './portrait-motion.js';

// A curved mesh gives the existing digital portrait real depth when it turns.
// Texture coordinates always point into the original passport artwork.
const HEAD_PATH = "M1158 172 C1112 172 1089 203 1089 238 C1080 239 1080 254 1085 269 C1087 281 1094 291 1102 293 C1109 312 1121 328 1131 335 L1131 353 C1120 367 1103 374 1080 384 L1238 384 C1218 373 1196 369 1186 354 L1186 335 C1200 324 1212 309 1218 292 C1228 286 1232 270 1232 255 C1233 244 1228 238 1224 238 C1223 201 1202 172 1158 172 Z";
const VERTEX_SHADER = `
  attribute vec3 position;
  attribute vec2 uv;
  uniform vec3 rotation;
  uniform float breath;
  varying vec2 textureUv;
  varying float depth;
  void main() {
    float cy = cos(rotation.x), sy = sin(rotation.x);
    float cp = cos(rotation.y), sp = sin(rotation.y);
    float cr = cos(rotation.z), sr = sin(rotation.z);
    vec3 p = vec3(position.x * cy + position.z * sy, position.y, -position.x * sy + position.z * cy);
    p = vec3(p.x, p.y * cp - p.z * sp, p.y * sp + p.z * cp);
    p.xy = vec2(p.x * cr - p.y * sr, p.x * sr + p.y * cr);
    p.xy *= 4.0 / (4.0 - p.z + position.z);
    float mobility = smoothstep(-1.0, -.25, position.y);
    p = mix(position, p, mobility);
    p.y += breath * mobility;
    gl_Position = vec4(p.x * 200.0 / 197.0 - 3.0 / 197.0, p.y * 200.0 / 216.0 - 16.0 / 216.0, 0.0, 1.0);
    textureUv = uv;
    depth = position.z;
  }
`;
const FRAGMENT_SHADER = `
  precision mediump float;
  uniform sampler2D portrait;
  uniform float blink;
  uniform vec2 gaze;
  varying vec2 textureUv;
  varying float depth;
  void main() {
    vec2 leftEye = textureUv - vec2(68.0 / 197.0, 103.0 / 216.0);
    vec2 rightEye = textureUv - vec2(124.0 / 197.0, 103.0 / 216.0);
    float eye = 1.0 - smoothstep(0.55, 1.0, min(length(leftEye / vec2(.078, .035)), length(rightEye / vec2(.078, .035))));
    vec4 pixel = texture2D(portrait, textureUv - gaze * eye);
    pixel.rgb *= .97 + .08 * depth;
    pixel.rgb = mix(pixel.rgb, vec3(.002, .055, .11) * pixel.a, blink * eye);
    float lid = (1.0 - smoothstep(.001, .004, abs(leftEye.y))) * (1.0 - smoothstep(.04, .075, min(abs(leftEye.x), abs(rightEye.x))));
    pixel.rgb += vec3(.04, .32, .45) * lid * blink * pixel.a;
    gl_FragColor = pixel;
  }
`;

function makeMesh() {
  const vertices = [], indices = [];
  const columns = 40, rows = 44;
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const u = column / columns, v = row / rows;
      const px = 1061 + u * 197, py = 166 + v * 216;
      const fx = (px - 1158) / 74, fy = (py - 264) / 100;
      const skull = Math.sqrt(Math.max(0, 1 - fx * fx - fy * fy)) * .46;
      const nose = .22 * Math.exp(-Math.pow(fx / .22, 2) - Math.pow((py - 292) / 20, 2));
      const cheeks = .045 * Math.exp(-Math.pow((py - 286) / 30, 2));
      const neck = py > 333 ? -.12 * Math.min(1, (py - 333) / 35) : 0;
      vertices.push((px - 1158) / 100, (282 - py) / 100, skull + nose + cheeks + neck, u, v);
      if (row < rows && column < columns) {
        const start = row * (columns + 1) + column;
        indices.push(start, start + columns + 1, start + 1, start + 1, start + columns + 1, start + columns + 2);
      }
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

export default function DigitalHead({ animated }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [contextVersion, setContextVersion] = useState(0);
  useEffect(() => {
    setReady(false);
    if (!animated) return;
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: true, powerPreference: "low-power" });
    if (!gl) return;
    let disposed = false, frame = 0, visible = true, loaded = false;
    const resources = [];
    const shader = (type, source) => {
      const result = gl.createShader(type);
      gl.shaderSource(result, source); gl.compileShader(result);
      resources.push(() => gl.deleteShader(result));
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error("Portrait shader unavailable");
      return result;
    };
    let program, vertexBuffer, indexBuffer, texture, mesh;
    try {
      program = gl.createProgram(); resources.push(() => gl.deleteProgram(program));
      gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX_SHADER));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Portrait program unavailable");
      gl.useProgram(program);
      mesh = makeMesh();
      vertexBuffer = gl.createBuffer(); indexBuffer = gl.createBuffer(); texture = gl.createTexture();
      resources.push(() => gl.deleteBuffer(vertexBuffer), () => gl.deleteBuffer(indexBuffer), () => gl.deleteTexture(texture));
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "position"), uv = gl.getAttribLocation(program, "uv");
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
    } catch {
      resources.forEach(release => release());
      return;
    }
    const rotation = gl.getUniformLocation(program, "rotation");
    const breath = gl.getUniformLocation(program, "breath");
    const blink = gl.getUniformLocation(program, "blink");
    const gaze = gl.getUniformLocation(program, "gaze");
    let elapsed = 0, previous = 0, lastDraw = 0;
    let nextBlink = 3.2, blinkStart = -10, doubleBlink = false, nextGaze = 1.8, gazeX = 0, gazeY = 0, targetX = 0, targetY = 0;
    function draw(now) {
      if (disposed || !loaded || !visible || document.hidden) { frame = 0; previous = 0; return; }
      frame = requestAnimationFrame(draw);
      if (now - lastDraw < 30) return; // Keep the small portrait at about 30 fps.
      lastDraw = now;
      const dt = previous ? Math.min((now - previous) / 1000, .1) : 0;
      previous = now; elapsed += dt;
      if (elapsed >= nextBlink) { blinkStart = elapsed; doubleBlink = Math.random() < .22; nextBlink = elapsed + 3.4 + Math.random() * 3.1; }
      const sinceBlink=elapsed-blinkStart;
      const blinkProgress = (doubleBlink && sinceBlink>.27 ? sinceBlink-.27 : sinceBlink) / .19;
      const closing = blinkProgress > 0 && blinkProgress < 1 ? Math.sin(blinkProgress * Math.PI) : 0;
      if (elapsed >= nextGaze) { targetX = (Math.random() - .5) * .012; targetY = (Math.random() - .5) * .005; nextGaze = elapsed + 1.5 + Math.random() * 2.8; }
      const gazeEase = 1 - Math.exp(-dt * 22);
      gazeX += (targetX - gazeX) * gazeEase; gazeY += (targetY - gazeY) * gazeEase;
      const {yaw,pitch,roll,breath:breathing} = portraitMotion(elapsed);
      gl.clearColor(.001, .018, .062, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform3f(rotation, yaw, pitch, roll); gl.uniform1f(breath, breathing);
      gl.uniform1f(blink, closing); gl.uniform2f(gaze, gazeX, gazeY);
      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    }
    function start() { if (!frame && loaded && visible && !document.hidden && !disposed) frame = requestAnimationFrame(draw); }
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; start(); });
    observer.observe(canvas);
    const resize = new ResizeObserver(() => {
      const bounds = canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * ratio)); canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
    });
    resize.observe(canvas);
    document.addEventListener("visibilitychange", start);
    const image = new Image();
    image.onload = () => {
      if (disposed) return;
      const source = document.createElement("canvas"); source.width = 197; source.height = 216;
      const context = source.getContext("2d");
      context.translate(-1061, -166); context.clip(new Path2D(HEAD_PATH)); context.drawImage(image, 0, 0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1i(gl.getUniformLocation(program, "portrait"), 0);
      loaded = true; setReady(true); start();
    };
    image.src = "/passport-digital-3bv2.png";
    const lost = event => { event.preventDefault(); setReady(false); loaded = false; cancelAnimationFrame(frame); frame = 0; };
    const restored = () => setContextVersion(value => value + 1);
    canvas.addEventListener("webglcontextlost", lost); canvas.addEventListener("webglcontextrestored", restored);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect();
      document.removeEventListener("visibilitychange", start);
      canvas.removeEventListener("webglcontextlost", lost); canvas.removeEventListener("webglcontextrestored", restored);
      image.onload = null; resources.forEach(release => release());
    };
  }, [animated, contextVersion]);
  return <canvas ref={canvasRef} className="passport-head-canvas" data-ready={ready} aria-hidden="true" />;
}

