'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { PortalKey } from './AuthPortalShell3D';

interface PortalChibiScene3DProps {
  portal: PortalKey;
}

const PORTAL_BG: Record<PortalKey, string> = {
  khachhang:
    'radial-gradient(circle at 22% 28%, rgba(13, 148, 136, 0.22) 0%, transparent 52%), radial-gradient(circle at 80% 78%, rgba(56, 189, 248, 0.2) 0%, transparent 50%), linear-gradient(145deg, #ECFEFF 0%, #E6FFFA 48%, #EFF6FF 100%)',
  bacsi:
    'radial-gradient(circle at 20% 25%, rgba(2, 132, 199, 0.24) 0%, transparent 55%), radial-gradient(circle at 82% 80%, rgba(13, 148, 136, 0.16) 0%, transparent 50%), linear-gradient(145deg, #EFF6FF 0%, #DBEAFE 52%, #E0F2FE 100%)',
  letan:
    'radial-gradient(circle at 22% 25%, rgba(5, 150, 105, 0.22) 0%, transparent 55%), radial-gradient(circle at 78% 80%, rgba(20, 184, 166, 0.18) 0%, transparent 50%), linear-gradient(145deg, #ECFDF5 0%, #D1FAE5 50%, #F0FDFA 100%)',
  admin:
    'radial-gradient(circle at 22% 28%, rgba(56, 189, 248, 0.20) 0%, transparent 52%), radial-gradient(circle at 78% 76%, rgba(99, 102, 241, 0.22) 0%, transparent 52%), linear-gradient(145deg, #0F172A 0%, #1E293B 55%, #0F172A 100%)',
};

