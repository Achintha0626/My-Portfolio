const THREE_MODULE_URL = "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

function createNetworkGeometry(THREE) {
  const nodes = [];
  const positions = [];
  const pointCount = 28;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < pointCount; index += 1) {
    const y = 1 - (index / (pointCount - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const angle = goldenAngle * index;
    const point = new THREE.Vector3(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius,
    ).multiplyScalar(1.48);
    nodes.push(point);
    positions.push(point.x, point.y, point.z);
  }

  const links = [];

  nodes.forEach((node, index) => {
    for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
      const other = nodes[otherIndex];

      if (node.distanceToSquared(other) < 0.7) {
        links.push(node.x, node.y, node.z, other.x, other.y, other.z);
      }
    }
  });

  const points = new THREE.BufferGeometry();
  points.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  const lines = new THREE.BufferGeometry();
  lines.setAttribute("position", new THREE.Float32BufferAttribute(links, 3));

  return { points, lines };
}

function createParticles(THREE) {
  const positions = [];
  const particleCount = 120;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < particleCount; index += 1) {
    const y = 1 - (index / (particleCount - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const angle = goldenAngle * index;
    const distance = 1.95 + ((index * 37) % 17) / 55;
    positions.push(
      Math.cos(angle) * radius * distance,
      y * distance,
      Math.sin(angle) * radius * distance,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

export async function mountHeroScene(canvas, { onReady }) {
  const THREE = await import(THREE_MODULE_URL);
  const panel = canvas.parentElement;

  if (!panel) {
    throw new Error("The hero scene canvas must be inside its scene panel.");
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  camera.position.set(0, 0, 6.4);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const ambient = new THREE.HemisphereLight(0xc5e2ff, 0x111722, 0.82);
  scene.add(ambient);

  const keyLight = new THREE.PointLight(0x86baff, 16, 12, 2);
  keyLight.position.set(2.4, 2.8, 3.2);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0x4e8bd0, 9, 11, 2);
  rimLight.position.set(-2.2, -1.6, -2.6);
  scene.add(rimLight);

  const objectGroup = new THREE.Group();
  scene.add(objectGroup);

  const coreGeometry = new THREE.IcosahedronGeometry(0.92, 1);
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x345b84,
    metalness: 0.72,
    roughness: 0.28,
    flatShading: true,
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  objectGroup.add(core);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.97, 1)),
    new THREE.LineBasicMaterial({
      color: 0xa8cefa,
      transparent: true,
      opacity: 0.48,
    }),
  );
  objectGroup.add(edges);

  const outerGeometry = new THREE.TorusGeometry(1.34, 0.0045, 5, 144);
  const outerRing = new THREE.Mesh(
    outerGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x75a9e3,
      transparent: true,
      opacity: 0.3,
    }),
  );
  outerRing.rotation.set(0.86, 0.22, -0.34);
  objectGroup.add(outerRing);

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.56, 0.0025, 4, 144),
    new THREE.MeshBasicMaterial({
      color: 0x58789c,
      transparent: true,
      opacity: 0.22,
    }),
  );
  innerRing.rotation.set(-0.74, 0.38, 0.6);
  objectGroup.add(innerRing);

  const network = createNetworkGeometry(THREE);
  const networkPoints = new THREE.Points(
    network.points,
    new THREE.PointsMaterial({
      color: 0xb7d7fa,
      size: 0.026,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.54,
      depthWrite: false,
    }),
  );
  objectGroup.add(networkPoints);

  const networkLines = new THREE.LineSegments(
    network.lines,
    new THREE.LineBasicMaterial({
      color: 0x8db6e4,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  );
  objectGroup.add(networkLines);

  const particleField = new THREE.Points(
    createParticles(THREE),
    new THREE.PointsMaterial({
      color: 0x8db8e8,
      size: 0.009,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  scene.add(particleField);

  let targetX = 0;
  let targetY = 0;
  let active = false;
  let hasRendered = false;

  const resizeObserver = new ResizeObserver(() => {
    const { width, height } = panel.getBoundingClientRect();

    if (width === 0 || height === 0) {
      return;
    }

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);

    if (!active) {
      renderer.render(scene, camera);
    }
  });

  resizeObserver.observe(panel);

  const handlePointerMove = (event) => {
    const bounds = panel.getBoundingClientRect();
    targetY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.34;
    targetX = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.22;
  };

  const resetPointer = () => {
    targetX = 0;
    targetY = 0;
  };

  panel.addEventListener("pointermove", handlePointerMove, { passive: true });
  panel.addEventListener("pointerleave", resetPointer);

  function render(time = 0) {
    const elapsed = time * 0.0001;
    const sway = Math.sin(elapsed * 1.2) * 0.03;

    objectGroup.rotation.x += (targetX + sway - objectGroup.rotation.x) * 0.025;
    objectGroup.rotation.y += (targetY + elapsed * 0.32 - objectGroup.rotation.y) * 0.025;
    outerRing.rotation.z = -0.32 + Math.sin(elapsed * 0.65) * 0.025;
    innerRing.rotation.x = -0.7 + Math.sin(elapsed * 0.42) * 0.02;
    particleField.rotation.y = -elapsed * 0.08;

    renderer.render(scene, camera);
  }

  function setActive(isActive) {
    if (active === isActive) {
      return;
    }

    active = isActive;
    renderer.setAnimationLoop(active ? render : null);

    if (!active && !hasRendered) {
      renderer.render(scene, camera);
    }
  }

  function dispose() {
    setActive(false);
    resizeObserver.disconnect();
    panel.removeEventListener("pointermove", handlePointerMove);
    panel.removeEventListener("pointerleave", resetPointer);
    coreGeometry.dispose();
    coreMaterial.dispose();
    edges.geometry.dispose();
    edges.material.dispose();
    outerGeometry.dispose();
    outerRing.material.dispose();
    innerRing.geometry.dispose();
    innerRing.material.dispose();
    network.points.dispose();
    network.lines.dispose();
    networkPoints.material.dispose();
    networkLines.material.dispose();
    particleField.geometry.dispose();
    particleField.material.dispose();
    renderer.dispose();
  }

  renderer.render(scene, camera);
  hasRendered = true;
  onReady();

  return { setActive, dispose };
}
