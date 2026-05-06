import type { MapBlock, MapBlockKind } from '../types/game';

export type MapCatalogItem = {
  kind: MapBlockKind;
  label: string;
  description: string;
  color: string;
  swatchClass: string;
  size: [number, number, number];
  rotation?: [number, number, number];
};

export const MAP_BLOCK_CATALOG: ReadonlyArray<MapCatalogItem> = [
  {
    kind: 'platform',
    label: 'Platform',
    description: 'Basic walkable platform',
    color: '#60A5FA',
    swatchClass: 'bg-sky-400',
    size: [4, 0.6, 4],
  },
  {
    kind: 'ramp',
    label: 'Ramp',
    description: 'Simple incline',
    color: '#F59E0B',
    swatchClass: 'bg-amber-400',
    size: [4, 1.2, 4],
    rotation: [-Math.PI / 8, 0, 0],
  },
  {
    kind: 'box',
    label: 'Box',
    description: 'Solid cube obstacle',
    color: '#A78BFA',
    swatchClass: 'bg-violet-400',
    size: [2, 2, 2],
  },
  {
    kind: 'sphere',
    label: 'Sphere',
    description: 'Round obstacle',
    color: '#F472B6',
    swatchClass: 'bg-pink-400',
    size: [1.8, 1.8, 1.8],
  },
  {
    kind: 'cone',
    label: 'Cone',
    description: 'Pointy obstacle',
    color: '#F97316',
    swatchClass: 'bg-orange-400',
    size: [1.8, 2.2, 1.8],
  },
  {
    kind: 'cylinder',
    label: 'Cylinder',
    description: 'Vertical pillar',
    color: '#34D399',
    swatchClass: 'bg-emerald-400',
    size: [1.6, 2.6, 1.6],
  },
  {
    kind: 'wheel',
    label: 'Wheel',
    description: 'Torus ring block',
    color: '#A855F7',
    swatchClass: 'bg-fuchsia-500',
    size: [2.2, 2.2, 2.2],
  },
  {
    kind: 'teapot',
    label: 'Teapot',
    description: 'Classic 3D model',
    color: '#FB7185',
    swatchClass: 'bg-rose-400',
    size: [1.8, 1.8, 1.8],
  },
  {
    kind: 'spawn',
    label: 'Spawn',
    description: 'Player start point',
    color: '#FACC15',
    swatchClass: 'bg-yellow-400',
    size: [1.8, 1, 1.8],
  },
  {
    kind: 'checkpoint',
    label: 'Checkpoint',
    description: 'Progress marker',
    color: '#38BDF8',
    swatchClass: 'bg-cyan-400',
    size: [2.6, 2, 2.6],
  },
  {
    kind: 'hazard',
    label: 'Hazard',
    description: 'Lose zone',
    color: '#EF4444',
    swatchClass: 'bg-red-500',
    size: [4, 1, 4],
  },
  {
    kind: 'finish',
    label: 'Finish',
    description: 'Win zone',
    color: '#22C55E',
    swatchClass: 'bg-green-500',
    size: [4, 2, 4],
  },
  {
    kind: 'building',
    label: 'Building',
    description: 'Loaded model',
    color: '#94A3B8',
    swatchClass: 'bg-slate-400',
    size: [3, 5, 3],
  },
];

const DEFAULT_CATALOG_ITEM = MAP_BLOCK_CATALOG[0];

export function getCatalogItem(kind: MapBlockKind) {
  return MAP_BLOCK_CATALOG.find((item) => item.kind === kind) ?? DEFAULT_CATALOG_ITEM;
}

export function createMapBlock(kind: MapBlockKind, position: [number, number, number]): MapBlock {
  const catalogItem = getCatalogItem(kind);
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id: `${kind}-${randomId}`,
    kind,
    position,
    rotation: catalogItem.rotation ?? [0, 0, 0],
    size: catalogItem.size,
    color: catalogItem.color,
    renderMode: 'solid',
    label: catalogItem.label,
  };
}

export function snapPlacement(point: { x: number; y: number; z: number }, size: [number, number, number]) {
  const snap = (value: number) => Math.round(value / 2) * 2;
  return [
    snap(point.x),
    Math.max(size[1] * 0.5, Math.round((point.y + size[1] * 0.5) / 0.5) * 0.5),
    snap(point.z),
  ] as [number, number, number];
}

export function alignToSurface(point: { x: number; y: number; z: number }, size: [number, number, number]) {
  return [
    point.x,
    point.y + size[1] * 0.5,
    point.z,
  ] as [number, number, number];
}

// Sample maps for quick testing/play
export function getSampleMap(name: 'modern' | 'compact' = 'modern') {
  if (name === 'compact') {
    return [
      createMapBlock('platform', [0, 0.5, 0]),
      createMapBlock('platform', [6, 0.5, 0]),
      createMapBlock('ramp', [3, 1.2, 0]),
      createMapBlock('platform', [10, 0.5, 0]),
      createMapBlock('checkpoint', [10, 1.0, 0]),
      createMapBlock('finish', [14, 1.0, 0]),
    ];
  }

  // modern sample: a short modern-looking course with platforms, gaps and a checkpoint
  return [
    createMapBlock('platform', [0, 0.5, 0]),
    createMapBlock('platform', [6, 0.5, 0]),
    createMapBlock('platform', [12, 1.0, -2]),
    createMapBlock('ramp', [9, 1.2, -1]),
    createMapBlock('platform', [18, 1.0, -2]),
    createMapBlock('box', [22, 1.0, -2]),
    createMapBlock('platform', [26, 1.0, -2]),
    createMapBlock('checkpoint', [26, 2.0, -2]),
    createMapBlock('platform', [34, 1.0, -2]),
    createMapBlock('finish', [40, 2.0, -2]),
  ];
}
