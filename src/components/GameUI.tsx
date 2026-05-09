import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { HelpCircle } from 'lucide-react';
import type { GameStatus, MapBlock, RenderMode, TransformMode, UiTheme } from '../types/game';
import { HelpTutorialOverlay } from './HelpTutorialOverlay';

type GameUIProps = {
  readonly status: GameStatus;
  readonly elapsed: number;
  readonly checkpointLabel: string | null;
  readonly message: string | null;
  readonly theme: UiTheme;
  readonly selectedBlock: MapBlock | null;
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
  readonly levaCollapsed: boolean;
  readonly pointerLockActive?: boolean;
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
  theme,
  selectedBlock,
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
  levaCollapsed,
  pointerLockActive = false,
}: GameUIProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [taskbarTop, setTaskbarTop] = useState(58);
  const [taskbarCollapsed, setTaskbarCollapsed] = useState(false);
  const isLight = theme === 'light';
  const confettiPieces = useMemo(() => (
    Array.from({ length: 28 }, (_, index) => ({
      id: index,
      left: ((index * 13) % 100) + 0.5,
      delay: (index % 7) * 0.22,
      duration: 2.4 + (index % 5) * 0.35,
      drift: (index % 2 === 0 ? 1 : -1) * (6 + (index % 6)),
      rotation: index * 19,
      color: ['#22c55e', '#f59e0b', '#38bdf8', '#f97316', '#a78bfa'][index % 5],
    }))
  ), []);

  const selectedLabel = selectedBlock ? (selectedBlock.label ?? selectedBlock.kind) : 'No block selected';
  const canEditSelectedRenderMode = selectedBlock !== null;
  const statusTone = status === 'won'
    ? 'text-emerald-300'
    : status === 'lost'
      ? 'text-rose-300'
      : isLight
        ? 'text-slate-700'
        : 'text-cyan-200';

  useEffect(() => {
    const findLevaRoot = () => {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>('[class*="leva-c-kWgxhW-bCBHqk-fill-false"]'));
      return candidates.find((element) => (
        !element.classList.contains('game-taskbar')
        && !element.classList.contains('game-taskbar-head')
        && globalThis.getComputedStyle(element).position === 'fixed'
      )) ?? null;
    };

    const updateTaskbarTop = () => {
      const levaRoot = findLevaRoot();
      if (!levaRoot) {
        setTaskbarTop(58);
        return;
      }

      const rect = levaRoot.getBoundingClientRect();
      const nextTop = Math.min(globalThis.innerHeight - 220, rect.bottom + 10);
      setTaskbarTop(Math.max(58, nextTop));
    };

    updateTaskbarTop();
    const levaRoot = findLevaRoot();
    const observer = levaRoot && 'ResizeObserver' in globalThis
      ? new ResizeObserver(updateTaskbarTop)
      : null;
    observer?.observe(levaRoot as Element);
    globalThis.addEventListener('resize', updateTaskbarTop);

    return () => {
      observer?.disconnect();
      globalThis.removeEventListener('resize', updateTaskbarTop);
    };
  }, [levaCollapsed]);

  return (
    <div className={`fixed inset-0 z-[1100] pointer-events-none font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
      {status === 'won' && (
        <div className="absolute inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 victory-glow" />
          <div className={`absolute left-1/2 top-24 -translate-x-1/2 rounded-2xl border px-8 py-5 text-center shadow-2xl ${isLight ? 'border-emerald-300 bg-white/95 text-slate-900 shadow-emerald-900/20' : 'border-emerald-400/60 bg-slate-950/90 text-white shadow-black/60'}`}>
            <div className="text-3xl font-bold tracking-wide">Congratulations!</div>
            <div className={`mt-2 text-sm ${isLight ? 'text-slate-600' : 'text-emerald-100/90'}`}>
              Chuc mung! Ban da hoan thanh map parkour.
            </div>
          </div>
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="absolute top-0 h-3 w-2 rounded-sm"
              style={{
                left: `${piece.left}%`,
                backgroundColor: piece.color,
                transform: `translateX(0px) rotate(${piece.rotation}deg)`,
                animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s infinite`,
                '--confetti-drift': `${piece.drift}px`,
              } as CSSProperties}
            />
          ))}
        </div>
      )}

      <div className="absolute left-1/2 top-4 -translate-x-1/2 pointer-events-auto">
        <div className={`flex items-center gap-4 rounded-2xl border px-4 py-2 shadow-lg backdrop-blur-md ${isLight ? 'border-slate-300/80 bg-white/80 shadow-slate-900/10' : 'border-white/15 bg-slate-950/50 shadow-black/40'}`}>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.22em] opacity-70">Status</span>
            <span className={`text-sm font-semibold ${statusTone}`}>{statusText(status)}</span>
          </div>
          <div className="h-7 w-px bg-white/20" />
          <div className="text-xs opacity-85">Time: {formatTime(elapsed)}</div>
          <div className="text-xs opacity-85">Checkpoint: {checkpointLabel ?? 'None'}</div>
          {(status === 'ready' || status === 'won' || status === 'lost') && (
            status === 'ready' ? (
              <button
                className="rounded-lg bg-emerald-500/85 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 pointer-events-auto"
                onClick={onStart}
              >
                Start
              </button>
            ) : (
              <button
                className="rounded-lg bg-emerald-500/85 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 pointer-events-auto"
                onClick={onRestart}
              >
                Restart
              </button>
            )
          )}
        </div>
        {message && (
          <div className={`mt-2 rounded-xl border px-3 py-1.5 text-xs text-center backdrop-blur-sm ${isLight ? 'border-slate-300/80 bg-white/80 text-emerald-700' : 'border-white/15 bg-slate-950/45 text-emerald-200'}`}>
            {message}
          </div>
        )}
        {status === 'playing' && (
          <div className={`mt-2 rounded-xl border px-3 py-1.5 text-xs text-center backdrop-blur-sm ${isLight ? 'border-slate-300/80 bg-white/80 text-slate-700' : 'border-white/15 bg-slate-950/45 text-white/85'}`}>
            {pointerLockActive
              ? 'Mouse look active. Press Esc to release cursor.'
              : 'Click inside the scene to lock cursor and enable mouse look.'}
          </div>
        )}
      </div>

      <div
        className="absolute right-[10px] z-[1001] w-[280px] pointer-events-auto"
        style={{ top: taskbarTop }}
      >
        <div className="game-taskbar-head flex h-[39px] w-[280px] items-center rounded-[10px] bg-[#292d39] text-[#8c92a4] shadow-[0_0_9px_0_#00000088]">
          <button
            className="flex h-full w-10 items-center justify-center transition hover:text-[#fefefe]"
            onClick={() => setTaskbarCollapsed((value) => !value)}
            aria-label={taskbarCollapsed ? 'Expand task bar' : 'Collapse task bar'}
          >
            <svg
              width="12"
              height="8"
              viewBox="0 0 9 5"
              xmlns="http://www.w3.org/2000/svg"
              className="fill-current transition-transform duration-300"
              style={{ transform: `rotate(${taskbarCollapsed ? -90 : 0}deg)` }}
            >
              <path d="M3.8 4.4c.4.3 1 .3 1.4 0L8 1.7A1 1 0 007.4 0H1.6a1 1 0 00-.7 1.7l3 2.7z" />
            </svg>
          </button>
          <div className="flex flex-1 justify-center text-[#535760]">
            <svg width="20" height="10" viewBox="0 0 28 14" xmlns="http://www.w3.org/2000/svg" className="fill-current">
              <circle cx="2" cy="2" r="2" />
              <circle cx="14" cy="2" r="2" />
              <circle cx="26" cy="2" r="2" />
              <circle cx="2" cy="12" r="2" />
              <circle cx="14" cy="12" r="2" />
              <circle cx="26" cy="12" r="2" />
            </svg>
          </div>
          <button
            className="flex h-full w-10 items-center justify-center transition hover:text-[#fefefe]"
            aria-label="Task bar search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 20 20" className="fill-current">
              <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z" />
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {!taskbarCollapsed && (
          <div
            className="game-taskbar mt-2 w-[280px] overflow-y-auto rounded-[10px] bg-[#181c20] text-[#fefefe] shadow-[0_0_9px_0_#00000088]"
            style={{ maxHeight: `calc(100vh - ${Math.ceil(taskbarTop) + 61}px)` }}
          >
            <div className="px-[10px] py-3 text-[11px] uppercase tracking-[0.22em] text-[#8c92a4]">Task Bar</div>
            <div className="h-px bg-[#2d3240]" />

            <div className="space-y-4 p-[10px] text-[11px]">
          <section>
            <div className="mb-2 uppercase tracking-[0.18em] text-[#8c92a4]">Render Mode</div>
            <div className="mb-2 text-[11px] text-[#8c92a4]">
              Target: {selectedLabel}
            </div>
            <div className="flex gap-2">
              {(['solid', 'lines', 'points'] as RenderMode[]).map((mode) => (
                <button
                  key={mode}
                  disabled={!canEditSelectedRenderMode}
                  className={`rounded-[5px] px-3 py-1 text-[11px] transition ${
                    renderMode === mode
                      ? 'bg-[#4d8dff] text-white'
                      : 'bg-[#373c4b] text-[#8c92a4] hover:text-[#fefefe]'
                  } ${!canEditSelectedRenderMode ? 'opacity-45 cursor-not-allowed' : ''}`}
                  onClick={() => onRenderModeChange(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 uppercase tracking-[0.18em] text-[#8c92a4]">Affine Transform</div>
            <div className="flex gap-2">
              {(['translate', 'rotate', 'scale'] as TransformMode[]).map((mode) => (
                <button
                  key={mode}
                  className={`rounded-[5px] px-3 py-1 text-[11px] transition ${
                    transformMode === mode
                      ? 'bg-[#a86cf8] text-white'
                      : 'bg-[#373c4b] text-[#8c92a4] hover:text-[#fefefe]'
                  }`}
                  onClick={() => onTransformModeChange(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button className="rounded-[5px] bg-[#dbe1ea] px-2 py-1 text-[#2f3643]" onClick={() => onTransformNudge('x', -1)}>-X</button>
              <button className="rounded-[5px] bg-[#dbe1ea] px-2 py-1 text-[#2f3643]" onClick={() => onTransformNudge('x', 1)}>+X</button>
              <button className="rounded-[5px] bg-[#dbe1ea] px-2 py-1 text-[#2f3643]" onClick={() => onTransformNudge('y', 1)}>+Y</button>
              <button className="rounded-[5px] bg-[#dbe1ea] px-2 py-1 text-[#2f3643]" onClick={() => onTransformNudge('y', -1)}>-Y</button>
              <button className="rounded-[5px] bg-[#dbe1ea] px-2 py-1 text-[#2f3643]" onClick={() => onTransformNudge('z', -1)}>-Z</button>
              <button className="rounded-[5px] bg-[#dbe1ea] px-2 py-1 text-[#2f3643]" onClick={() => onTransformNudge('z', 1)}>+Z</button>
            </div>
            <button
              className="mt-2 underline text-[#8c92a4] hover:text-[#fefefe]"
              onClick={onResetTransform}
            >
              Reset Transform
            </button>
          </section>

          <section>
            <div className="mb-2 uppercase tracking-[0.18em] text-[#8c92a4]">Texture Mapping</div>
            <div className="mb-2 text-[11px] text-[#8c92a4]">Current: {textureName ?? 'default'}</div>
            <input
              className="text-xs"
              type="file"
              accept="image/*"
              title="Texture mapping image"
              onChange={(event) => onTextureSelect(event.target.files?.[0] ?? null)}
            />
          </section>

          <section>
            <div className="mb-2 uppercase tracking-[0.18em] text-[#8c92a4]">Projection</div>
            <div className="space-y-2">
              <div>Near: {projection.near.toFixed(1)}</div>
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
              <div>Far: {projection.far.toFixed(0)}</div>
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
              <div>Offset X: {projection.offsetX.toFixed(1)}</div>
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
              <div>Height: {projection.height.toFixed(1)}</div>
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
              <div>Distance: {projection.distance.toFixed(1)}</div>
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
          </section>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-5 right-5 pointer-events-auto">
        <button
          className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-lg transition ${isLight ? 'border-slate-300/90 bg-white/90 text-slate-700 hover:bg-slate-100' : 'border-white/15 bg-slate-950/80 text-white hover:bg-slate-900'}`}
          onClick={() => setHelpOpen((value) => !value)}
          aria-label="Toggle tutorial overlay"
        >
          <HelpCircle size={18} />
        </button>
      </div>
      <HelpTutorialOverlay
        open={helpOpen}
        theme={theme}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  );
}
