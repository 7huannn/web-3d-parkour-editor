import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { PerspectiveCamera } from '@react-three/drei';
import { useCameraControls } from '../hooks/useCameraControls';
import type { CharacterControllerHandle } from './CharacterController';

type FollowCameraProps = Readonly<{
  target: React.RefObject<CharacterControllerHandle>;
  projection: {
    near: number;
    far: number;
    offsetX: number;
    height: number;
    distance: number;
  };
}>;

export function FollowCamera({ target, projection }: FollowCameraProps) {
  const cameraRef = useRef<THREE.Group>(null);
  const controls = useCameraControls();
  const currentPos = useRef(new Vector3());
  
  useFrame((state) => {
    if (!target.current || !cameraRef.current) return;

    const position = target.current.getPosition();
    const targetPos = position
      .clone()
      .add(new Vector3(projection.offsetX, projection.height, projection.distance));

    // Smooth camera movement
    currentPos.current.lerp(targetPos, controls.smoothness);
    state.camera.position.copy(currentPos.current);
    state.camera.near = projection.near;
    state.camera.far = projection.far;
    state.camera.fov = controls.fov;
    state.camera.updateProjectionMatrix();
    state.camera.lookAt(position.clone());
  });

  return (
    <group ref={cameraRef}>
      <PerspectiveCamera
        makeDefault
        position={[0, projection.height, projection.distance]}
        fov={controls.fov}
        near={projection.near}
        far={projection.far}
      />
    </group>
  );
}