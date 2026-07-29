import { Sphere } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";

const Particle = () => {
  const ref = useRef<Mesh>(null);
  const factor = Math.random() * 10;
  useFrame((state) => {
    const { clock } = state;
    if (!ref.current) return;
    ref.current.position.x = Math.sin(clock.elapsedTime / 4 + factor * 10);
    ref.current.position.y = Math.cos(clock.elapsedTime / 4 + factor * 10);
  });
  return (
    <Sphere
      ref={ref}
      material-color={`rgb(${200 + Math.floor(Math.random() * 55)},${200 + Math.floor(Math.random() * 55)},0)`}
    />
  );
};

const Spheres = () => {
  const group = useRef<Group>(null);
  return (
    <group ref={group}>
      <Particle />
      <Particle />
      <Particle />
      <Particle />
      <Particle />
    </group>
  );
};

export default Spheres;
