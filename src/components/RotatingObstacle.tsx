import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RigidBodyApi } from '@react-three/rapier';
import { Euler, Quaternion } from 'three';

type RotatingObstacleProps = Readonly<{
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  speed: number;
}>;

export function RotatingObstacle({ position, size, color, speed }: RotatingObstacleProps) {
  const bodyRef = useRef<RigidBodyApi>(null);
  const rotation = useMemo(() => new Quaternion(), []);
  const euler = useMemo(() => new Euler(), []);

  useFrame((state) => {
    const angle = state.clock.elapsedTime * speed;
    euler.set(0, angle, 0);
    rotation.setFromEuler(euler);
    bodyRef.current?.setNextKinematicRotation(rotation);
  });

  return (
    <RigidBody ref={bodyRef} type="kinematicPositionBased" colliders="cuboid" position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
    </RigidBody>
  );
}
