import { useEffect, useRef, useState } from 'react';
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  InstancedMesh,
  MeshLambertMaterial,
  Object3D,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { buildCreatorVoxelModel, buildDjDeck } from '../lib/creatorVoxelModel';

interface CreatorVoxelProps {
  /** Shown when WebGL is unavailable. */
  fallbackSrc: string;
  alt: string;
}

export default function CreatorVoxel({ fallbackSrc, alt }: CreatorVoxelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      setFailed(true);
      return;
    }
    // Supersampled: the canvas is tiny, and thin parts (glasses) vanish at 1x.
    renderer.setPixelRatio(Math.max(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const scene = new Scene();
    scene.add(new AmbientLight(0xffffff, 1.7));
    const sun = new DirectionalLight(0xffffff, 2.2);
    sun.position.set(6, 12, 10);
    scene.add(sun);

    // Square frame on the upper body and the deck top, looking slightly down.
    const camera = new OrthographicCamera(-10.5, 10.5, 10.5, -10.5, 0.1, 100);
    camera.position.set(0, 28.5, 40);
    camera.lookAt(0, 17, 4);

    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshLambertMaterial();
    const root = new Group();
    scene.add(root);

    const joints: Record<string, Group> = {};
    const meshes: InstancedMesh[] = [];
    const dummy = new Object3D();
    const color = new Color();
    for (const part of [...buildCreatorVoxelModel(), ...buildDjDeck()]) {
      const [px, py, pz] = part.pivot;
      const mesh = new InstancedMesh(geometry, material, part.boxes.length);
      part.boxes.forEach(([x, y, z, w, h, d, hex], i) => {
        dummy.position.set(x + w / 2 - px, y + h / 2 - py, z + d / 2 - pz);
        dummy.scale.set(w, h, d);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        // Slight per-cube shade so the voxel grid reads on flat colours.
        const shade = 0.9 + 0.1 * ((Math.imul(i, 2654435761) >>> 0) / 2 ** 32);
        mesh.setColorAt(i, color.setHex(hex).multiplyScalar(shade));
      });
      const joint = new Group();
      joint.position.set(px, py, pz);
      joint.add(mesh);
      root.add(joint);
      joints[part.name] = joint;
      meshes.push(mesh);
    }

    const pose = (seconds: number) => {
      const beat = Math.sin(seconds * 5); // nodding along to the earbuds
      // Scratching comes in bursts; the other platter just plays.
      const scratch = Math.sin(seconds * 7) * Math.max(0, Math.sin(seconds * 1.3));
      root.rotation.y = Math.sin(seconds * 0.8) * 0.2;
      joints.head.rotation.x = 0.1 + beat * 0.07;
      joints.head.rotation.z = Math.sin(seconds * 2.5) * 0.05;
      // -1.1 rad swings the hanging arms forward onto the platters.
      joints.armR.rotation.x = -1.1 + beat * 0.05;
      joints.armL.rotation.x = -1.1;
      joints.armL.rotation.z = scratch * 0.12;
      joints.platterL.rotation.y = scratch * 0.8;
      joints.platterR.rotation.y = -seconds * 3.5;
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    const frame = (ms: number) => {
      pose(ms / 1000);
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(frame);
    };

    // Only animate while on screen.
    const observer = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(rafId);
      if (entry.isIntersecting && !reduced) rafId = requestAnimationFrame(frame);
    });
    if (reduced) {
      pose(0);
      renderer.render(scene, camera);
    } else {
      observer.observe(canvas);
    }

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
      meshes.forEach((mesh) => mesh.dispose());
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  if (failed) {
    return <img src={fallbackSrc} alt={alt} className="w-full h-full object-cover object-top" />;
  }
  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`${alt}, animated voxel DJ`}
      className="w-full h-full block"
    />
  );
}
