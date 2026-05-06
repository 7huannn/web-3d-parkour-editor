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
  readonly textureUrl: string | null;
  readonly isBuildMode?: boolean;
  readonly onPlaceBlock?: (
    payload: {
      point: { x: number; y: number; z: number };
      source: 'block';
      blockId: string;
      normal: [number, number, number];
    },
  ) => void;
  readonly selected?: boolean;
  readonly onSelectBlock?: (id: string | null) => void;
};

function BuildInteractionBox({
  size,
  selected,
  onClick,
  onContextMenu,
}: Readonly<{
  size: [number, number, number];
  selected: boolean;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
  onContextMenu: (event: ThreeEvent<MouseEvent>) => void;
}>) {
  const paddedSize = useMemo<[number, number, number]>(
    () => [size[0] + 0.02, size[1] + 0.02, size[2] + 0.02],
    [size],
  );
  const geometry = useMemo(() => new BoxGeometry(paddedSize[0], paddedSize[1], paddedSize[2]), [paddedSize]);
  const edges = useMemo(() => new EdgesGeometry(geometry), [geometry]);

  return (
    <>
      <mesh geometry={geometry} onClick={onClick} onContextMenu={onContextMenu}>
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {selected && (
        <lineSegments geometry={edges} renderOrder={1000}>
          <lineBasicMaterial color="#FDBA74" />
        </lineSegments>
      )}
    </>
  );
}

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

export function MapBlock({ block, textureUrl, isBuildMode = false, onPlaceBlock, selected = false, onSelectBlock }: MapBlockProps) {
  const texture = useTexture(textureUrl || '/final-texture.png');

  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, 1);
  const blockRenderMode = block.renderMode ?? 'solid';

  const geometry = useMemo(() => getGeometry(block.kind, block.size), [block.kind, block.size]);
  const position = block.position;
  const handleSurfaceClick = (event: ThreeEvent<MouseEvent>) => {
    if (!isBuildMode) return;
    event.stopPropagation();
    onSelectBlock?.(block.id);
    if (onPlaceBlock) {
      const normal = event.face?.normal
        ? event.face.normal.clone().transformDirection(event.object.matrixWorld)
        : null;
      onPlaceBlock({
        point: event.point,
        source: 'block',
        blockId: block.id,
        normal: normal ? [normal.x, normal.y, normal.z] : [0, 1, 0],
      });
    }
  };

  const handleContext = (event: ThreeEvent<MouseEvent>) => {
    if (!isBuildMode) return;
    event.stopPropagation();
    // prevent browser context menu
    const nativeEvent = event.nativeEvent as MouseEvent & { stopImmediatePropagation?: () => void };
    nativeEvent.preventDefault();
    nativeEvent.stopImmediatePropagation?.();
    if (onSelectBlock) onSelectBlock(block.id);
  };

  if (block.kind === 'spawn') {
    return (
      <group onClick={handleSurfaceClick} onContextMenu={handleContext}>
        <SpawnMarker position={position} size={block.size} active />
        {isBuildMode && (
          <group position={position}>
            <BuildInteractionBox
              size={block.size}
              selected={selected}
              onClick={handleSurfaceClick}
              onContextMenu={handleContext}
            />
          </group>
        )}
      </group>
    );
  }

  if (block.kind === 'checkpoint') {
    return (
      <group onClick={handleSurfaceClick} onContextMenu={handleContext}>
        <Checkpoint position={position} size={block.size} active />
        {isBuildMode && (
          <group position={position}>
            <BuildInteractionBox
              size={block.size}
              selected={selected}
              onClick={handleSurfaceClick}
              onContextMenu={handleContext}
            />
          </group>
        )}
      </group>
    );
  }

  if (block.kind === 'hazard') {
    return (
      <group onClick={handleSurfaceClick} onContextMenu={handleContext}>
        <HazardZone position={position} size={block.size} />
        {isBuildMode && (
          <group position={position}>
            <BuildInteractionBox
              size={block.size}
              selected={selected}
              onClick={handleSurfaceClick}
              onContextMenu={handleContext}
            />
          </group>
        )}
      </group>
    );
  }

  if (block.kind === 'finish') {
    return (
      <group onClick={handleSurfaceClick} onContextMenu={handleContext}>
        <FinishZone position={position} size={block.size} />
        {isBuildMode && (
          <group position={position}>
            <BuildInteractionBox
              size={block.size}
              selected={selected}
              onClick={handleSurfaceClick}
              onContextMenu={handleContext}
            />
          </group>
        )}
      </group>
    );
  }

  const modelBlockConfig = getModelBlockConfig(block);
  if (modelBlockConfig) {
    return (
      <group onClick={handleSurfaceClick} onContextMenu={handleContext}>
        <Building
          position={position}
          modelUrl={modelBlockConfig.modelUrl}
          scale={modelBlockConfig.scale}
          baseOffsetY={modelBlockConfig.baseOffsetY}
        />
        {isBuildMode && (
          <group position={position} rotation={block.rotation}>
            <BuildInteractionBox
              size={block.size}
              selected={selected}
              onClick={handleSurfaceClick}
              onContextMenu={handleContext}
            />
          </group>
        )}
      </group>
    );
  }

  let colliderType: 'ball' | 'cuboid' | 'hull' = 'hull';
  if (block.kind === 'sphere') {
    colliderType = 'ball';
  } else if (block.kind === 'box' || block.kind === 'platform' || block.kind === 'ramp') {
    colliderType = 'cuboid';
  }

  return (
    <group onClick={handleSurfaceClick} onContextMenu={handleContext}>
      <RigidBody type="fixed" position={position} rotation={block.rotation} colliders={colliderType}>
        <RenderModePrimitive
          geometry={geometry}
          color={block.color}
          renderMode={blockRenderMode}
          texture={blockRenderMode === 'solid' ? texture : null}
        />
      </RigidBody>
      {isBuildMode && (
        <group position={position} rotation={block.rotation}>
          <BuildInteractionBox
            size={block.size}
            selected={selected}
            onClick={handleSurfaceClick}
            onContextMenu={handleContext}
          />
        </group>
      )}
    </group>
  );
}
