import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { PerspectiveCamera } from '@react-three/drei';
import { useCameraControls } from '../hooks/useCameraControls';
import type { CharacterControllerHandle } from './CharacterController';

const LOOK_SENSITIVITY_X = 0.0024;
const LOOK_SENSITIVITY_Y = 0.0019;
const MIN_PITCH = -0.62;
const MAX_PITCH = 0.72;
const ORBIT_HEIGHT_OFFSET = 1.1;
const MIN_CAMERA_DISTANCE = 2.5;
const CAMERA_ROTATION_SMOOTH = 0.22;
const CAMERA_POSITION_SMOOTH = 0.24;
const LOOK_AHEAD_DISTANCE = 1.35;

function normalizeAngle(angle: number) {
  let next = angle;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

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
  const smoothedTarget = useRef(new Vector3(0, ORBIT_HEIGHT_OFFSET, 0));
  const focusPoint = useRef(new Vector3(0, ORBIT_HEIGHT_OFFSET, 0));
  const desiredCameraPos = useRef(new Vector3());
  const initialized = useRef(false);

  const desiredYaw = useRef(0);
  const desiredPitch = useRef(0.22);
  const currentYaw = useRef(0);
  const currentPitch = useRef(0.22);

  const currentDistance = useRef(projection.distance);
  const targetDistance = useRef(projection.distance);

  const horizontalForward = useRef(new Vector3(0, 0, 1));
  const horizontalRight = useRef(new Vector3(1, 0, 0));
  const lookDirection = useRef(new Vector3(0, 0, 1));

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement == null) return;

      desiredYaw.current -= event.movementX * LOOK_SENSITIVITY_X;
      desiredPitch.current -= event.movementY * LOOK_SENSITIVITY_Y;
      desiredPitch.current = Math.max(MIN_PITCH, Math.min(MAX_PITCH, desiredPitch.current));
      desiredYaw.current = normalizeAngle(desiredYaw.current);
    };

    globalThis.addEventListener('mousemove', handleMouseMove);
    return () => globalThis.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    currentDistance.current = projection.distance;
    targetDistance.current = projection.distance;
  }, [projection.distance]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (document.pointerLockElement == null) return;
      event.preventDefault();
      const maxDistance = Math.max(projection.distance + 8, 10);
      const nextDistance = targetDistance.current + event.deltaY * 0.01;
      targetDistance.current = Math.max(MIN_CAMERA_DISTANCE, Math.min(maxDistance, nextDistance));
    };

    globalThis.addEventListener('wheel', handleWheel, { passive: false });
    return () => globalThis.removeEventListener('wheel', handleWheel);
  }, [projection.distance]);

  useFrame((state) => {
    if (!target.current || !cameraRef.current) return;

    const position = target.current.getPosition();
    const targetHeight = ORBIT_HEIGHT_OFFSET + projection.height * 0.22;
    const targetPoint = new Vector3(position.x, position.y + targetHeight, position.z);

    if (!initialized.current) {
      initialized.current = true;
      smoothedTarget.current.copy(targetPoint);
      desiredYaw.current = 0;
      currentYaw.current = 0;
      currentPitch.current = desiredPitch.current;
    } else if (smoothedTarget.current.distanceTo(targetPoint) > 12) {
      smoothedTarget.current.copy(targetPoint);
    } else {
      smoothedTarget.current.lerp(targetPoint, controls.smoothness);
    }

    const yawDiff = normalizeAngle(desiredYaw.current - currentYaw.current);
    currentYaw.current = normalizeAngle(currentYaw.current + yawDiff * CAMERA_ROTATION_SMOOTH);
    currentPitch.current += (desiredPitch.current - currentPitch.current) * CAMERA_ROTATION_SMOOTH;

    currentDistance.current += (targetDistance.current - currentDistance.current) * 0.2;

    horizontalForward.current.set(
      Math.sin(currentYaw.current),
      0,
      Math.cos(currentYaw.current),
    ).normalize();

    horizontalRight.current.set(
      Math.cos(currentYaw.current),
      0,
      -Math.sin(currentYaw.current),
    ).normalize();

    focusPoint.current
      .copy(smoothedTarget.current)
      .addScaledVector(horizontalForward.current, LOOK_AHEAD_DISTANCE)
      .addScaledVector(horizontalRight.current, projection.offsetX);

    const cosPitch = Math.cos(currentPitch.current);
    lookDirection.current.set(
      Math.sin(currentYaw.current) * cosPitch,
      Math.sin(currentPitch.current),
      Math.cos(currentYaw.current) * cosPitch,
    ).normalize();

    desiredCameraPos.current
      .copy(focusPoint.current)
      .addScaledVector(lookDirection.current, -currentDistance.current);

    state.camera.position.lerp(desiredCameraPos.current, CAMERA_POSITION_SMOOTH);
    state.camera.near = projection.near;
    state.camera.far = projection.far;
    state.camera.fov = controls.fov;
    state.camera.updateProjectionMatrix();
    state.camera.lookAt(focusPoint.current);
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
