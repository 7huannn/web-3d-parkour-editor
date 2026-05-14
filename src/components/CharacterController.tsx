import React, { useImperativeHandle, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, MathUtils } from 'three';
import { CapsuleCollider, RigidBody, RigidBodyApi, useRapier } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import { useCharacterControls } from '../hooks/useCharacterControls';
import { calculateMovement, createJumpImpulse, createMovementVelocity } from '../utils/physics';
import { useMobileControls } from '../contexts/useMobileControls';
import { CharacterModel } from './CharacterModel';

const PLAYER_MASS = 10;
const CAPSULE_HALF_HEIGHT = 0.8;
const CAPSULE_RADIUS = 0.4;
const CAPSULE_OFFSET_Y = -0.2;
const MODEL_SCALE = 1.5;
const MODEL_BASE_Y = CAPSULE_OFFSET_Y - (CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS);

const GROUND_PROBE_START = 0.08;
const GROUND_PROBE_MAX = 0.22;
const FOOT_SAMPLE_RADIUS = 0.26;
const MIN_GROUND_NORMAL_Y = 0.25;
const JUMP_ALLOWED_MAX_UPWARD_VELOCITY = 0.35;

const FOOT_SAMPLE_OFFSETS = [
  { x: 0, z: 0 },
  { x: FOOT_SAMPLE_RADIUS, z: 0 },
  { x: -FOOT_SAMPLE_RADIUS, z: 0 },
  { x: 0, z: FOOT_SAMPLE_RADIUS },
  { x: 0, z: -FOOT_SAMPLE_RADIUS },
];

export type CharacterControllerHandle = {
  getPosition: () => Vector3;
  getIsGrounded: () => boolean;
  setPosition: (position: Vector3) => void;
  setVelocity: (velocity: { x: number; y: number; z: number }) => void;
  reset: (position: Vector3) => void;
};

type CharacterControllerProps = {
  spawn?: [number, number, number];
  enabled?: boolean;
};

