import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { extractBaseFrequenciesEnergy, map } from "../../audio/utils";
let baseEnergy = 0;
let midEnergy = 0;
let highEnergy = 0;

type ParticlesProps = {
  count: number;
  core: { on: (event: string, handler: (e: { data: { real: ArrayLike<number> } }) => void) => void };
  color: string;
};

const Particles = ({ count, core, color }: ParticlesProps) => {
  useEffect(() => {
    core.on("fft", (e: { data: { real: ArrayLike<number> } }) => {
      const baseFrequencyRange: [number, number] = [20, 200];
      const midFrequencyRange: [number, number] = [201, 4000];
      const highFrequencyRange: [number, number] = [4001, 10000];
      baseEnergy = extractBaseFrequenciesEnergy(
        e.data.real,
        44100,
        baseFrequencyRange
      );
      midEnergy = extractBaseFrequenciesEnergy(
        e.data.real,
        44100,
        midFrequencyRange
      );
      highEnergy = extractBaseFrequenciesEnergy(
        e.data.real,
        44100,
        highFrequencyRange
      );
    });
  }, [core]);

  const points = useRef<THREE.Points>(null);

  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const distance = map(midEnergy, 0, 4, 1, 3, true);

    for (let i = 0; i < count; i++) {
      const theta = THREE.MathUtils.randFloatSpread(360);
      const phi = THREE.MathUtils.randFloatSpread(360);

      const x = distance * Math.sin(theta) * Math.cos(phi);
      const y = distance * Math.sin(theta) * Math.sin(phi);
      const z = distance * Math.cos(theta);

      positions.set([x, y, z], i * 3);
    }

    return positions;
  }, [count]);

  useFrame((state) => {
    const { clock } = state;
    if (!points.current) return;

    const distance = map(midEnergy, 0, 4, 1, 3, true);
    const theta = THREE.MathUtils.randFloatSpread(360);
    const phi = THREE.MathUtils.randFloatSpread(360);

    const x = distance * Math.sin(theta) * Math.cos(phi);
    const y = distance * Math.sin(theta) * Math.sin(phi);
    const z = distance * Math.cos(theta);

    const positionAttr = points.current.geometry.attributes.position;
    const array = positionAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      array[i3] += Math.sin(clock.elapsedTime + Math.random() * 10) * 0.01 + x / 100;
      array[i3 + 1] +=
        Math.cos(clock.elapsedTime + Math.random() * 10) * 0.01 + y / 100;
      array[i3 + 2] +=
        Math.sin(clock.elapsedTime + Math.random() * 10) * 0.01 + z / 100;
    }

    positionAttr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.012}
        color={color}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

export default Particles;
