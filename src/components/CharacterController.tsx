import React, { useImperativeHandle, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, MathUtils } from 'three';
import { CapsuleCollider, RigidBody, RigidBodyApi, useRapier } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import { useCharacterControls } from '../hooks/useCharacterControls';
import { calculateMovement, createJumpImpulse, createMovementVelocity } from '../utils/physics';
import { useMobileControls } from '../contexts/useMobileControls';
import { CharacterModel } from './CharacterModel';

export type CharacterState = {
  moveSpeed: number;
  jumpForce: number;
  airControl: number;
  isGrounded: boolean;
  velocity: { x: number; y: number; z: number };
};

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
  const [isSprinting, setIsSprinting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);
  const cameraForward = useRef(new Vector3());
  const cameraRight = useRef(new Vector3());
  const movementDirection = useRef(new Vector3());
  const worldUp = useRef(new Vector3(0, 1, 0));
  const [state, setState] = useState<CharacterState>({
    moveSpeed: 0,
    jumpForce: 0,
    airControl: 0,
    isGrounded: false,
    velocity: { x: 0, y: 0, z: 0 },
  });

  const controls = useCharacterControls();

  React.useEffect(() => {
    if (enabled) return;
    setIsMoving(false);
    setIsSprinting(false);
  }, [enabled]);

  useFrame(() => {
    if (!enabled || !rigidBody.current) return;

    // Cast multiple rays for better ground detection
    const translation = rigidBody.current.translation();
    const rayLength = 3.5; // Increased length for better detection of distant ground
    const rayDir = { x: 0, y: -1, z: 0 };
    
    // Cast rays from multiple points around the character
    const rayOffsets = [
      { x: 0, z: 0 },      // Center
      { x: 0.3, z: 0 },    // Right
      { x: -0.3, z: 0 },   // Left
      { x: 0, z: 0.3 },    // Front
      { x: 0, z: -0.3 },   // Back
    ];
    
    let isGrounded = false;
    let closestHit = null;
    
    for (const offset of rayOffsets) {
      const ray = new rapier.Ray(
        { 
          x: translation.x + offset.x, 
          y: translation.y, 
          z: translation.z + offset.z 
        },
        rayDir
      );
      
      const hit = world.castRay(
        ray,
        rayLength,
        true,
        undefined,
        undefined,
        undefined,
        rigidBody.current
      );
      
      if (hit && (!closestHit || hit.toi < closestHit.toi)) {
        closestHit = hit;
        isGrounded = true;
      }
    }

    const input = getKeys();
    const shouldJump = input.jump || isMobileJumping;
    const linvel = rigidBody.current.linvel();
    // Update movement state
    const horizontalSpeed = Math.hypot(linvel.x, linvel.z);
    setIsMoving(horizontalSpeed > 0.5);
    setIsSprinting(input.sprint && horizontalSpeed > 0.5);

    // Update rotation based on velocity
    if (Math.abs(linvel.x) > 0.1 || Math.abs(linvel.z) > 0.1) {
      targetRotation.current = Math.atan2(linvel.x, linvel.z);
      
      // Normalize angle difference to ensure shortest rotation path
      let angleDiff = targetRotation.current - currentRotation.current;
      if (angleDiff > Math.PI) {
        angleDiff -= Math.PI * 2;
      } else if (angleDiff < -Math.PI) {
        angleDiff += Math.PI * 2;
      }
      targetRotation.current = currentRotation.current + angleDiff;
    }
    
    // Smooth rotation
    if (modelRef.current) {
      currentRotation.current = MathUtils.lerp(
        currentRotation.current,
        targetRotation.current,
        0.2
      );
      modelRef.current.rotation.y = currentRotation.current;
    }

    // Handle movement
    let movement = calculateMovement(input, controls.moveSpeed);
    
    // Override keyboard movement with mobile joystick if active
    if (Math.abs(mobileMovement.x) > 0 || Math.abs(mobileMovement.y) > 0) {
      movement = {
        sprint: false,
        normalizedX: mobileMovement.x,
        normalizedZ: mobileMovement.y
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
        linvel.y
      );
      
      // Smooth out the velocity changes
      if (isGrounded) {
        const smoothing = 0.25;
        velocity.x = velocity.x * smoothing + linvel.x * (1 - smoothing);
        velocity.z = velocity.z * smoothing + linvel.z * (1 - smoothing);
      }

      rigidBody.current.setLinvel(velocity, true);
    }

    // Handle jumping
    if (shouldJump && isGrounded) {
      // Reset vertical velocity before jumping
      rigidBody.current.setLinvel(
        { x: linvel.x, y: 0, z: linvel.z },
        true
      );
      rigidBody.current.applyImpulse(
        createJumpImpulse(controls.jumpForce, { y: linvel.y }),
        true
      );
    }

    setState({ 
      moveSpeed: controls.moveSpeed, 
      jumpForce: controls.jumpForce, 
      airControl: controls.airControl, 
      isGrounded, 
      velocity: linvel 
    });
  });

  useImperativeHandle(ref, () => ({
    getPosition: () => {
      const translation = rigidBody.current?.translation();
      return new Vector3(
        translation?.x || 0,
        translation?.y || 0,
        translation?.z || 0
      );
    },
    getIsGrounded: () => state.isGrounded,
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
    },
  }), [state.isGrounded]);

  return (
    <RigidBody
      ref={rigidBody}
      colliders={false}
      mass={10}
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
      <CapsuleCollider args={[0.8, 0.4]} position={[0, -0.2, 0]} />
      <group ref={modelRef} position={[0, -1.15, 0]} scale={1.5} visible={enabled}>
        <CharacterModel 
          isMoving={isMoving} 
          isSprinting={isSprinting} 
          isGrounded={state.isGrounded} 
        />
      </group>
    </RigidBody>
  );
});