export const CharacterController = React.forwardRef<CharacterControllerHandle, CharacterControllerProps>(({ spawn = [0, 6, 1], enabled = true }, ref) => {
  const rigidBody = useRef<RigidBodyApi>(null);
  const modelRef = useRef<THREE.Group>(null);
  const { rapier, world } = useRapier();
  const { isJumping: isMobileJumping, movement: mobileMovement } = useMobileControls();
  const [, getKeys] = useKeyboardControls();
  const { camera } = useThree();

  const [isGroundedVisual, setIsGroundedVisual] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const groundedRef = useRef(false);
  const isMovingRef = useRef(false);
  const isSprintingRef = useRef(false);

  const targetRotation = useRef(0);
  const currentRotation = useRef(0);
  const cameraForward = useRef(new Vector3());
  const cameraRight = useRef(new Vector3());
  const movementDirection = useRef(new Vector3());
  const worldUp = useRef(new Vector3(0, 1, 0));

  const controls = useCharacterControls();

  const readHitToi = (hit: unknown): number => {
    if (!hit || typeof hit !== 'object') return Infinity;
    const candidate = hit as { timeOfImpact?: number; toi?: number };
    if (typeof candidate.timeOfImpact === 'number') return candidate.timeOfImpact;
    if (typeof candidate.toi === 'number') return candidate.toi;
    return Infinity;
  };

  React.useEffect(() => {
    if (enabled) return;
    setIsMoving(false);
    setIsSprinting(false);
    setIsGroundedVisual(false);
    isMovingRef.current = false;
    isSprintingRef.current = false;
    groundedRef.current = false;
  }, [enabled]);

  useFrame(() => {
    if (!enabled || !rigidBody.current) return;

    const input = getKeys();
    const shouldJump = input.jump || isMobileJumping;
    const linvel = rigidBody.current.linvel();
    const translation = rigidBody.current.translation();

    const footY = translation.y + MODEL_BASE_Y;
    const probeOriginY = footY + GROUND_PROBE_START;
    const rayLength = GROUND_PROBE_START + GROUND_PROBE_MAX;

    let isGrounded = false;
    let closestHitT = Infinity;
    let bestHitNormalY = -1;

    for (const offset of FOOT_SAMPLE_OFFSETS) {
      const ray = new rapier.Ray(
        {
          x: translation.x + offset.x,
          y: probeOriginY,
          z: translation.z + offset.z,
        },
        { x: 0, y: -1, z: 0 },
      );

      const hit = world.castRayAndGetNormal(
        ray,
        rayLength,
        true,
        undefined,
        undefined,
        undefined,
        rigidBody.current,
      );

      const toi = readHitToi(hit);
      const normalY = hit?.normal?.y ?? -1;

      if (Number.isFinite(toi) && toi < closestHitT) {
        closestHitT = toi;
        bestHitNormalY = normalY;
      }
    }

    if (closestHitT !== Infinity) {
      const gapToGround = Math.max(0, closestHitT - GROUND_PROBE_START);
      isGrounded =
        gapToGround <= GROUND_PROBE_MAX
        && bestHitNormalY >= MIN_GROUND_NORMAL_Y;
    }

    groundedRef.current = isGrounded;
    if (isGroundedVisual !== isGrounded) {
      setIsGroundedVisual(isGrounded);
    }

    const horizontalSpeed = Math.hypot(linvel.x, linvel.z);
    const nextIsMoving = horizontalSpeed > 0.5;
    const nextIsSprinting = input.sprint && nextIsMoving;

    if (isMovingRef.current !== nextIsMoving) {
      isMovingRef.current = nextIsMoving;
      setIsMoving(nextIsMoving);
    }

    if (isSprintingRef.current !== nextIsSprinting) {
      isSprintingRef.current = nextIsSprinting;
      setIsSprinting(nextIsSprinting);
    }

    if (Math.abs(linvel.x) > 0.1 || Math.abs(linvel.z) > 0.1) {
      targetRotation.current = Math.atan2(linvel.x, linvel.z);

      let angleDiff = targetRotation.current - currentRotation.current;
      if (angleDiff > Math.PI) {
        angleDiff -= Math.PI * 2;
      } else if (angleDiff < -Math.PI) {
        angleDiff += Math.PI * 2;
      }
      targetRotation.current = currentRotation.current + angleDiff;
    }

    if (modelRef.current) {
      currentRotation.current = MathUtils.lerp(
        currentRotation.current,
        targetRotation.current,
        0.2,
      );
      modelRef.current.rotation.y = currentRotation.current;
    }

    let movement = calculateMovement(input, controls.moveSpeed);

    if (Math.abs(mobileMovement.x) > 0 || Math.abs(mobileMovement.y) > 0) {
      movement = {
        sprint: false,
        normalizedX: mobileMovement.x,
        normalizedZ: mobileMovement.y,
      };
    }

    if (movement) {
      const sprintMultiplier = movement.sprint ? controls.sprintMultiplier : 1;
      const moveForce = controls.moveSpeed * (isGrounded ? 1 : controls.airControl);

      camera.getWorldDirection(cameraForward.current);
      cameraForward.current.y = 0;
      if (cameraForward.current.lengthSq() < 1e-6) {
        cameraForward.current.set(0, 0, -1);
      } else {
        cameraForward.current.normalize();
      }

      cameraRight.current.crossVectors(cameraForward.current, worldUp.current).normalize();
      movementDirection.current
        .set(0, 0, 0)
        .addScaledVector(cameraForward.current, -movement.normalizedZ)
        .addScaledVector(cameraRight.current, movement.normalizedX);

      if (movementDirection.current.lengthSq() > 1e-6) {
        movementDirection.current.normalize();
      }

      const velocity = createMovementVelocity(
        movementDirection.current.x,
        movementDirection.current.z,
        moveForce * sprintMultiplier,
        linvel.y,
      );

      if (isGrounded) {
        const smoothing = 0.25;
        velocity.x = velocity.x * smoothing + linvel.x * (1 - smoothing);
        velocity.z = velocity.z * smoothing + linvel.z * (1 - smoothing);
      }

      rigidBody.current.setLinvel(velocity, true);
    }

    if (shouldJump && isGrounded && linvel.y <= JUMP_ALLOWED_MAX_UPWARD_VELOCITY) {
      rigidBody.current.setLinvel(
        { x: linvel.x, y: 0, z: linvel.z },
        true,
      );
      rigidBody.current.applyImpulse(
        createJumpImpulse(controls.jumpForce, { y: linvel.y }),
        true,
      );
    }
  });

  useImperativeHandle(ref, () => ({
    getPosition: () => {
      const translation = rigidBody.current?.translation();
      return new Vector3(
        translation?.x || 0,
        translation?.y || 0,
        translation?.z || 0,
      );
    },
    getIsGrounded: () => groundedRef.current,
    setPosition: (position: Vector3) => {
      rigidBody.current?.setTranslation(position, true);
    },
    setVelocity: (velocity: { x: number; y: number; z: number }) => {
      rigidBody.current?.setLinvel(velocity, true);
    },
    reset: (position: Vector3) => {
      rigidBody.current?.setTranslation(position, true);
      rigidBody.current?.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBody.current?.setAngvel({ x: 0, y: 0, z: 0 }, true);
      groundedRef.current = false;
      setIsGroundedVisual(false);
    },
  }), []);

  return (
    <RigidBody
      ref={rigidBody}
      colliders={false}
      mass={PLAYER_MASS}
      position={spawn}
      name="player"
      enabledRotations={[false, false, false]}
      lockRotations
      gravityScale={3}
      friction={controls.friction}
      linearDamping={controls.linearDamping}
      angularDamping={controls.angularDamping}
      restitution={0}
      ccd={true}
      maxCcdSubsteps={2}
      type={enabled ? 'dynamic' : 'fixed'}
    >
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} position={[0, CAPSULE_OFFSET_Y, 0]} />
      <group ref={modelRef} position={[0, MODEL_BASE_Y, 0]} scale={MODEL_SCALE} visible={enabled}>
        <CharacterModel
          isMoving={isMoving}
          isSprinting={isSprinting}
          isGrounded={isGroundedVisual}
        />
      </group>
    </RigidBody>
  );
});
