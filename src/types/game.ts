export type GameStatus = 'ready' | 'playing' | 'won' | 'lost';

export type EditorMode = 'build' | 'play';

export type RenderMode = 'solid' | 'lines' | 'points';

export type TransformMode = 'translate' | 'rotate' | 'scale';
export type UiTheme = 'dark' | 'light';

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
  | 'building';

export type MapBlock = {
  id: string;
  kind: MapBlockKind;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
  color: string;
  renderMode: RenderMode;
  label?: string;
};

export type SavedMapSummary = {
  id: string;
  name: string;
  blockCount: number;
  createdAt: number;
  updatedAt: number;
};

export type SavedMapRecord = SavedMapSummary & {
  blocks: MapBlock[];
};
