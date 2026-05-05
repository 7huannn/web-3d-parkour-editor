import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  EdgesGeometry,
  RepeatWrapping,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { BufferGeometry, Texture } from 'three';
import { TeapotGeometry } from 'three/examples/jsm/geometries/TeapotGeometry';
import { Building } from './Building';
import { Checkpoint } from './Checkpoint';
import { FinishZone } from './FinishZone';
import { HazardZone } from './HazardZone';
import { SpawnMarker } from './SpawnMarker';
import { SciFiParkourRoom } from './SciFiParkourRoom';
import type { MapBlock, RenderMode } from '../types/game';

function getGeometry(kind: MapBlock['kind'], size: [number, number, number]) {
  switch (kind) {
    case 'sphere':
      return new SphereGeometry(size[0] * 0.5, 24, 24);
    case 'cone':
      return new ConeGeometry(size[0] * 0.5, size[1], 20);
    case 'cylinder':
      return new CylinderGeometry(size[0] * 0.5, size[0] * 0.5, size[1], 20);
    case 'wheel':
      return new TorusGeometry(size[0] * 0.45, size[0] * 0.18, 12, 28);
    case 'teapot':
      return new TeapotGeometry(size[0] * 0.35);
    default:
      return new BoxGeometry(size[0], size[1], size[2]);
  }
}

function RenderModePrimitive({
  geometry,
  color,
  renderMode,
  texture,
  onClick,
}: Readonly<{
  geometry: BufferGeometry;
  color: string;
  renderMode: RenderMode;
  texture?: Texture | null;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}>) {
  const edges = useMemo(() => new EdgesGeometry(geometry), [geometry]);

  if (renderMode === 'points') {
    return (
      <points geometry={geometry} onClick={onClick}>
        <pointsMaterial size={0.08} sizeAttenuation color={color} />
      </points>
    );
  }

  if (renderMode === 'lines') {
    return (
      <lineSegments geometry={edges} onClick={onClick}>
        <lineBasicMaterial color={color} />
      </lineSegments>
    );
  }

  return (
    <mesh geometry={geometry} castShadow receiveShadow onClick={onClick}>
      <meshStandardMaterial color={color} map={texture ?? undefined} roughness={0.6} metalness={0.15} />
    </mesh>
  );
}

type MapBlockProps = {
  readonly block: MapBlock;
  readonly renderMode: RenderMode;
  readonly textureUrl: string | null;
  readonly isBuildMode?: boolean;
  readonly onPlaceBlock?: (point: { x: number; y: number; z: number }) => void;
};

function getModelBlockConfig(block: MapBlock) {
  if (block.kind === 'building') {
    return {
      modelUrl: '/models/building.glb',
      scale: Math.max(0.5, block.size[1] / 5),
      baseOffsetY: -block.size[1] * 0.5,
    };
  }

  return null;
}

export function MapBlock({ block, renderMode, textureUrl, isBuildMode = false, onPlaceBlock }: MapBlockProps) {
  const texture = useTexture(textureUrl || '/final-texture.png');

  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, 1);

  const geometry = useMemo(() => getGeometry(block.kind, block.size), [block.kind, block.size]);
  const position = block.position;
  const handleSurfaceClick = (event: ThreeEvent<MouseEvent>) => {
    if (!isBuildMode || !onPlaceBlock) return;
    event.stopPropagation();
    onPlaceBlock(event.point);
  };

  if (block.kind === 'spawn') {
    return (
      <group onClick={handleSurfaceClick}>
        <SpawnMarker position={position} size={block.size} active />
      </group>
    );
  }

  if (block.kind === 'checkpoint') {
    return (
      <group onClick={handleSurfaceClick}>
        <Checkpoint position={position} size={block.size} active />
      </group>
    );
  }

  if (block.kind === 'hazard') {
    return (
      <group onClick={handleSurfaceClick}>
        <HazardZone position={position} size={block.size} />
      </group>
    );
  }

  if (block.kind === 'finish') {
    return (
      <group onClick={handleSurfaceClick}>
        <FinishZone position={position} size={block.size} />
      </group>
    );
  }

  if (block.kind === 'sci-fi-room') {
    return (
      <SciFiParkourRoom
        position={position}
        size={block.size}
        onSurfaceClick={handleSurfaceClick}
      />
    );
  }

  const modelBlockConfig = getModelBlockConfig(block);
  if (modelBlockConfig) {
    return (
      <Building
        position={position}
        modelUrl={modelBlockConfig.modelUrl}
        scale={modelBlockConfig.scale}
        baseOffsetY={modelBlockConfig.baseOffsetY}
        onClick={handleSurfaceClick}
      />
    );
  }

  let colliderType: 'ball' | 'cuboid' | 'hull' = 'hull';
  if (block.kind === 'sphere') {
    colliderType = 'ball';
  } else if (block.kind === 'box' || block.kind === 'platform' || block.kind === 'ramp') {
    colliderType = 'cuboid';
  }

  return (
    <RigidBody type="fixed" position={position} rotation={block.rotation} colliders={colliderType}>
      <RenderModePrimitive
        geometry={geometry}
        color={block.color}
        renderMode={renderMode}
        texture={renderMode === 'solid' ? texture : null}
        onClick={handleSurfaceClick}
      />
    </RigidBody>
  );
}
