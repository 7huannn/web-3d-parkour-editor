import { useMemo } from 'react';
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
}: Readonly<{
  geometry: BufferGeometry;
  color: string;
  renderMode: RenderMode;
  texture?: Texture | null;
}>) {
  const edges = useMemo(() => new EdgesGeometry(geometry), [geometry]);

  if (renderMode === 'points') {
    return (
      <points geometry={geometry}>
        <pointsMaterial size={0.08} sizeAttenuation color={color} />
      </points>
    );
  }

  if (renderMode === 'lines') {
    return (
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={color} />
      </lineSegments>
    );
  }

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} map={texture ?? undefined} roughness={0.6} metalness={0.15} />
    </mesh>
  );
}

type MapBlockProps = {
  readonly block: MapBlock;
  readonly renderMode: RenderMode;
  readonly textureUrl: string | null;
};

export function MapBlock({ block, renderMode, textureUrl }: MapBlockProps) {
  const texture = useTexture(textureUrl || '/final-texture.png');

  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, 1);

  const geometry = useMemo(() => getGeometry(block.kind, block.size), [block.kind, block.size]);
  const position = block.position;

  if (block.kind === 'checkpoint') {
    return <Checkpoint position={position} size={block.size} active />;
  }

  if (block.kind === 'hazard') {
    return <HazardZone position={position} size={block.size} />;
  }

  if (block.kind === 'finish') {
    return <FinishZone position={position} size={block.size} />;
  }

  if (block.kind === 'building') {
    return <Building position={position} scale={Math.max(0.5, block.size[1] / 5)} />;
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
      />
    </RigidBody>
  );
}
