import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { PARKOUR_LEVEL } from './parkourLevelConfig';
import { MovingPlatform } from './MovingPlatform';
import { RotatingObstacle } from './RotatingObstacle';
import { HazardZone } from './HazardZone';
import { FinishZone } from './FinishZone';
import { Checkpoint } from './Checkpoint';
import { GraphicsShowcase } from './GraphicsShowcase';
import { Building } from './Building';
import type { RenderMode, TransformState } from '../types/game';

type ParkourLevelProps = {
  renderMode: RenderMode;
  textureUrl: string | null;
  transformState: TransformState;
  activeCheckpointIndex: number | null;
};

export function ParkourLevel({
  renderMode,
  textureUrl,
  transformState,
  activeCheckpointIndex,
}: ParkourLevelProps) {
  return (
    <group>
      <mesh receiveShadow position={[0, -2.5, 20]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0B1020" roughness={0.9} metalness={0.05} />
      </mesh>

      <RigidBody type="fixed" position={PARKOUR_LEVEL.startPad.position}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={PARKOUR_LEVEL.startPad.size} />
          <meshStandardMaterial color={PARKOUR_LEVEL.startPad.color} roughness={0.4} metalness={0.1} />
        </mesh>
        <CuboidCollider args={[PARKOUR_LEVEL.startPad.size[0] * 0.5, PARKOUR_LEVEL.startPad.size[1] * 0.5, PARKOUR_LEVEL.startPad.size[2] * 0.5]} />
      </RigidBody>

      <group position={[0, 1.1, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.6, 0.2, 16, 48]} />
          <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={0.4} />
        </mesh>
      </group>

      <RigidBody type="fixed" colliders="cuboid" position={PARKOUR_LEVEL.showcasePad.position}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={PARKOUR_LEVEL.showcasePad.size} />
          <meshStandardMaterial color={PARKOUR_LEVEL.showcasePad.color} roughness={0.6} metalness={0.15} />
        </mesh>
      </RigidBody>

      {PARKOUR_LEVEL.platforms.map((platform) => (
        <RigidBody key={platform.id} type="fixed" colliders="cuboid" position={platform.position}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={platform.size} />
            <meshStandardMaterial color={platform.color} roughness={0.55} metalness={0.1} />
          </mesh>
        </RigidBody>
      ))}

      {PARKOUR_LEVEL.movingPlatforms.map((platform) => (
        <MovingPlatform
          key={platform.id}
          start={platform.start}
          end={platform.end}
          size={platform.size}
          color={platform.color}
          speed={platform.speed}
        />
      ))}

      {PARKOUR_LEVEL.rotatingObstacles.map((obstacle) => (
        <RotatingObstacle
          key={obstacle.id}
          position={obstacle.position}
          size={obstacle.size}
          color={obstacle.color}
          speed={obstacle.speed}
        />
      ))}

      {PARKOUR_LEVEL.hazards.map((hazard) => (
        <HazardZone key={hazard.id} position={hazard.position} size={hazard.size} />
      ))}

      {PARKOUR_LEVEL.checkpoints.map((checkpoint, index) => (
        <Checkpoint
          key={checkpoint.id}
          position={checkpoint.position}
          size={checkpoint.size}
          active={activeCheckpointIndex !== null && activeCheckpointIndex >= index}
        />
      ))}

      <RigidBody type="fixed" colliders="cuboid" position={PARKOUR_LEVEL.finishPad.position}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={PARKOUR_LEVEL.finishPad.size} />
          <meshStandardMaterial color={PARKOUR_LEVEL.finishPad.color} roughness={0.4} metalness={0.1} />
        </mesh>
      </RigidBody>

      <FinishZone position={PARKOUR_LEVEL.finishZone.position} size={PARKOUR_LEVEL.finishZone.size} />

      <GraphicsShowcase renderMode={renderMode} textureUrl={textureUrl} transformState={transformState} />

      <Building position={[12, 0, -8]} scale={1} />
    </group>
  );
}
