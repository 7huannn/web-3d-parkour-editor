import { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';

const BRIDGE_DEFAULTS = {
  plankCount: 12,
  plankLength: 2,
  plankDistance: 0.9,
  anchorOffset: 10,
} as const;

export function Bridge() {
  const planks = useMemo(() => {
    const segment = (BRIDGE_DEFAULTS.anchorOffset * 2) / (BRIDGE_DEFAULTS.plankCount - 1);
    return Array.from({ length: BRIDGE_DEFAULTS.plankCount }, (_, index) => ({
      index,
      x: -BRIDGE_DEFAULTS.anchorOffset + segment * index,
      isAnchor: index === 0 || index === BRIDGE_DEFAULTS.plankCount - 1,
    }));
  }, []);

  return (
    <group position={[0, 3, 0]}>
      {planks.map((plank) => (
        <RigidBody
          key={plank.index}
          position={[plank.x, 0, 0]}
          colliders="cuboid"
          type={plank.isAnchor ? 'fixed' : 'dynamic'}
          mass={plank.isAnchor ? 0 : 1}
          linearDamping={2}
          angularDamping={2}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.6, 0.2, BRIDGE_DEFAULTS.plankLength]} />
            <meshStandardMaterial
              color={plank.isAnchor ? '#4A5568' : '#805E3B'}
              roughness={0.8}
              metalness={0.2}
            />
          </mesh>
        </RigidBody>
      ))}
    </group>
  );
}
