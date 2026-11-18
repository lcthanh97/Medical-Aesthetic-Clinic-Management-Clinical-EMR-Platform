'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const EPIDERMIS_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uHoverIntensity;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying float vDisplacement;
  varying float vRipple;

  // Fast analytical 3D wave displacement (Zero heavy texture/loop overhead)
  float bioWave(vec3 p, float t) {
    float w1 = sin(p.x * 1.65 + t * 0.65) * cos(p.y * 1.45 - t * 0.52);
    float w2 = sin(p.y * 2.15 + p.z * 1.75 + t * 0.45) * 0.5;
    float w3 = cos(p.z * 2.4 - p.x * 1.9 + t * 0.8) * 0.28;
    return (w1 + w2 + w3) * 0.55;
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);

    float wave = bioWave(position, uTime);

    vec3 mouseTarget = vec3(uMouse.x * 1.75, uMouse.y * 1.35, 1.15);
    float distToCursor = distance(position, mouseTarget);
    float rippleWave = sin(distToCursor * 5.0 - uTime * 3.8) * exp(-distToCursor * 1.45) * uHoverIntensity;

    float totalDisplacement = wave * 0.22 + rippleWave * 0.14;
    vDisplacement = totalDisplacement;
    vRipple = rippleWave;

    vec3 displacedPosition = position + normal * totalDisplacement;
    vPosition = displacedPosition;

    vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
    vWorldPosition = worldPosition.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const EPIDERMIS_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying float vDisplacement;
  varying float vRipple;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 normal = normalize(vNormal);

    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.4);

    // Crisp Bio-Tech Clinical Palette
    vec3 porcelainWhite = vec3(0.976, 0.984, 0.992); // #F8FAFC
    vec3 clinicalSky    = vec3(0.878, 0.949, 0.996); // #E0F2FE
    vec3 bioTeal        = vec3(0.051, 0.580, 0.533); // #0D9488
    vec3 clinicalBlue   = vec3(0.008, 0.518, 0.780); // #0284C7

    // Fast analytical hexagonal cellular lattice
    float cellGrid = abs(sin(vPosition.x * 6.5 + uTime * 0.2) * cos(vPosition.y * 6.5 - uTime * 0.18));
    float membraneEdge = smoothstep(0.62, 0.88, cellGrid);

    float waveMix = smoothstep(-0.22, 0.26, vDisplacement);
    vec3 baseColor = mix(porcelainWhite, clinicalSky, waveMix);

    vec3 ridgeColor = mix(bioTeal, clinicalBlue, 0.45);
    baseColor = mix(baseColor, ridgeColor, membraneEdge * 0.16 + fresnel * 0.32);

    float rippleGlow = clamp(abs(vRipple) * 3.2, 0.0, 1.0);
    baseColor = mix(baseColor, bioTeal, rippleGlow * 0.28);

    float alpha = clamp(0.24 + fresnel * 0.28 + membraneEdge * 0.08 + rippleGlow * 0.12, 0.18, 0.62);

    gl_FragColor = vec4(baseColor, alpha);
  }
`;

export function DermaCanvas3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      0.1,
      50
    );
    camera.position.set(0, 0, 5.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isMobile,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: false,
      });
    } catch {
      return;
    }

    // Cap pixelRatio at 1.25 for locked 60fps with zero GPU lag
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const rootGroup = new THREE.Group();
    rootGroup.position.set(window.innerWidth >= 1024 ? 0.55 : 0, 0.05, 0);
    scene.add(rootGroup);

    // 1. Lightweight Smooth Organic Epidermis Sphere
    const sphereDetail = isMobile ? 16 : 28;
    const epidermisGeo = new THREE.IcosahedronGeometry(1.68, sphereDetail);
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uHoverIntensity: { value: 0.3 },
    };

    const epidermisMat = new THREE.ShaderMaterial({
      vertexShader: EPIDERMIS_VERTEX_SHADER,
      fragmentShader: EPIDERMIS_FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthWrite: false,
    });

    const epidermisMesh = new THREE.Mesh(epidermisGeo, epidermisMat);
    rootGroup.add(epidermisMesh);

    // 2. Crisp Dermal Collagen Wireframe Lattice
    const collagenGeo = new THREE.IcosahedronGeometry(1.92, isMobile ? 2 : 3);
    const collagenMat = new THREE.MeshBasicMaterial({
      color: 0x0d9488,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });
    const collagenMesh = new THREE.Mesh(collagenGeo, collagenMat);
    rootGroup.add(collagenMesh);

    // 2b. Dual Bio-Orbital Hologram Rings around the Cellular Sphere
    const bioRingA = new THREE.Mesh(
      new THREE.TorusGeometry(2.28, 0.014, 10, 80),
      new THREE.MeshBasicMaterial({ color: 0x0d9488, transparent: true, opacity: 0.22 })
    );
    bioRingA.rotation.set(1.1, 0.3, 0);
    rootGroup.add(bioRingA);

    const bioRingB = new THREE.Mesh(
      new THREE.TorusGeometry(2.55, 0.011, 10, 80),
      new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.18 })
    );
    bioRingB.rotation.set(-0.85, 0.55, 0.25);
    rootGroup.add(bioRingB);

    // 3. Floating Bio-Photonic Particles
    const particleCount = isMobile ? 40 : 85;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 2.0 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x0284c7,
      size: 0.028,
      transparent: true,
      opacity: 0.3,
    });
    const particleField = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particleField);

    const targetMouse = new THREE.Vector2(0, 0);
    const currentMouse = new THREE.Vector2(0, 0);
    let hoverBoost = 0.25;

    const onMouseMove = (e: MouseEvent) => {
      targetMouse.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      hoverBoost = Math.min(0.85, hoverBoost + 0.08);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      rootGroup.position.x = window.innerWidth >= 1024 ? 0.55 : 0;
    };
    window.addEventListener('resize', onResize, { passive: true });

    let frameId = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      frameId = requestAnimationFrame(animate);
      if (document.hidden) return;

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const speedFactor = prefersReducedMotion ? 0.15 : 0.85;
      uniforms.uTime.value += dt * speedFactor;

      currentMouse.lerp(targetMouse, 0.06);
      uniforms.uMouse.value.copy(currentMouse);

      hoverBoost = Math.max(0.25, hoverBoost - dt * 0.25);
      uniforms.uHoverIntensity.value = hoverBoost;

      rootGroup.rotation.y = currentMouse.x * 0.28 + uniforms.uTime.value * 0.06;
      rootGroup.rotation.x = -currentMouse.y * 0.2 + Math.sin(uniforms.uTime.value * 0.18) * 0.04;

      collagenMesh.rotation.y = -uniforms.uTime.value * 0.05;
      bioRingA.rotation.z = uniforms.uTime.value * 0.18;
      bioRingB.rotation.z = -uniforms.uTime.value * 0.14;
      particleField.rotation.y = uniforms.uTime.value * 0.025;

      renderer.render(scene, camera);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      epidermisGeo.dispose();
      epidermisMat.dispose();
      collagenGeo.dispose();
      collagenMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 80% 20%, rgba(2, 132, 199, 0.09) 0%, rgba(13, 148, 136, 0.06) 35%, transparent 65%), linear-gradient(150deg, #F8FAFC 0%, #F2F8FE 55%, #EFF6FF 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(2, 132, 199, 0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(13, 148, 136, 0.045) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
