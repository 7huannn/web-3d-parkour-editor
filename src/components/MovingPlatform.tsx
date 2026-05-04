import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RigidBodyApi } from '@react-three/rapier';
import { Vector3 } from 'three';

type MovingPlatformProps = Readonly<{
  start: [number, number, number];
  end: [number, number, number];
  size: [number, number, number];
  color: string;
  speed: number;
}>;

export function MovingPlatform({ start, end, size, color, speed }: MovingPlatformProps) {
  const bodyRef = useRef<RigidBodyApi>(null);
  const startVec = useMemo(() => new Vector3(...start), [start]);
  const endVec = useMemo(() => new Vector3(...end), [end]);
  const tempVec = useMemo(() => new Vector3(), []);

  useFrame((state) => {
    const t = (Math.sin(state.clock.elapsedTime * speed) + 1) * 0.5;
    tempVec.lerpVectors(startVec, endVec, t);
    bodyRef.current?.setNextKinematicTranslation(tempVec);
  });

  return (
    <RigidBody ref={bodyRef} type="kinematicPositionBased" colliders="cuboid" position={start}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
      </mesh>
    </RigidBody>
  );
}
