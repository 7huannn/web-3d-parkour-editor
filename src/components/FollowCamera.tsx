import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MOUSE, TOUCH, Vector3 } from 'three';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
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
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const controls = useCameraControls();
  const smoothedTarget = useRef(new Vector3());
  const initialized = useRef(false);
  const desiredTarget = useRef(new Vector3());
  const teleportOffset = useRef(new Vector3());
  
  useFrame((state) => {
    if (!target.current || !cameraRef.current) return;
    const orbit = orbitRef.current;
    if (!orbit) return;

    const position = target.current.getPosition();
    desiredTarget.current.set(
      position.x,
      position.y + 1.1,
      position.z,
    );

    if (!initialized.current) {
      initialized.current = true;
      smoothedTarget.current.copy(desiredTarget.current);
      orbit.target.copy(smoothedTarget.current);
      state.camera.position.set(
        desiredTarget.current.x + projection.offsetX,
        desiredTarget.current.y + projection.height,
        desiredTarget.current.z + projection.distance,
      );
    } else {
      // Snap follow target for teleports/respawns, keep relative camera orbit offset.
      if (smoothedTarget.current.distanceTo(desiredTarget.current) > 12) {
        teleportOffset.current.subVectors(desiredTarget.current, smoothedTarget.current);
        smoothedTarget.current.copy(desiredTarget.current);
        state.camera.position.add(teleportOffset.current);
      } else {
        smoothedTarget.current.lerp(desiredTarget.current, controls.smoothness);
      }
      orbit.target.copy(smoothedTarget.current);
    }

    orbit.update();
    state.camera.near = projection.near;
    state.camera.far = projection.far;
    state.camera.fov = controls.fov;
    state.camera.updateProjectionMatrix();
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
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        enablePan={false}
        enableRotate
        enableZoom
        minPolarAngle={0.2}
        maxPolarAngle={1.35}
        minDistance={2.5}
        maxDistance={Math.max(projection.distance + 8, 10)}
        rotateSpeed={0.9}
        zoomSpeed={0.9}
        mouseButtons={{
          LEFT: MOUSE.ROTATE,
          MIDDLE: MOUSE.DOLLY,
          RIGHT: MOUSE.ROTATE,
        }}
        touches={{
          ONE: TOUCH.ROTATE,
          TWO: TOUCH.DOLLY_ROTATE,
        }}
        target={[0, 1.1, 0]}
      />
    </group>
  );
}
