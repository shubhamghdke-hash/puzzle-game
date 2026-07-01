import * as THREE from 'three';

let scene, camera, renderer, animationId;
const particles = [];
const hearts = [];

export function startCelebration() {
  const canvas = document.getElementById('celebration-canvas');
  if (!canvas) return;

  const width = window.innerWidth;
  const height = window.innerHeight;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1a0a14, 0.012);

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 0, 30);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x1a0a14, 1);

  createLights();
  createHeartParticles();
  createFloatingHearts();
  createConfetti();
  createGlowOrbs();

  window.addEventListener('resize', onResize);
  animate();
}

function createLights() {
  const ambient = new THREE.AmbientLight(0xffc0d0, 0.4);
  scene.add(ambient);

  const pink = new THREE.PointLight(0xff6b9d, 2, 80);
  pink.position.set(-15, 10, 20);
  scene.add(pink);

  const gold = new THREE.PointLight(0xffd700, 1.5, 60);
  gold.position.set(15, -5, 15);
  scene.add(gold);

  const soft = new THREE.PointLight(0xe8a0b8, 1, 50);
  soft.position.set(0, 15, 10);
  scene.add(soft);
}

function createHeartParticles() {
  const count = 400;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const velocities = [];

  const palette = [
    new THREE.Color(0xff6b9d),
    new THREE.Color(0xe8a0b8),
    new THREE.Color(0xffc0d0),
    new THREE.Color(0xffd700),
    new THREE.Color(0xffffff),
  ];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30;

    const color = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = Math.random() * 3 + 1;

    velocities.push({
      x: (Math.random() - 0.5) * 0.04,
      y: Math.random() * 0.06 + 0.02,
      z: (Math.random() - 0.5) * 0.02,
      phase: Math.random() * Math.PI * 2,
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float time;
      void main() {
        vColor = color;
        vec3 pos = position;
        pos.x += sin(time * 0.5 + position.y * 0.1) * 0.3;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.3, 0.5, d);
        gl_FragColor = vec4(vColor, alpha * 0.85);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.userData.velocities = velocities;
  scene.add(points);
  particles.push(points);
}

function createHeartShape() {
  const shape = new THREE.Shape();
  const x = 0, y = 0;
  shape.moveTo(x, y + 0.5);
  shape.bezierCurveTo(x, y + 0.5, x - 0.5, y, x - 0.5, y - 0.25);
  shape.bezierCurveTo(x - 0.5, y - 0.55, x, y - 0.75, x, y - 1);
  shape.bezierCurveTo(x, y - 0.75, x + 0.5, y - 0.55, x + 0.5, y - 0.25);
  shape.bezierCurveTo(x + 0.5, y, x, y + 0.5, x, y + 0.5);
  return shape;
}

function createFloatingHearts() {
  const heartShape = createHeartShape();
  const extrudeSettings = { depth: 0.15, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 };
  const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
  geometry.center();

  const colors = [0xff6b9d, 0xe8a0b8, 0xff4081, 0xffd700, 0xff85a2];

  for (let i = 0; i < 25; i++) {
    const material = new THREE.MeshPhongMaterial({
      color: colors[i % colors.length],
      emissive: colors[i % colors.length],
      emissiveIntensity: 0.15,
      shininess: 80,
      transparent: true,
      opacity: 0.9,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 25 - 5,
      (Math.random() - 0.5) * 20
    );
    const scale = Math.random() * 0.4 + 0.2;
    mesh.scale.set(scale, scale, scale);
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    mesh.userData = {
      rotSpeed: {
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.01,
      },
      floatSpeed: Math.random() * 0.02 + 0.01,
      floatPhase: Math.random() * Math.PI * 2,
      baseY: mesh.position.y,
    };

    scene.add(mesh);
    hearts.push(mesh);
  }
}

function createConfetti() {
  const count = 150;
  const geometry = new THREE.PlaneGeometry(0.3, 0.15);
  const colors = [0xff6b9d, 0xffd700, 0xe8a0b8, 0xffffff, 0xff4081, 0xc76b8a];

  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (Math.random() - 0.5) * 50,
      Math.random() * 30 + 10,
      (Math.random() - 0.5) * 20
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

    mesh.userData = {
      velocity: {
        x: (Math.random() - 0.5) * 0.08,
        y: -(Math.random() * 0.12 + 0.05),
        z: (Math.random() - 0.5) * 0.04,
      },
      rotSpeed: {
        x: (Math.random() - 0.5) * 0.1,
        y: (Math.random() - 0.5) * 0.1,
        z: (Math.random() - 0.5) * 0.1,
      },
    };

    scene.add(mesh);
    particles.push(mesh);
  }
}

function createGlowOrbs() {
  const orbGeometry = new THREE.SphereGeometry(1, 16, 16);

  for (let i = 0; i < 8; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? 0xff6b9d : 0xffd700,
      transparent: true,
      opacity: 0.15,
    });

    const orb = new THREE.Mesh(orbGeometry, material);
    const angle = (i / 8) * Math.PI * 2;
    const radius = 12 + Math.random() * 5;
    orb.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.5,
      -5 + Math.random() * 10
    );
    const scale = Math.random() * 2 + 1;
    orb.scale.set(scale, scale, scale);

    orb.userData = { angle, radius, speed: 0.003 + Math.random() * 0.002 };
    scene.add(orb);
    particles.push(orb);
  }
}

