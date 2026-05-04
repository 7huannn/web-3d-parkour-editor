import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';

type BuildingProps = Readonly<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}>;

export function Building({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: BuildingProps) {
  const { scene } = useGLTF('/models/building.glb');

  // Enable shadows for all meshes in the model
  scene.traverse((child) => {
    if ('material' in child) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return (
    <RigidBody type="fixed" colliders="trimesh" position={position} rotation={rotation}>
      <primitive object={scene} scale={scale} />
    </RigidBody>
  );
}