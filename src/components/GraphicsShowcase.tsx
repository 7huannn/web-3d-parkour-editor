import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  EdgesGeometry,
  RepeatWrapping,
} from 'three';
import type { BufferGeometry, Texture } from 'three';
import { TeapotGeometry } from 'three/examples/jsm/geometries/TeapotGeometry';
import type { RenderMode, TransformState } from '../types/game';

type RenderModePrimitiveProps = {
  geometry: BufferGeometry;
  color: string;
  renderMode: RenderMode;
  texture?: Texture | null;
};

function RenderModePrimitive({ geometry, color, renderMode, texture }: RenderModePrimitiveProps) {
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

type GraphicsShowcaseProps = {
  renderMode: RenderMode;
  textureUrl: string | null;
  transformState: TransformState;
};

export function GraphicsShowcase({ renderMode, textureUrl, transformState }: GraphicsShowcaseProps) {
  const texture = useTexture(textureUrl || '/final-texture.png');
  const transformGeometry = useMemo(() => new TeapotGeometry(0.7), []);

  const shapes = useMemo(() => {
    return [
      {
        id: 'box',
        geometry: new BoxGeometry(1.2, 1.2, 1.2),
        position: [-2.5, 1.1, -2.2] as [number, number, number],
        color: '#60A5FA',
        textured: true,
      },
      {
        id: 'sphere',
        geometry: new SphereGeometry(0.8, 24, 24),
        position: [0, 1.05, -2.2] as [number, number, number],
        color: '#F472B6',
      },
      {
        id: 'cone',
        geometry: new ConeGeometry(0.8, 1.6, 20),
        position: [2.5, 1.0, -2.2] as [number, number, number],
        color: '#F59E0B',
      },
      {
        id: 'cylinder',
        geometry: new CylinderGeometry(0.7, 0.7, 1.6, 20),
        position: [-2.5, 1.0, 0.6] as [number, number, number],
        color: '#34D399',
      },
      {
        id: 'wheel',
        geometry: new TorusGeometry(0.8, 0.25, 12, 28),
        position: [0, 1.0, 0.6] as [number, number, number],
        color: '#A78BFA',
      },
      {
        id: 'teapot',
        geometry: new TeapotGeometry(0.6),
        position: [2.5, 0.95, 0.6] as [number, number, number],
        color: '#F87171',
      },
    ];
  }, []);

  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, 1);

  return (
    <group position={[-12, 0, -6]}>
      {shapes.map((shape) => (
        <group key={shape.id} position={shape.position}>
          <RenderModePrimitive
            geometry={shape.geometry}
            color={shape.color}
            renderMode={renderMode}
            texture={shape.textured ? texture : null}
          />
        </group>
      ))}

      <group
        position={transformState.position}
        rotation={transformState.rotation}
        scale={transformState.scale}
      >
        <RenderModePrimitive
          geometry={transformGeometry}
          color="#22D3EE"
          renderMode={renderMode}
          texture={renderMode === 'solid' ? texture : null}
        />
      </group>
    </group>
  );
}
