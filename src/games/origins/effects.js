import * as THREE from 'three';
export function createOriginsEffects(scene, count = 420) {
  const positions = new Float32Array(count * 3),
    colors = new Float32Array(count * 3),
    sizes = new Float32Array(count),
    life = new Float32Array(count),
    maximum = new Float32Array(count),
    velocity = new Float32Array(count * 3),
    geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: { pixelRatio: { value: 1 } },
      vertexShader:
        'attribute float size; varying vec3 vColor; uniform float pixelRatio; void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*pixelRatio*220./max(1.,-mv.z),0.,22.);}',
      fragmentShader:
        'varying vec3 vColor; void main(){float d=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-d),1.8);gl_FragColor=vec4(vColor,a*.82);}',
    }),
    points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  let cursor = 0,
    limit = count;
  const tint = new THREE.Color(),
    rings = [];
  const ringGeometry = new THREE.RingGeometry(0.97, 1, 72);
  for (let i = 0; i < 12; i++) {
    const mesh = new THREE.Mesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({
        color: '#9de9ff',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    scene.add(mesh);
    rings.push({ mesh, life: 0, total: 1, radius: 1 });
  }
  function burst(x, z, n, color = '#c5e8f2', power = 1) {
    tint.set(color);
    for (let j = 0; j < n; j++) {
      const i = cursor++ % limit,
        a = Math.random() * Math.PI * 2,
        s = (0.8 + Math.random() * 3) * power;
      positions[i * 3] = x;
      positions[i * 3 + 1] = 0.3 + Math.random() * 1.7;
      positions[i * 3 + 2] = z;
      velocity[i * 3] = Math.sin(a) * s;
      velocity[i * 3 + 1] = (0.8 + Math.random() * 2.7) * power;
      velocity[i * 3 + 2] = Math.cos(a) * s;
      life[i] = maximum[i] = 0.25 + Math.random() * 0.6;
      sizes[i] = 0.12 + Math.random() * 0.16;
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
    }
    geometry.attributes.color.needsUpdate = true;
  }
  function wave(x, z, radius = 4, color = '#65c4ff', duration = 0.55) {
    const r = rings.find((r) => r.life <= 0) || rings[0];
    r.life = r.total = duration;
    r.radius = radius;
    r.mesh.position.set(x, 0.08, z);
    r.mesh.material.color.set(color);
    r.mesh.visible = true;
  }
  return {
    event(e) {
      const intense = ['matrix', 'gate-beam', 'boss-phase'].includes(e.type),
        gold = ['seal', 'cache', 'rune', 'pickup', 'ready'].includes(e.type);
      if (
        [
          'impact',
          'defeat',
          'perfect',
          'matrix',
          'seal',
          'cache',
          'rune',
          'pickup',
          'ready',
          'gate-beam',
          'boss-phase',
          'stone',
        ].includes(e.type)
      )
        burst(
          e.x,
          e.z,
          intense ? 70 : e.type === 'impact' ? 18 : 28,
          gold ? '#ecd4a2' : e.type === 'impact' ? '#dbebf2' : '#58c6ff',
          intense ? 2 : 1,
        );
      if (['matrix', 'perfect', 'seal', 'boss-phase', 'gate-beam'].includes(e.type))
        wave(
          e.x,
          e.z,
          e.type === 'matrix' ? 8 : intense ? 12 : 3,
          gold ? '#ead1a0' : '#62caff',
          intense ? 0.8 : 0.5,
        );
    },
    update(dt) {
      for (let i = 0; i < count; i++) {
        if (life[i] <= 0) {
          sizes[i] = 0;
          continue;
        }
        life[i] -= dt;
        positions[i * 3] += velocity[i * 3] * dt;
        positions[i * 3 + 1] += velocity[i * 3 + 1] * dt;
        positions[i * 3 + 2] += velocity[i * 3 + 2] * dt;
        velocity[i * 3 + 1] -= 3 * dt;
        sizes[i] = Math.max(0, life[i] / maximum[i]) * 0.21;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.size.needsUpdate = true;
      for (const r of rings) {
        r.life -= dt;
        if (r.life <= 0) {
          r.mesh.visible = false;
          continue;
        }
        const t = 1 - r.life / r.total;
        r.mesh.scale.setScalar(0.4 + r.radius * (1 - (1 - t) ** 3));
        r.mesh.material.opacity = (1 - t) * 0.75;
      }
    },
    setQuality(low, dpr) {
      limit = low ? 160 : count;
      material.uniforms.pixelRatio.value = dpr;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      ringGeometry.dispose();
      points.removeFromParent();
      for (const r of rings) {
        r.mesh.material.dispose();
        r.mesh.removeFromParent();
      }
    },
  };
}
