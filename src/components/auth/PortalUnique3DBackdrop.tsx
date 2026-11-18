'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { PortalKey } from './AuthPortalShell3D';

interface PortalUnique3DBackdropProps {
  portal: PortalKey;
}

export function PortalUnique3DBackdrop({ portal }: PortalUnique3DBackdropProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / Math.max(window.innerHeight, 1),
      0.1,
      60
    );
    camera.position.set(0, 0, 7);

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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.3));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(4, 5, 6);
    scene.add(dirLight);

    const dynamicLight = new THREE.PointLight(
      portal === 'admin'
        ? 0x38bdf8
        : portal === 'bacsi'
          ? 0x0284c7
          : portal === 'letan'
            ? 0x10b981
            : 0x0d9488,
      4.0,
      18
    );
    scene.add(dynamicLight);

    const root = new THREE.Group();
    scene.add(root);

    // Portal-specific 3D objects & animation updaters
    let updateScene: (elapsed: number, dt: number, mx: number, my: number, pulse: number) => void =
      () => {};

    /* ------------------------------------------------------------------------
     * SCENE 1: KHÁCH HÀNG — Pearlescent Serum Bubbles & Silk Wave Ribbons 3D
     * ------------------------------------------------------------------------ */
    if (portal === 'khachhang') {
      const bubbleMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        emissive: 0x0d9488,
        emissiveIntensity: 0.14,
        roughness: 0.1,
        metalness: 0.05,
        transmission: 0.65,
        transparent: true,
        opacity: 0.85,
        clearcoat: 1.0,
      });
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.25,
        metalness: 0.6,
        transparent: true,
        opacity: 0.75,
      });

      const bubbles: { mesh: THREE.Mesh; baseX: number; baseY: number; speed: number; amp: number }[] = [];
      for (let i = 0; i < 18; i++) {
        const radius = 0.16 + (i % 4) * 0.11;
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 24, 24),
          i % 4 === 0 ? goldMat : bubbleMat
        );
        const bx = (Math.random() - 0.1) * 6.5; // bias slightly right over form area
        const by = (Math.random() - 0.5) * 5.0;
        const bz = (Math.random() - 0.5) * 3.0;
        mesh.position.set(bx, by, bz);
        root.add(mesh);
        bubbles.push({
          mesh,
          baseX: bx,
          baseY: by,
          speed: 0.6 + (i % 5) * 0.22,
          amp: 0.22 + (i % 3) * 0.12,
        });
      }

      const ribbon = new THREE.Mesh(
        new THREE.TorusKnotGeometry(1.45, 0.06, 120, 16, 2, 3),
        new THREE.MeshPhysicalMaterial({
          color: 0x14b8a6,
          roughness: 0.2,
          transparent: true,
          opacity: 0.28,
        })
      );
      ribbon.position.set(2.2, 0, -1.5);
      root.add(ribbon);

      updateScene = (elapsed, _dt, mx, my, pulse) => {
        ribbon.rotation.x = elapsed * 0.18 + my * 0.25;
        ribbon.rotation.y = elapsed * 0.24 + mx * 0.25;
        ribbon.scale.setScalar(1 + pulse * 0.18);
        bubbles.forEach((b, idx) => {
          b.mesh.position.y = b.baseY + Math.sin(elapsed * b.speed + idx) * b.amp;
          b.mesh.position.x = b.baseX + Math.cos(elapsed * b.speed * 0.7 + idx) * 0.15 + mx * 0.35;
          b.mesh.scale.setScalar(1 + pulse * 0.25);
        });
      };
    }

    /* ------------------------------------------------------------------------
     * SCENE 2: BÁC SĨ — 3D DNA Double Helix & Molecular Clinical Bonds
     * ------------------------------------------------------------------------ */
    else if (portal === 'bacsi') {
      const dnaGroup = new THREE.Group();
      dnaGroup.position.set(0, 0, -1.2);
      dnaGroup.rotation.z = 0.42;
      root.add(dnaGroup);

      const strandAMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.3,
        roughness: 0.25,
      });
      const strandBMat = new THREE.MeshStandardMaterial({
        color: 0x0d9488,
        emissive: 0x14b8a6,
        emissiveIntensity: 0.25,
        roughness: 0.25,
      });
      const bondMat = new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.55,
      });

      const pairs = 24;
      for (let i = 0; i < pairs; i++) {
        const y = (i - pairs / 2) * 0.36;
        const angle = i * 0.48;
        const r = 1.05;

        const x1 = Math.cos(angle) * r;
        const z1 = Math.sin(angle) * r;
        const x2 = Math.cos(angle + Math.PI) * r;
        const z2 = Math.sin(angle + Math.PI) * r;

        const node1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), strandAMat);
        node1.position.set(x1, y, z1);
        dnaGroup.add(node1);

        const node2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), strandBMat);
        node2.position.set(x2, y, z2);
        dnaGroup.add(node2);

        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, r * 2, 8), bondMat);
        bar.position.set(0, y, 0);
        bar.rotation.z = Math.PI / 2;
        bar.rotation.y = -angle;
        dnaGroup.add(bar);
      }

      updateScene = (elapsed, _dt, mx, my, pulse) => {
        dnaGroup.rotation.y = elapsed * 0.55 + mx * 0.5;
        dnaGroup.rotation.x = my * 0.25;
        dnaGroup.scale.setScalar(1 + pulse * 0.12);
      };
    }

    /* ------------------------------------------------------------------------
     * SCENE 3: LỄ TÂN — 3D Floating Crystal Polyhedrons & Orbiting Gold Rings
     * ------------------------------------------------------------------------ */
    else if (portal === 'letan') {
      const shapes: { mesh: THREE.Mesh; speed: number; basePos: THREE.Vector3 }[] = [];
      const emeraldMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.22,
        roughness: 0.2,
        metalness: 0.35,
        transparent: true,
        opacity: 0.78,
      });
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.2,
        metalness: 0.65,
        transparent: true,
        opacity: 0.85,
      });
      const tealWireMat = new THREE.MeshBasicMaterial({
        color: 0x0d9488,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      });

      const geos = [
        new THREE.OctahedronGeometry(0.38, 0),
        new THREE.IcosahedronGeometry(0.32, 0),
        new THREE.TorusGeometry(0.35, 0.09, 12, 28),
        new THREE.DodecahedronGeometry(0.34, 0),
      ];

      for (let i = 0; i < 14; i++) {
        const geo = geos[i % geos.length];
        const mat = i % 3 === 0 ? goldMat : i % 3 === 1 ? emeraldMat : tealWireMat;
        const mesh = new THREE.Mesh(geo, mat);
        const pos = new THREE.Vector3(
          (Math.random() - 0.5) * 9.0,
          (Math.random() - 0.5) * 5.2,
          (Math.random() - 0.5) * 3.0 - 0.8
        );
        mesh.position.copy(pos);
        root.add(mesh);
        shapes.push({ mesh, speed: 0.5 + (i % 4) * 0.25, basePos: pos });
      }

      updateScene = (elapsed, dt, mx, my, pulse) => {
        shapes.forEach((s, idx) => {
          s.mesh.rotation.x += dt * s.speed;
          s.mesh.rotation.y += dt * s.speed * 0.8;
          s.mesh.position.y = s.basePos.y + Math.sin(elapsed * s.speed + idx) * 0.28 + my * 0.3;
          s.mesh.position.x = s.basePos.x + mx * 0.35;
          s.mesh.scale.setScalar(1 + pulse * 0.3);
        });
      };
    }

    /* ------------------------------------------------------------------------
     * SCENE 4: QUẢN TRỊ (ADMIN) — 3D Cyber Wireframe Terrain & Neon Particle Vortex
     * ------------------------------------------------------------------------ */
    else {
      const terrainGeo = new THREE.PlaneGeometry(18, 12, 38, 26);
      const terrainMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.28,
      });
      const terrain = new THREE.Mesh(terrainGeo, terrainMat);
      terrain.rotation.x = -Math.PI / 2.5;
      terrain.position.set(0, -1.8, -1.2);
      root.add(terrain);
      const basePos = terrainGeo.attributes.position.array.slice() as Float32Array;

      // Rotating Neon Cyber Gyro Core behind form
      const coreGroup = new THREE.Group();
      coreGroup.position.set(0, 0.2, -2.5);
      root.add(coreGroup);

      const coreSphere = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.9, 2),
        new THREE.MeshBasicMaterial({
          color: 0x6366f1,
          wireframe: true,
          transparent: true,
          opacity: 0.26,
        })
      );
      coreGroup.add(coreSphere);

      const cyberRing = new THREE.Mesh(
        new THREE.TorusGeometry(2.6, 0.03, 12, 80),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 })
      );
      cyberRing.rotation.x = 1.15;
      coreGroup.add(cyberRing);

      // Particle Vortex
      const pCount = 240;
      const pPos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 1.8 + Math.random() * 3.8;
        pPos[i * 3] = Math.cos(angle) * r;
        pPos[i * 3 + 1] = (Math.random() - 0.5) * 5.2;
        pPos[i * 3 + 2] = Math.sin(angle) * r - 1.5;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      const vortex = new THREE.Points(
        pGeo,
        new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.055, transparent: true, opacity: 0.75 })
      );
      root.add(vortex);

      updateScene = (elapsed, _dt, mx, my, pulse) => {
        const attr = terrainGeo.attributes.position;
        for (let i = 0; i < attr.count; i++) {
          const x = basePos[i * 3];
          const y = basePos[i * 3 + 1];
          const z =
            Math.sin(x * 0.65 + elapsed * 1.8) * 0.35 +
            Math.cos(y * 0.75 + elapsed * 1.4) * 0.28 +
            pulse * 0.35;
          attr.setZ(i, z);
        }
        attr.needsUpdate = true;

        coreGroup.rotation.y = elapsed * 0.28 + mx * 0.4;
        coreGroup.rotation.x = my * 0.25;
        coreGroup.scale.setScalar(1 + pulse * 0.2);
        cyberRing.rotation.z = elapsed * 0.65;
        vortex.rotation.y = -elapsed * 0.16;
      };
    }

    const targetMouse = new THREE.Vector2(0, 0);
    const currentMouse = new THREE.Vector2(0, 0);
    let clickPulse = 0;

    const onMove = (e: MouseEvent) => {
      targetMouse.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
    };
    const onDown = () => {
      clickPulse = 1.0;
    };
    const onResize = () => {
      camera.aspect = window.innerWidth / Math.max(window.innerHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
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

      currentMouse.lerp(targetMouse, 0.08);
      dynamicLight.position.set(currentMouse.x * 4, currentMouse.y * 3, 3);
      clickPulse = Math.max(0, clickPulse - dt * 1.6);

      updateScene(elapsed, dt, currentMouse.x, currentMouse.y, clickPulse);
      renderer.render(scene, camera);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [portal]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
}
