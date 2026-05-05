export type GameStatus = 'ready' | 'playing' | 'won' | 'lost';

export type EditorMode = 'build' | 'play';

export type RenderMode = 'solid' | 'lines' | 'points';

export type TransformMode = 'translate' | 'rotate' | 'scale';

export type TransformState = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

export type MapBlockKind =
  | 'platform'
  | 'ramp'
  | 'box'
  | 'sphere'
  | 'cone'
  | 'cylinder'
  | 'wheel'
  | 'teapot'
  | 'spawn'
  | 'checkpoint'
  | 'hazard'
  | 'finish'
  | 'building'
  | 'sci-fi-room';

export type MapBlock = {
  id: string;
  kind: MapBlockKind;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
  color: string;
  label?: string;
};
