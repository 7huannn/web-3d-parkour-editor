import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';

type Vec3 = [number, number, number];

type SciFiParkourRoomProps = Readonly<{
  position: Vec3;
  size: Vec3;
  onSurfaceClick?: (event: ThreeEvent<MouseEvent>) => void;
}>;

type ModuleInstance = Readonly<{
  model: string;
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
}>;

const MODEL_ROOT = '/models/scifi-kit';
const ROOM_SCALE = 0.78;
const rampAngle = Math.atan2(2, 4);
const scaled = (value: number) => value * ROOM_SCALE;

const floorTiles = [
  ['Platform_Squares', 'Platform_3Plates', 'Platform_Metal2'],
  ['Platform_DarkPlates', 'Platform_CenterPlate', 'Platform_X'],
  ['Platform_Metal2', 'Platform_Simple', 'Platform_Squares'],
] as const;

const modules: readonly ModuleInstance[] = [
  ...[-4, 0, 4].flatMap((x, xIndex) => (
    [-4, 0, 4].map((z, zIndex) => ({
      model: floorTiles[zIndex][xIndex],
      position: [x, 0, z] as Vec3,
    }))
  )),
  { model: 'Platform_Ramp_4Wide', position: [0, 0, -4] },
  { model: 'Platform_Rails_4Wide', position: [0, 2, 0] },
  { model: 'Platform_Stairs_4Wide', position: [4, 0, 0], rotation: [0, Math.PI / 2, 0] },
  { model: 'Door_Frame_Square', position: [0, 0, -4], rotation: [0, -Math.PI / 2, 0] },
  { model: 'Prop_Crate4', position: [4.7, 0.56, 3.5], scale: [1.35, 1.35, 1.35] },
  { model: 'Prop_Computer', position: [-4.7, 0.8, 2.8], rotation: [0, Math.PI / 2, 0], scale: [1.15, 1.15, 1.15] },
  { model: 'Prop_Light_Floor', position: [-3.3, 0.05, -3.3] },
  { model: 'Prop_Light_Floor', position: [3.3, 0.05, 3.3], rotation: [0, Math.PI, 0] },
  { model: 'Prop_Light_Wide', position: [2.6, 2.2, -5.85], rotation: [0, Math.PI, 0] },
  { model: 'Prop_Rail_4', position: [-2, 2.1, 2.05], rotation: [0, Math.PI / 2, 0] },
  { model: 'Prop_Rail_4', position: [2, 2.1, 2.05], rotation: [0, Math.PI / 2, 0] },
  ...[-4, 0, 4].flatMap((z, index) => ([
    { model: index === 1 ? 'WallAstra_Straight_Window' : 'WallAstra_Straight', position: [-4, 0, z] as Vec3 },
    { model: 'ShortWall_WhitePlate2_Straight', position: [4, 0, z] as Vec3, rotation: [0, Math.PI, 0] as Vec3 },
  ])),
  ...[-4, 0, 4].flatMap((x, index) => ([
    { model: index === 1 ? 'WallWindow_Straight' : 'WallAstra_Straight', position: [x, 0, -4] as Vec3, rotation: [0, -Math.PI / 2, 0] as Vec3 },
    { model: index === 1 ? 'ShortWall_AccentStrip_Straight' : 'ShortWall_MetalPlates_Straight', position: [x, 0, 4] as Vec3, rotation: [0, Math.PI / 2, 0] as Vec3 },
  ])),
  { model: 'WallAstra_Corner_Square_Outer', position: [-4, 0, -4] },
  { model: 'WallAstra_Corner_Square_Outer', position: [4, 0, -4], rotation: [0, Math.PI / 2, 0] },
  { model: 'ShortWall_WhitePlate2_Corner_Outer', position: [4, 0, 4], rotation: [0, Math.PI, 0] },
  { model: 'ShortWall_AccentStrip_Corner_Outer', position: [-4, 0, 4], rotation: [0, -Math.PI / 2, 0] },
  ...[-4, 0, 4].flatMap((z) => ([
    { model: 'TopAstra_Straight', position: [-4, 0, z] as Vec3 },
  ])),
  ...[-4, 0, 4].map((x) => (
    { model: 'TopAstra_Straight', position: [x, 0, -4] as Vec3, rotation: [0, -Math.PI / 2, 0] as Vec3 }
  )),
  ...[-4, 0, 4].flatMap((z) => ([
    { model: 'BottomMetal_Straight', position: [-4, 0, z] as Vec3 },
    { model: 'BottomMetal_Straight', position: [4, 0, z] as Vec3, rotation: [0, Math.PI, 0] as Vec3 },
  ])),
  ...[-4, 0, 4].flatMap((x) => ([
    { model: 'BottomMetal_Straight', position: [x, 0, -4] as Vec3, rotation: [0, -Math.PI / 2, 0] as Vec3 },
    { model: 'BottomMetal_Straight', position: [x, 0, 4] as Vec3, rotation: [0, Math.PI / 2, 0] as Vec3 },
  ])),
];

