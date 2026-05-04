import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useMemo } from 'react';
import { TeapotGeometry } from 'three/examples/jsm/geometries/TeapotGeometry';
import { MapBlock } from './MapBlock';
import type { MapBlock as MapBlockType, RenderMode, TransformState } from '../types/game';
import { useTexture } from '@react-three/drei';
import { EdgesGeometry, RepeatWrapping } from 'three';

type MapSceneProps = {
  readonly blocks: MapBlockType[];
  readonly renderMode: RenderMode;
  readonly textureUrl: string | null;
  readonly transformState: TransformState;
  readonly isBuildMode: boolean;
  readonly onPlaceBlock?: (point: { x: number; y: number; z: number }) => void;
};

function TransformPreview({ renderMode, textureUrl, transformState }: Readonly<{
  renderMode: RenderMode;
  textureUrl: string | null;
  transformState: TransformState;
}>) {
  const texture = useTexture(textureUrl || '/final-texture.png');
  const geometry = useMemo(() => new TeapotGeometry(0.7), []);
  const edges = useMemo(() => new EdgesGeometry(geometry), [geometry]);

  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, 1);

  if (renderMode === 'points') {
    return (
      <group position={transformState.position} rotation={transformState.rotation} scale={transformState.scale}>
        <points geometry={geometry}>
          <pointsMaterial size={0.08} sizeAttenuation color="#22D3EE" />
        </points>
      </group>
    );
  }

  if (renderMode === 'lines') {
    return (
      <group position={transformState.position} rotation={transformState.rotation} scale={transformState.scale}>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="#22D3EE" />
        </lineSegments>
      </group>
    );
  }

  return (
    <group position={transformState.position} rotation={transformState.rotation} scale={transformState.scale}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#22D3EE" map={texture} roughness={0.55} metalness={0.15} />
      </mesh>
    </group>
  );
}

export function MapScene({ blocks, renderMode, textureUrl, transformState, isBuildMode, onPlaceBlock }: MapSceneProps) {
  return (
    <group>
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow onClick={(event) => {
          if (!isBuildMode || !onPlaceBlock) return;
          event.stopPropagation();
          onPlaceBlock(event.point);
        }}>
          <boxGeometry args={[200, 1, 200]} />
          <meshStandardMaterial color="#0B1020" roughness={0.95} metalness={0.03} />
        </mesh>
        <CuboidCollider args={[100, 0.5, 100]} />
      </RigidBody>

      <gridHelper args={[200, 40, '#334155', '#1E293B']} position={[0, 0.01, 0]} />

      <group position={[0, 0.02, 0]}>
        <mesh>
          <sphereGeometry args={[0.18, 20, 20]} />
          <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={0.5} transparent opacity={0.75} />
        </mesh>
      </group>

      <RigidBody type="fixed" position={[0, 0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[6, 1, 6]} />
          <meshStandardMaterial color="#4F46E5" roughness={0.8} metalness={0.1} />
        </mesh>
        <CuboidCollider args={[3, 0.5, 3]} />
      </RigidBody>

      {blocks.map((block) => (
        <MapBlock key={block.id} block={block} renderMode={renderMode} textureUrl={textureUrl} />
      ))}
    </group>
  );
}
