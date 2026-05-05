import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';

type BuildingProps = Readonly<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  modelUrl?: string;
  scale?: number;
  baseOffsetY?: number;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}>;

export function Building({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  modelUrl = '/models/building.glb',
  scale = 1,
  baseOffsetY = 0,
  onClick,
}: BuildingProps) {
  const { scene } = useGLTF(modelUrl);
  const model = useMemo(() => scene.clone(true), [scene]);

  // Enable shadows for all meshes in the model
  model.traverse((child) => {
    if ('material' in child) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return (
    <RigidBody type="fixed" colliders="trimesh" position={position} rotation={rotation}>
      <group position={[0, baseOffsetY, 0]} onClick={onClick}>
        <primitive object={model} scale={scale} />
      </group>
    </RigidBody>
  );
}
