import React, { useState } from 'react';
import type { EditorMode, MapBlockKind } from '../types/game';
import { getCatalogItem, MAP_BLOCK_CATALOG } from './mapBuilderConfig';

type MapEditorSidebarProps = {
  readonly mode: EditorMode;
  readonly selectedKind: MapBlockKind;
  readonly blockCount: number;
  readonly onModeChange: (mode: EditorMode) => void;
  readonly onSelectKind: (kind: MapBlockKind) => void;
  readonly onPlay: () => void;
  readonly onResetMap: () => void;
};

export function MapEditorSidebar({
  mode,
  selectedKind,
  blockCount,
  onModeChange,
  onSelectKind,
  onPlay,
  onResetMap,
}: MapEditorSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const selectedItem = getCatalogItem(selectedKind);

  return (
    <aside className={`fixed left-4 top-4 bottom-4 z-30 pointer-events-auto text-white ${collapsed ? 'w-14' : 'w-80'}`}>
      <div className={`h-full rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-2xl shadow-black/30 flex flex-col overflow-hidden ${collapsed ? 'items-center' : ''}`}>
        <div className="p-2 flex justify-end">
          <button
            className="h-10 w-10 rounded-md bg-white/5 text-white/90 flex items-center justify-center"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '>' : '<'}
          </button>
        </div>
        {collapsed ? (
          <div className="flex-1 flex items-start mt-6">
            {/* collapsed: show nothing else */}
          </div>
        ) : (
          <>
            <div className="px-4 py-4 border-b border-white/10 bg-white/5">
              <div className="text-xs uppercase tracking-[0.28em] text-sky-200/80">Map Builder</div>
              <div className="mt-1 text-2xl font-semibold">Design first, then play</div>
              <div className="mt-2 text-sm text-white/70">
                Click in the scene to place the selected block on the build grid.
              </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === 'build' ? 'bg-sky-500 text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                  onClick={() => onModeChange('build')}
                >
                  Build
                </button>
                <button
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === 'play' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                  onClick={onPlay}
                >
                  Play
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.22em] text-white/50">Selected block</div>
                <div className="mt-1 text-lg font-semibold">{selectedItem.label}</div>
                <div className="mt-1 text-sm text-white/65">Blocks on map: {blockCount}</div>
              </div>

              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.22em] text-white/50">Palette</div>
                <div className="grid grid-cols-1 gap-2">
                  {MAP_BLOCK_CATALOG.map((item) => (
                    <button
                      key={item.kind}
                      className={`rounded-xl border px-3 py-2 text-left transition ${
                        selectedKind === item.kind
                          ? 'border-sky-400 bg-sky-500/20'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                      onClick={() => onSelectKind(item.kind)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{item.label}</div>
                          <div className="text-xs text-white/60">{item.description}</div>
                        </div>
                        <div className={`h-8 w-8 rounded-lg border border-white/10 ${item.swatchClass}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70 leading-relaxed">
                <div className="font-semibold text-white">How it works</div>
                <div className="mt-1">1. Pick a block from the palette.</div>
                <div>2. Click on the scene to place it.</div>
                <div>3. Switch to Play when the route is ready.</div>
              </div>
            </div>
          </>
        )}

        {!collapsed && (
          <div className="mt-auto border-t border-white/10 p-4 bg-slate-950/90">
            <button
              className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 transition"
              onClick={onResetMap}
            >
              Clear map
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
