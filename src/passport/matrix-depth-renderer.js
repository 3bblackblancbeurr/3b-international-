// The GPU receives a small light map, never the original photo. The shallow
// relief is decorative, not a reconstruction or biometric model of the face.
export function createMatrixDepthRenderer(canvas, levels, onReady = () => {}) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl || !Array.isArray(levels) || levels.length !== 64 * 70) return null;
  const vertexSource = `
    attribute vec4 a_cell;
    uniform float u_time;
    uniform float u_size;
    varying float v_level;
    varying float v_digit;
    varying float v_light;
    void main() {
      float x = (a_cell.x + .5 - 32.) / 32.;
      float y = (35. - a_cell.y - .5) / 35.;
      float head = smoothstep(-.82, -.55, y);
      float dome = max(0., 1. - pow(x / .94, 2.) - pow((y - .14) / 1.02, 2.));
      float nose = exp(-pow((x + .035) / .16, 2.) - pow((y + .08) / .2, 2.));
      float z = (.30 * sqrt(dome) + .045 * nose) * head;
      float yaw = sin(u_time * .49) * .065;
      float pitch = sin(u_time * .37) * .017;
      float rx = x * cos(yaw) + z * sin(yaw);
      float rz = z * cos(yaw) - x * sin(yaw);
      float ry = (y - .14) * cos(pitch) - rz * sin(pitch) + .14;
      float projection = 3. / (3. + z - rz);
      vec2 position = mix(vec2(x, y), vec2(rx, ry) * projection, head);
      gl_Position = vec4(position * .965, 0., 1.);
      gl_PointSize = u_size;
      v_level = a_cell.z;
      v_digit = mod(a_cell.w + floor(u_time * 1.1 + a_cell.y * .17), 10.);
      float lead = fract(u_time * (.12 + mod(a_cell.x, 5.) * .012) + fract(sin(a_cell.x * 13.37) * 4375.));
      float tail = fract(lead - a_cell.y / 70.);
      float stream = (1. - smoothstep(0., .23, tail)) * step(.43, fract(sin(a_cell.x * 9.17) * 312.));
      v_light = stream * .7 + (1. - smoothstep(0., .025, tail)) * stream * .55;
    }
  `;
  const fragmentSource = `
    precision mediump float;
    uniform sampler2D u_atlas;
    varying float v_level;
    varying float v_digit;
    varying float v_light;
    void main() {
      vec2 uv = vec2((floor(v_digit) + gl_PointCoord.x) / 10., gl_PointCoord.y);
      float ink = texture2D(u_atlas, uv).a;
      if (ink < .05) discard;
      vec3 blue = mix(vec3(.04,.35,.80), vec3(.38,.88,1.), v_level);
      blue = mix(blue, vec3(.72,.96,1.), min(.87, v_light));
      float brightness = .34 + v_level * .66;
      gl_FragColor = vec4(blue * brightness * (1. + v_light * .35), ink);
    }
  `;
  const shaders = [];
  let program, buffer, texture, frame = 0, disposed = false, enabled = true;
  let visible = true, elapsed = 0, lastTick = 0, lastDraw = 0;
  let resizeObserver, intersectionObserver, motionObserver, pointCount = 0;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => motion.matches || !!canvas.closest('[data-motion="reduced"]');
  const compile = (type, code) => {
    const shader = gl.createShader(type); shaders.push(shader);
    gl.shaderSource(shader, code); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Portrait 3D indisponible');
    return shader;
  };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; lastTick = 0; };
  function dispose() {
    if (disposed) return;
    disposed = true; stop();
    resizeObserver?.disconnect(); intersectionObserver?.disconnect(); motionObserver?.disconnect();
    document.removeEventListener('visibilitychange', sync);
    motion.removeEventListener('change', sync);
    canvas.removeEventListener('webglcontextlost', lost);
    if (texture) gl.deleteTexture(texture);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    for (const shader of shaders) if (shader) gl.deleteShader(shader);
  }
  function lost(event) { event.preventDefault(); dispose(); onReady(false); }
  let timeLocation, sizeLocation;
  function draw(time) {
    if (disposed) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1 / 255, 5 / 255, 11 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(timeLocation, time);
    gl.uniform1f(sizeLocation, canvas.width / 64 * 1.33);
    gl.drawArrays(gl.POINTS, 0, pointCount);
  }
  function tick(now) {
    frame = 0;
    if (disposed) return;
    if (lastTick) elapsed += Math.min(now - lastTick, 100) / 1000;
    lastTick = now;
    if (!lastDraw || now - lastDraw >= 1000 / 30) { draw(elapsed); lastDraw = now; }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (disposed) return;
    if (enabled && visible && !document.hidden && !reduced()) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else { stop(); if (reduced()) draw(0); }
  }
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Portrait 3D indisponible');
    gl.useProgram(program);
    const cells = [];
    levels.forEach((level, index) => {
      if (level > 0) cells.push(index % 64, Math.floor(index / 64), level, (index * 7) % 10);
    });
    pointCount = cells.length / 4;
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cells), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, 'a_cell');
    gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 4, gl.FLOAT, false, 0, 0);
    const atlas = document.createElement('canvas'); atlas.width = 200; atlas.height = 20;
    const pen = atlas.getContext('2d');
    if (!pen) throw new Error('Chiffres indisponibles');
    pen.font = '700 17px "Courier New", monospace'; pen.textAlign = 'center'; pen.textBaseline = 'middle'; pen.fillStyle = '#fff';
    for (let digit = 0; digit < 10; digit++) pen.fillText(String(digit), digit * 20 + 10, 10);
    texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, 'u_atlas'), 0);
    timeLocation = gl.getUniformLocation(program, 'u_time'); sizeLocation = gl.getUniformLocation(program, 'u_size');
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    function resize() {
      if (disposed) return;
      const width = Math.round(Math.min(640, Math.max(320, canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 1.5))));
      canvas.width = width; canvas.height = Math.round(width * 70 / 64);
      draw(reduced() ? 0 : elapsed);
    }
    resize(); onReady(true);
    resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
    intersectionObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
    intersectionObserver.observe(canvas);
    motionObserver = new MutationObserver(sync);
    for (let ancestor = canvas.parentElement; ancestor; ancestor = ancestor.parentElement) {
      motionObserver.observe(ancestor, { attributes: true, attributeFilter: ['data-motion'] });
    }
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    canvas.addEventListener('webglcontextlost', lost);
    sync();
    return { setAnimated(value) { enabled = !!value; sync(); }, dispose };
  } catch {
    dispose(); onReady(false); return null;
  }
}