let time = 0;

function animate() {
  animationId = requestAnimationFrame(animate);
  time += 0.016;

  camera.position.x = Math.sin(time * 0.15) * 2;
  camera.position.y = Math.cos(time * 0.1) * 1;
  camera.lookAt(0, 0, 0);

  particles.forEach((obj) => {
    if (obj.isPoints) {
      obj.material.uniforms.time.value = time;
      const positions = obj.geometry.attributes.position.array;
      const velocities = obj.userData.velocities;

      for (let i = 0; i < velocities.length; i++) {
        positions[i * 3] += velocities[i].x + Math.sin(time + velocities[i].phase) * 0.01;
        positions[i * 3 + 1] += velocities[i].y;
        positions[i * 3 + 2] += velocities[i].z;

        if (positions[i * 3 + 1] > 25) {
          positions[i * 3 + 1] = -20;
          positions[i * 3] = (Math.random() - 0.5) * 60;
        }
      }
      obj.geometry.attributes.position.needsUpdate = true;
    } else if (obj.userData.velocity) {
      obj.position.x += obj.userData.velocity.x;
      obj.position.y += obj.userData.velocity.y;
      obj.position.z += obj.userData.velocity.z;
      obj.rotation.x += obj.userData.rotSpeed.x;
      obj.rotation.y += obj.userData.rotSpeed.y;
      obj.rotation.z += obj.userData.rotSpeed.z;

      if (obj.position.y < -20) {
        obj.position.y = 25;
        obj.position.x = (Math.random() - 0.5) * 50;
      }
    } else if (obj.userData.angle !== undefined) {
      obj.userData.angle += obj.userData.speed;
      obj.position.x = Math.cos(obj.userData.angle) * obj.userData.radius;
      obj.position.z = Math.sin(obj.userData.angle) * obj.userData.radius * 0.5;
    }
  });

  hearts.forEach((heart) => {
    heart.rotation.x += heart.userData.rotSpeed.x;
    heart.rotation.y += heart.userData.rotSpeed.y;
    heart.rotation.z += heart.userData.rotSpeed.z;
    heart.position.y = heart.userData.baseY + Math.sin(time * heart.userData.floatSpeed + heart.userData.floatPhase) * 2;
  });

  renderer.render(scene, camera);
}

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

export function stopCelebration() {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onResize);
  if (renderer) renderer.dispose();
}