function SciFiModule({ model, position, rotation = [0, 0, 0], scale = [1, 1, 1], onClick }: Readonly<ModuleInstance & {
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}>) {
  const { scene } = useGLTF(`${MODEL_ROOT}/${model}.gltf`);
  const clone = useMemo(() => {
    const next = scene.clone(true);
    next.traverse((child) => {
      if ('material' in child) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return next;
  }, [scene]);

  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <primitive object={clone} />
    </group>
  );
}

export function SciFiParkourRoom({ position, size, onSurfaceClick }: SciFiParkourRoomProps) {
  const baseY = -size[1] * 0.5;

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <group position={[0, baseY, 0]} scale={ROOM_SCALE}>
        {modules.map((module, index) => (
          <SciFiModule
            key={`${module.model}-${index}`}
            {...module}
            onClick={onSurfaceClick}
          />
        ))}
      </group>

      <CuboidCollider args={[scaled(7.1), 0.1, scaled(7.1)]} position={[0, baseY - 0.08, 0]} />
      <CuboidCollider args={[scaled(2.1), 0.1, scaled(2.25)]} position={[0, baseY + scaled(1), scaled(-2)]} rotation={[-rampAngle, 0, 0]} />
      <CuboidCollider args={[scaled(2.15), 0.1, scaled(1.95)]} position={[0, baseY + scaled(2), 0]} />
      <CuboidCollider args={[scaled(2.1), 0.1, scaled(2.25)]} position={[scaled(4), baseY + scaled(1), scaled(2)]} rotation={[-rampAngle, Math.PI / 2, 0]} />

      <CuboidCollider args={[0.2, scaled(1.25), scaled(6.2)]} position={[scaled(-6.2), baseY + scaled(1.25), 0]} />
      <CuboidCollider args={[0.2, scaled(0.65), scaled(6.2)]} position={[scaled(6.2), baseY + scaled(0.65), 0]} />
      <CuboidCollider args={[scaled(6.2), scaled(1.25), 0.2]} position={[0, baseY + scaled(1.25), scaled(-6.2)]} />
      <CuboidCollider args={[scaled(6.2), scaled(0.65), 0.2]} position={[0, baseY + scaled(0.65), scaled(6.2)]} />
    </RigidBody>
  );
}

[
  'Platform_Squares',
  'Platform_CenterPlate',
  'Platform_3Plates',
  'Platform_DarkPlates',
  'Platform_Metal2',
  'Platform_Simple',
  'Platform_X',
  'Platform_Ramp_4Wide',
  'Platform_Stairs_4Wide',
  'Platform_Rails_4Wide',
  'Door_Frame_Square',
  'WallAstra_Straight',
  'WallAstra_Straight_Window',
  'WallAstra_Corner_Square_Outer',
  'WallWindow_Straight',
  'ShortWall_AccentStrip_Straight',
  'ShortWall_AccentStrip_Corner_Outer',
  'ShortWall_MetalPlates_Straight',
  'ShortWall_WhitePlate2_Straight',
  'ShortWall_WhitePlate2_Corner_Outer',
  'TopAstra_Straight',
  'BottomMetal_Straight',
  'Prop_Crate4',
  'Prop_Computer',
  'Prop_Light_Floor',
  'Prop_Light_Wide',
  'Prop_Rail_4',
].forEach((model) => useGLTF.preload(`${MODEL_ROOT}/${model}.gltf`));
