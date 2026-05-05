import { useState } from 'react';
import type { GameStatus, RenderMode, TransformMode } from '../types/game';

type GameUIProps = {
  readonly status: GameStatus;
  readonly elapsed: number;
  readonly checkpointLabel: string | null;
  readonly message: string | null;
  readonly renderMode: RenderMode;
  readonly transformMode: TransformMode;
  readonly textureName: string | null;
  readonly projection: {
    near: number;
    far: number;
    offsetX: number;
    height: number;
    distance: number;
  };
  readonly onStart: () => void;
  readonly onRestart: () => void;
  readonly onRenderModeChange: (mode: RenderMode) => void;
  readonly onTransformModeChange: (mode: TransformMode) => void;
  readonly onTransformNudge: (axis: 'x' | 'y' | 'z', direction: 1 | -1) => void;
  readonly onResetTransform: () => void;
  readonly onTextureSelect: (file: File | null) => void;
  readonly onProjectionChange: (field: 'near' | 'far' | 'offsetX' | 'height' | 'distance', value: number) => void;
};

function formatTime(elapsed: number) {
  const minutes = Math.floor(elapsed / 60);
  const seconds = (elapsed % 60).toFixed(2).padStart(5, '0');
  return `${minutes}:${seconds}`;
}

function statusText(status: GameStatus) {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'playing':
      return 'Playing';
    case 'won':
      return 'Win';
    case 'lost':
      return 'Lose';
    default:
      return status;
  }
}

export function GameUI({
  status,
  elapsed,
  checkpointLabel,
  message,
  renderMode,
  transformMode,
  textureName,
  projection,
  onStart,
  onRestart,
  onRenderModeChange,
  onTransformModeChange,
  onTransformNudge,
  onResetTransform,
  onTextureSelect,
  onProjectionChange,
}: GameUIProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="fixed inset-0 pointer-events-none text-white font-mono">
      <div className={`absolute top-4 right-4 pointer-events-auto transition-all duration-200 ${collapsed ? 'w-14' : 'w-72'}`}>
        <button
          className="mb-2 ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-white shadow-lg shadow-black/30 hover:bg-slate-900"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand HUD' : 'Collapse HUD'}
        >
          {collapsed ? '<' : '>'}
        </button>

        {!collapsed && (
          <div className="space-y-3">
            <div className="bg-slate-950/75 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10 shadow-xl shadow-black/30">
              <div className="text-xs uppercase tracking-[0.25em] opacity-70">Status</div>
              <div className="text-xl font-semibold">{statusText(status)}</div>
              <div className="text-sm opacity-80">Time: {formatTime(elapsed)}</div>
              <div className="text-sm opacity-80">Checkpoint: {checkpointLabel ?? 'None'}</div>
              {message && <div className="mt-2 text-sm text-emerald-200">{message}</div>}
              {(status === 'ready' || status === 'won' || status === 'lost') && (
                <div className="mt-3 flex gap-2">
                  {status === 'ready' ? (
                    <button
                      className="px-4 py-2 rounded-md bg-emerald-500/80 hover:bg-emerald-400/80 transition pointer-events-auto"
                      onClick={onStart}
                    >
                      Start
                    </button>
                  ) : (
                    <button
                      className="px-4 py-2 rounded-md bg-emerald-500/80 hover:bg-emerald-400/80 transition pointer-events-auto"
                      onClick={onRestart}
                    >
                      Restart (R)
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10 text-sm leading-relaxed">
              <div className="font-semibold">Controls</div>
              <div>Move: WASD / Arrow Keys</div>
              <div>Jump: Space</div>
              <div>Sprint: Shift</div>
              <div>Restart: R</div>
              <div className="mt-2 font-semibold">Transform Object</div>
              <div>Select mode, then use I/K (Z), J/L (X), U/O (Y)</div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10">
              <div className="text-sm uppercase tracking-wide opacity-80">Render Mode</div>
              <div className="flex gap-2 mt-2">
                {(['solid', 'lines', 'points'] as RenderMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`px-3 py-1 rounded-md text-sm transition ${
                      renderMode === mode ? 'bg-blue-500/80' : 'bg-white/10'
                    }`}
                    onClick={() => onRenderModeChange(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10">
              <div className="text-sm uppercase tracking-wide opacity-80">Affine Transform</div>
              <div className="flex gap-2 mt-2">
                {(['translate', 'rotate', 'scale'] as TransformMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`px-3 py-1 rounded-md text-sm transition ${
                      transformMode === mode ? 'bg-purple-500/80' : 'bg-white/10'
                    }`}
                    onClick={() => onTransformModeChange(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <button className="px-2 py-1 bg-white/10 rounded" onClick={() => onTransformNudge('x', -1)}>-X</button>
                <button className="px-2 py-1 bg-white/10 rounded" onClick={() => onTransformNudge('x', 1)}>+X</button>
                <button className="px-2 py-1 bg-white/10 rounded" onClick={() => onTransformNudge('y', 1)}>+Y</button>
                <button className="px-2 py-1 bg-white/10 rounded" onClick={() => onTransformNudge('y', -1)}>-Y</button>
                <button className="px-2 py-1 bg-white/10 rounded" onClick={() => onTransformNudge('z', -1)}>-Z</button>
                <button className="px-2 py-1 bg-white/10 rounded" onClick={() => onTransformNudge('z', 1)}>+Z</button>
              </div>
              <button className="mt-2 text-xs underline opacity-80" onClick={onResetTransform}>
                Reset Transform
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10">
              <div className="text-sm uppercase tracking-wide opacity-80">Texture Mapping</div>
              <div className="text-xs opacity-80">Current: {textureName ?? 'default'}</div>
              <input
                className="mt-2 text-xs"
                type="file"
                accept="image/*"
                title="Texture mapping image"
                onChange={(event) => onTextureSelect(event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10">
              <div className="text-sm uppercase tracking-wide opacity-80">Projection</div>
              <div className="text-xs mt-2">Near: {projection.near.toFixed(1)}</div>
              <input
                type="range"
                min={0.1}
                max={10}
                step={0.1}
                value={projection.near}
                title="Projection near plane"
                onChange={(event) => onProjectionChange('near', Number(event.target.value))}
                className="w-full"
              />
              <div className="text-xs mt-2">Far: {projection.far.toFixed(0)}</div>
              <input
                type="range"
                min={20}
                max={200}
                step={1}
                value={projection.far}
                title="Projection far plane"
                onChange={(event) => onProjectionChange('far', Number(event.target.value))}
                className="w-full"
              />
              <div className="text-xs mt-2">Offset X: {projection.offsetX.toFixed(1)}</div>
              <input
                type="range"
                min={-6}
                max={6}
                step={0.1}
                value={projection.offsetX}
                title="Camera horizontal offset"
                onChange={(event) => onProjectionChange('offsetX', Number(event.target.value))}
                className="w-full"
              />
              <div className="text-xs mt-2">Height: {projection.height.toFixed(1)}</div>
              <input
                type="range"
                min={1}
                max={12}
                step={0.1}
                value={projection.height}
                title="Camera height"
                onChange={(event) => onProjectionChange('height', Number(event.target.value))}
                className="w-full"
              />
              <div className="text-xs mt-2">Distance: {projection.distance.toFixed(1)}</div>
              <input
                type="range"
                min={4}
                max={20}
                step={0.1}
                value={projection.distance}
                title="Camera follow distance"
                onChange={(event) => onProjectionChange('distance', Number(event.target.value))}
                className="w-full"
              />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
