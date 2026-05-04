export type BoxConfig = {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
};

export type MovingPlatformConfig = BoxConfig & {
  start: [number, number, number];
  end: [number, number, number];
  speed: number;
};

export type RotatingObstacleConfig = BoxConfig & {
  speed: number;
};

export type HazardConfig = BoxConfig & {
  label: string;
};

export type CheckpointConfig = BoxConfig & {
  label: string;
  spawn: [number, number, number];
};

export const PARKOUR_LEVEL = {
  spawn: [0, 2, 0] as [number, number, number],
  fallY: -8,
  startPad: {
    id: 'start',
    position: [0, 0, 0],
    size: [10, 1, 10],
    color: '#3B82F6',
  } as BoxConfig,
  platforms: [
    { id: 'p1', position: [0, 1, 8], size: [4, 0.6, 4], color: '#8FD3FF' },
    { id: 'p2', position: [3, 2, 16], size: [3.5, 0.6, 3.5], color: '#9AE6B4' },
    { id: 'beam1', position: [0, 2.5, 20], size: [1.2, 0.3, 6], color: '#FCD34D' },
    { id: 'p3', position: [-3, 3, 24], size: [3.5, 0.6, 3.5], color: '#FBD38D' },
    { id: 'p4', position: [0, 3.5, 32], size: [6, 0.6, 6], color: '#F59E0B' },
    { id: 'p6', position: [0, 5, 48], size: [4, 0.6, 4], color: '#FCA5A5' },
    { id: 'p7', position: [0, 5.5, 56], size: [6, 0.8, 6], color: '#A7F3D0' },
  ] as BoxConfig[],
  movingPlatforms: [
    {
      id: 'm1',
      position: [0, 4, 40],
      start: [-4, 4, 40],
      end: [4, 4, 40],
      size: [3, 0.6, 3],
      color: '#FBBF24',
      speed: 0.8,
    },
  ] as MovingPlatformConfig[],
  rotatingObstacles: [
    {
      id: 'rotor1',
      position: [0, 4.2, 32],
      size: [8, 0.3, 0.5],
      color: '#EF4444',
      speed: 1.2,
    },
  ] as RotatingObstacleConfig[],
  hazards: [
    {
      id: 'haz1',
      position: [0, 4.3, 44],
      size: [6, 0.4, 1],
      color: '#EF4444',
      label: 'Laser Gate',
    },
  ] as HazardConfig[],
  checkpoints: [
    {
      id: 'cp1',
      position: [0, 4.2, 32],
      size: [2, 1.5, 2],
      color: '#38BDF8',
      label: 'Checkpoint 1',
      spawn: [0, 5, 32],
    },
  ] as CheckpointConfig[],
  finishPad: {
    id: 'finishPad',
    position: [0, 6, 64],
    size: [10, 1, 10],
    color: '#22C55E',
  } as BoxConfig,
  finishZone: {
    id: 'finishZone',
    position: [0, 7.2, 64],
    size: [4, 2, 4],
    color: '#4ADE80',
  } as BoxConfig,
  showcasePad: {
    id: 'showcase',
    position: [-12, 0, -6],
    size: [10, 1, 10],
    color: '#0F172A',
  } as BoxConfig,
};
