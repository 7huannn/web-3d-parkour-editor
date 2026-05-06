import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useMemo } from 'react';
import { TeapotGeometry } from 'three/examples/jsm/geometries/TeapotGeometry';
import { MapBlock } from './MapBlock';
import type { MapBlock as MapBlockType, RenderMode, TransformState, UiTheme } from '../types/game';
import { useTexture } from '@react-three/drei';
import { EdgesGeometry, RepeatWrapping } from 'three';

type MapSceneProps = {
  readonly blocks: MapBlockType[];
  readonly renderMode: RenderMode;
  readonly textureUrl: string | null;
  readonly transformState: TransformState;
  readonly showTransformPreview: boolean;
  readonly isBuildMode: boolean;
  readonly theme: UiTheme;
  readonly onPlaceBlock?: (payload: {
    point: { x: number; y: number; z: number };
    source: 'ground' | 'block';
    blockId?: string;
    normal?: [number, number, number];
  }) => void;
  readonly selectedBlockId?: string | null;
  readonly onSelectBlock?: (id: string | null) => void;
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

export function MapScene({
  blocks,
  renderMode,
  textureUrl,
  transformState,
  showTransformPreview,
  isBuildMode,
  theme,
  onPlaceBlock,
  selectedBlockId,
  onSelectBlock,
}: MapSceneProps) {
  const isLight = theme === 'light';

  return (
    <group>
      {isBuildMode && (
        <>
          <RigidBody type="fixed" position={[0, -0.5, 0]}>
            <mesh receiveShadow onClick={(event) => {
              if (!onPlaceBlock) return;
              event.stopPropagation();
              onPlaceBlock({
                point: event.point,
                source: 'ground',
              });
            }}>
              <boxGeometry args={[200, 1, 200]} />
              <meshStandardMaterial
                color={isLight ? '#E6EDF8' : '#0B1020'}
                roughness={0.95}
                metalness={0.03}
              />
            </mesh>
            <CuboidCollider args={[100, 0.5, 100]} />
          </RigidBody>

          <gridHelper
            args={[200, 40, isLight ? '#94A3B8' : '#334155', isLight ? '#CBD5E1' : '#1E293B']}
            position={[0, 0.01, 0]}
          />

          <group position={[0, 0.02, 0]}>
            <mesh>
              <sphereGeometry args={[0.18, 20, 20]} />
              <meshStandardMaterial
                color={isLight ? '#2563EB' : '#38BDF8'}
                emissive={isLight ? '#2563EB' : '#38BDF8'}
                emissiveIntensity={0.5}
                transparent
                opacity={0.75}
              />
            </mesh>
          </group>
        </>
      )}

      {isBuildMode && showTransformPreview && (
        <TransformPreview
          renderMode={renderMode}
          textureUrl={textureUrl}
          transformState={transformState}
        />
      )}

      {blocks.map((block) => (
        <MapBlock
          key={block.id}
          block={block}
          textureUrl={textureUrl}
          isBuildMode={isBuildMode}
          onPlaceBlock={onPlaceBlock}
          selected={selectedBlockId === block.id}
          onSelectBlock={onSelectBlock}
        />
      ))}
    </group>
  );
}