export function PortalChibiScene3D({ portal }: PortalChibiScene3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      50
    );
    camera.position.set(0, 0.18, 5.7);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const accentHex =
      portal === 'bacsi'
        ? 0x0284c7
        : portal === 'letan'
          ? 0x059669
          : portal === 'admin'
            ? 0x38bdf8
            : 0x0d9488;
    const secondaryHex =
      portal === 'bacsi'
        ? 0x2dd4bf
        : portal === 'letan'
          ? 0xfbbf24
          : portal === 'admin'
            ? 0x818cf8
            : 0xf472b6;

    // Studio & Dynamic Cursor Point Light
    scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.3));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const cursorLight = new THREE.PointLight(accentHex, 4.2, 12);
    cursorLight.position.set(0, 0.5, 3);
    scene.add(cursorLight);

    const rimLight = new THREE.DirectionalLight(secondaryHex, 1.4);
    rimLight.position.set(-4, 2, -2);
    scene.add(rimLight);

    // Root Assembly
    const root = new THREE.Group();
    scene.add(root);

    // 0. DEEP 3D HOLOGRAPHIC BACKGROUND BEHIND CHIBI (Wave Terrain + Wireframe Geodesic Dome + Floating Crystals)
    const backdropGroup = new THREE.Group();
    backdropGroup.position.set(0, 0, -2.6);
    scene.add(backdropGroup);

    // 0a. 3D Geodesic Wireframe Portal Sphere behind Chibi
    const bgDome = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.2, 3),
      new THREE.MeshBasicMaterial({
        color: accentHex,
        wireframe: true,
        transparent: true,
        opacity: portal === 'admin' ? 0.22 : 0.14,
      })
    );
    backdropGroup.add(bgDome);

    // 0b. 3D Undulating Wave Floor Grid beneath/behind Chibi
    const wavePlaneGeo = new THREE.PlaneGeometry(14, 9, 28, 18);
    const wavePlaneMat = new THREE.MeshBasicMaterial({
      color: secondaryHex,
      wireframe: true,
      transparent: true,
      opacity: portal === 'admin' ? 0.24 : 0.16,
    });
    const waveFloor = new THREE.Mesh(wavePlaneGeo, wavePlaneMat);
    waveFloor.rotation.x = -Math.PI / 2.4;
    waveFloor.position.set(0, -1.55, 0.5);
    backdropGroup.add(waveFloor);
    const waveBasePos = wavePlaneGeo.attributes.position.array.slice() as Float32Array;

    // 0c. Floating 3D Geometric Crystals behind Chibi
    const crystalGroup = new THREE.Group();
    backdropGroup.add(crystalGroup);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: secondaryHex,
      emissiveIntensity: 0.28,
      roughness: 0.2,
      metalness: 0.5,
      transparent: true,
      opacity: 0.55,
    });
    for (let i = 0; i < 8; i++) {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.18 + (i % 3) * 0.08, 0), crystalMat);
      const angle = (i / 8) * Math.PI * 2;
      crystal.position.set(Math.cos(angle) * 2.55, Math.sin(angle) * 1.65, -0.4 + (i % 2) * 0.6);
      crystalGroup.add(crystal);
    }

    // 1. Holographic Pedestal Rings beneath Chibi
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, -1.12, 0);
    root.add(pedestalGroup);

    const holoRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.022, 12, 64),
      new THREE.MeshBasicMaterial({ color: accentHex, transparent: true, opacity: 0.65 })
    );
    holoRing1.rotation.x = Math.PI / 2;
    pedestalGroup.add(holoRing1);

    const holoRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.22, 0.015, 10, 48, Math.PI * 1.4),
      new THREE.MeshBasicMaterial({ color: secondaryHex, transparent: true, opacity: 0.5 })
    );
    holoRing2.rotation.x = Math.PI / 2;
    pedestalGroup.add(holoRing2);

    // 2. Dual Tilted Gyroscope Orbit Rings around Chibi
    const orbitGroup = new THREE.Group();
    root.add(orbitGroup);

    const orbitRingA = new THREE.Mesh(
      new THREE.TorusGeometry(1.62, 0.016, 12, 72),
      new THREE.MeshBasicMaterial({ color: accentHex, transparent: true, opacity: 0.35 })
    );
    orbitRingA.rotation.set(0.65, 0.35, 0);
    orbitGroup.add(orbitRingA);

    const orbitRingB = new THREE.Mesh(
      new THREE.TorusGeometry(1.85, 0.014, 12, 72),
      new THREE.MeshBasicMaterial({ color: secondaryHex, transparent: true, opacity: 0.28 })
    );
    orbitRingB.rotation.set(-0.55, 0.7, 0.2);
    orbitGroup.add(orbitRingB);

    // 3. Interactive Shockwave Ring (expands on click)
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: 0,
    });
    const shockwaveRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.035, 12, 48),
      shockwaveMat
    );
    shockwaveRing.rotation.x = Math.PI / 2;
    shockwaveRing.position.set(0, -1.08, 0);
    root.add(shockwaveRing);

    // 4. Chibi Character Group
    const chibi = new THREE.Group();
    root.add(chibi);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.5 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15 });
    const blushMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.55 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const accentMat = new THREE.MeshStandardMaterial({
      color: accentHex,
      roughness: 0.25,
      metalness: 0.2,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.2,
      metalness: 0.6,
    });

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.72, 0);
    chibi.add(headGroup);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.66, 32, 32), skinMat);
    headGroup.add(headMesh);

    const hairColor = portal === 'khachhang' ? 0x334155 : portal === 'letan' ? 0x451a03 : 0x1e293b;
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.68, 30, 20, 0, Math.PI * 2, 0, Math.PI * 0.52),
      new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.55 })
    );
    hairCap.rotation.x = -0.22;
    headGroup.add(hairCap);

    // Blinking Eyes + Blush
    const eyes: THREE.Mesh[] = [];
    [-0.22, 0.22].forEach((x) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.078, 16, 16), eyeMat);
      eye.scale.set(0.9, 1.18, 0.6);
      eye.position.set(x, -0.02, 0.58);
      headGroup.add(eye);
      eyes.push(eye);

      const sparkle = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), whiteMat);
      sparkle.position.set(x + 0.025, 0.015, 0.628);
      headGroup.add(sparkle);

      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 14), blushMat);
      blush.scale.set(1.2, 0.6, 0.3);
      blush.position.set(x * 1.45, -0.14, 0.56);
      headGroup.add(blush);
    });

    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.35, 0);
    chibi.add(bodyGroup);

    const torsoMat = portal === 'bacsi' ? whiteMat : accentMat;
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.42, 12, 24), torsoMat);
    bodyGroup.add(torso);

    const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 8, 14), torsoMat);
    leftArm.position.set(-0.54, 0.06, 0.05);
    leftArm.rotation.z = 0.45;
    bodyGroup.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 8, 14), torsoMat);
    rightArm.position.set(0.54, 0.16, 0.12);
    rightArm.rotation.z = -0.9;
    bodyGroup.add(rightArm);

    // Portal-Specific 3D Props & Double-Helix Bio-Particles
    const propsGroup = new THREE.Group();
    root.add(propsGroup);

    if (portal === 'bacsi') {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.18, 24), whiteMat);
      cap.position.set(0, 0.68, 0.06);
      headGroup.add(cap);

      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.04), accentMat);
      crossV.position.set(0, 0.68, 0.36);
      headGroup.add(crossV);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.04), accentMat);
      crossH.position.set(0, 0.68, 0.36);
      headGroup.add(crossH);

      [-0.22, 0.22].forEach((x) => {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.018, 10, 24), accentMat);
        rim.position.set(x, -0.02, 0.61);
        headGroup.add(rim);
      });

      const stetho = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.045, 12, 28, Math.PI * 1.25),
        accentMat
      );
      stetho.rotation.x = Math.PI * 0.42;
      stetho.rotation.z = -Math.PI * 0.12;
      stetho.position.set(0, 0.34, 0.08);
      bodyGroup.add(stetho);

      for (let i = 0; i < 6; i++) {
        const pill = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.075, 0.15, 8, 14),
          i % 2 === 0 ? accentMat : whiteMat
        );
        const angle = (i / 6) * Math.PI * 2;
        pill.position.set(Math.cos(angle) * 1.7, Math.sin(angle) * 1.0, -0.25);
        propsGroup.add(pill);
      }
    } else if (portal === 'letan') {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.035, 10, 28, Math.PI),
        accentMat
      );
      band.position.set(0, 0.06, 0);
      headGroup.add(band);

      const earPad = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16), goldMat);
      earPad.rotation.z = Math.PI / 2;
      earPad.position.set(0.68, -0.02, 0.06);
      headGroup.add(earPad);

      const bell = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 22, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        goldMat
      );
      bell.position.set(1.5, -0.3, 0.2);
      propsGroup.add(bell);

      for (let i = 0; i < 4; i++) {
        const card = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.05), whiteMat);
        const a = (i / 4) * Math.PI * 2;
        card.position.set(Math.cos(a) * 1.65, Math.sin(a) * 0.9, -0.35);
        propsGroup.add(card);
      }
    } else if (portal === 'admin') {
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.22, 0.12),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.45,
          roughness: 0.1,
          metalness: 0.7,
          transparent: true,
          opacity: 0.88,
        })
      );
      visor.position.set(0, -0.01, 0.63);
      headGroup.add(visor);

      for (let i = 0; i < 5; i++) {
        const gear = new THREE.Mesh(
          new THREE.TorusGeometry(0.18, 0.05, 8, 12),
          i % 2 === 0 ? goldMat : accentMat
        );
        const angle = (i / 5) * Math.PI * 2;
        gear.position.set(Math.cos(angle) * 1.65, Math.sin(angle) * 0.98, -0.25);
        propsGroup.add(gear);
      }
    } else {
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 10, 20), blushMat);
      bow.position.set(0.45, 0.52, 0.22);
      bow.rotation.z = -0.4;
      headGroup.add(bow);

      for (let i = 0; i < 6; i++) {
        const bubble = new THREE.Mesh(
          new THREE.SphereGeometry(0.11 + (i % 2) * 0.05, 20, 20),
          i % 2 === 0 ? accentMat : blushMat
        );
        const angle = (i / 6) * Math.PI * 2;
        bubble.position.set(Math.cos(angle) * 1.62, Math.sin(angle) * 0.98, -0.25);
        propsGroup.add(bubble);
      }
    }

    // 5. Floating Bio-Spark Particle Cloud
    const pCount = 90;
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 6.2;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 3.0 - 0.5;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: accentHex,
      size: 0.045,
      transparent: true,
      opacity: 0.55,
    });
    const particleCloud = new THREE.Points(pGeo, pMat);
    scene.add(particleCloud);

    // Interactive Mouse + Click Spin-Jump State
    const targetMouse = new THREE.Vector2(0, 0);
    const currentMouse = new THREE.Vector2(0, 0);
    let jumpProgress = 0;
    let shockwaveProgress = 0;
    let blinkTimer = 0;

    const onMouseMove = (e: MouseEvent) => {
      targetMouse.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
    };
    const onPointerDown = () => {
      jumpProgress = 1.0;
      shockwaveProgress = 1.0;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize, { passive: true });

    let frameId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const animate = (now: number) => {
      frameId = requestAnimationFrame(animate);
      if (document.hidden) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      currentMouse.lerp(targetMouse, 0.09);
      cursorLight.position.x = currentMouse.x * 3.2;
      cursorLight.position.y = currentMouse.y * 2.5 + 0.5;

      // Natural eye blink every ~3.4 seconds
      blinkTimer += dt;
      const blinkCycle = blinkTimer % 3.4;
      const eyeScaleY = blinkCycle > 3.24 ? 0.12 : 1.18;
      eyes.forEach((eye) => {
        eye.scale.y += (eyeScaleY - eye.scale.y) * 0.45;
      });

      // Click jump & 360 spin
      let jumpY = 0;
      let spinY = 0;
      if (jumpProgress > 0.001) {
        jumpY = Math.sin(jumpProgress * Math.PI) * 0.55;
        spinY = (1 - jumpProgress) * Math.PI * 2;
        jumpProgress = Math.max(0, jumpProgress - dt * 1.85);
      }

      // Click shockwave ring
      if (shockwaveProgress > 0.001) {
        const s = 1 + (1 - shockwaveProgress) * 2.6;
        shockwaveRing.scale.setScalar(s);
        shockwaveMat.opacity = shockwaveProgress * 0.75;
        shockwaveProgress = Math.max(0, shockwaveProgress - dt * 1.45);
      } else {
        shockwaveMat.opacity = 0;
      }

      chibi.position.y = Math.sin(elapsed * 2.3) * 0.1 + jumpY;
      chibi.rotation.y = currentMouse.x * 0.42 + spinY;
      headGroup.rotation.x = -currentMouse.y * 0.24;
      headGroup.rotation.y = currentMouse.x * 0.28;
      rightArm.rotation.z = -0.85 + Math.sin(elapsed * 4.8) * 0.3;

      holoRing2.rotation.z = elapsed * 1.1;
      orbitRingA.rotation.z = elapsed * 0.45;
      orbitRingB.rotation.z = -elapsed * 0.35;

      propsGroup.rotation.z = elapsed * 0.25;
      propsGroup.children.forEach((child, idx) => {
        child.rotation.x += dt * (0.7 + idx * 0.12);
        child.rotation.y += dt * 0.6;
      });

      particleCloud.rotation.y = elapsed * 0.04;
      particleCloud.rotation.x = currentMouse.y * 0.08;

      // Animate 3D Backdrop behind Chibi (Dome + Undulating 3D Wave Floor + Crystals)
      bgDome.rotation.y = elapsed * 0.09 + currentMouse.x * 0.15;
      bgDome.rotation.x = Math.sin(elapsed * 0.3) * 0.12 - currentMouse.y * 0.1;

      const posAttr = wavePlaneGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const bx = waveBasePos[i * 3];
        const by = waveBasePos[i * 3 + 1];
        const bz =
          Math.sin(bx * 0.75 + elapsed * 1.6) * 0.22 +
          Math.cos(by * 0.85 + elapsed * 1.2) * 0.18;
        posAttr.setZ(i, bz);
      }
      posAttr.needsUpdate = true;

      crystalGroup.rotation.z = -elapsed * 0.12;
      crystalGroup.children.forEach((c, idx) => {
        c.rotation.x += dt * 0.5;
        c.rotation.y += dt * (0.4 + idx * 0.05);
      });

      renderer.render(scene, camera);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [portal]);

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden select-none pointer-events-none"
      aria-hidden="true"
    >
      <div className="absolute inset-0" style={{ background: PORTAL_BG[portal] }} />
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            portal === 'admin'
              ? 'linear-gradient(to right, rgba(56, 189, 248, 0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.10) 1px, transparent 1px)'
              : 'linear-gradient(to right, rgba(15, 23, 42, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.05) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div
        ref={mountRef}
        className={`absolute inset-y-0 h-full opacity-95 ${
          portal === 'letan'
            ? 'right-0 w-full lg:w-[52%]'
            : portal === 'khachhang'
              ? 'left-0 w-full lg:w-[44%]'
              : portal === 'admin'
                ? 'right-0 w-full lg:w-[48%]'
                : 'left-0 w-full lg:w-[54%]'
        }`}
      />
    </div>
  );
}
