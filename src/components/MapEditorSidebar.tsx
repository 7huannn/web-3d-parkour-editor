import React, { useState } from 'react';
import type { EditorMode, MapBlock, MapBlockKind, SavedMapSummary, UiTheme } from '../types/game';
import { getCatalogItem, MAP_BLOCK_CATALOG } from './mapBuilderConfig';

type MapEditorSidebarProps = {
  readonly mode: EditorMode;
  readonly selectedKind: MapBlockKind;
  readonly blockCount: number;
  readonly savedMaps: SavedMapSummary[];
  readonly activeSavedMapId: string | null;
  readonly onModeChange: (mode: EditorMode) => void;
  readonly onSelectKind: (kind: MapBlockKind) => void;
  readonly onPlay: () => void;
  readonly onResetMap: () => void;
  readonly onSaveMap: (name: string) => void;
  readonly onUpdateSavedMap: (id: string, nextName?: string) => void;
  readonly onLoadSavedMap: (id: string) => void;
  readonly onRenameSavedMap: (id: string, nextName: string) => void;
  readonly onDeleteSavedMap: (id: string) => void;
  readonly theme: UiTheme;
  readonly onThemeChange: (theme: UiTheme) => void;
  readonly selectedBlock?: MapBlock | null;
  readonly onUpdateBlock?: (block: MapBlock) => void;
  readonly onDeleteBlock?: (id: string) => void;
};

function formatSavedTime(timestamp: number) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return '--/--';
  }
}

export function MapEditorSidebar({
  mode,
  selectedKind,
  blockCount,
  savedMaps,
  activeSavedMapId,
  onModeChange,
  onSelectKind,
  onPlay,
  onResetMap,
  onSaveMap,
  onUpdateSavedMap,
  onLoadSavedMap,
  onRenameSavedMap,
  onDeleteSavedMap,
  theme,
  onThemeChange,
  selectedBlock,
  onUpdateBlock,
  onDeleteBlock,
}: MapEditorSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mapNameInput, setMapNameInput] = useState('');
  const [renamingMapId, setRenamingMapId] = useState<string | null>(null);
  const [renamingMapName, setRenamingMapName] = useState('');
  const selectedItem = getCatalogItem(selectedKind);
  const isLight = theme === 'light';
  const activeSavedMap = activeSavedMapId ? savedMaps.find((map) => map.id === activeSavedMapId) ?? null : null;
  const canSaveByName = mapNameInput.trim().length > 0;

  const handleSaveNewMap = () => {
    const trimmed = mapNameInput.trim();
    if (!trimmed) return;
    onSaveMap(trimmed);
  };

  const handleUpdateActiveMap = () => {
    if (!activeSavedMapId) return;
    const trimmed = mapNameInput.trim();
    onUpdateSavedMap(activeSavedMapId, trimmed.length > 0 ? trimmed : undefined);
  };

  const handleStartRename = (map: SavedMapSummary) => {
    setRenamingMapId(map.id);
    setRenamingMapName(map.name);
  };

  const handleCommitRename = (id: string) => {
    const trimmed = renamingMapName.trim();
    if (!trimmed) return;
    onRenameSavedMap(id, trimmed);
    setRenamingMapId(null);
    setRenamingMapName('');
  };

  const handleLoadMap = (map: SavedMapSummary) => {
    onLoadSavedMap(map.id);
    setMapNameInput(map.name);
    setRenamingMapId(null);
    setRenamingMapName('');
  };

  if (collapsed) {
    return (
      <aside className={`fixed left-4 top-4 z-30 pointer-events-auto ${isLight ? 'text-slate-900' : 'text-white'}`}>
        <button
          className={`flex h-12 w-12 items-center justify-center rounded-xl border backdrop-blur-xl shadow-2xl transition ${isLight ? 'border-slate-300/80 bg-white/90 text-slate-800 hover:bg-slate-100' : 'border-white/10 bg-slate-950/80 text-white/90 hover:bg-slate-900'}`}
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
        >
          &gt;
        </button>
      </aside>
    );
  }

  return (
    <aside className={`fixed left-4 top-4 bottom-4 z-30 w-80 pointer-events-auto ${isLight ? 'text-slate-900' : 'text-white'}`}>
      <div className={`h-full rounded-2xl border backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden ${isLight ? 'border-slate-300/80 bg-white/90 shadow-slate-900/15' : 'border-white/10 bg-slate-950/80 shadow-black/30'}`}>
        <div className="p-2 flex justify-end">
          <button
            className={`h-10 w-10 rounded-md flex items-center justify-center ${isLight ? 'bg-slate-200/80 text-slate-800 hover:bg-slate-300/80' : 'bg-white/5 text-white/90 hover:bg-white/10'}`}
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
          >
            &lt;
          </button>
        </div>

        <div className={`px-4 py-4 border-b ${isLight ? 'border-slate-300/80 bg-slate-100/85' : 'border-white/10 bg-white/5'}`}>
          <div className={`text-xs uppercase tracking-[0.28em] ${isLight ? 'text-sky-700' : 'text-sky-200/80'}`}>Map Builder</div>
          <div className="mt-1 text-2xl font-semibold">Design first, then play</div>
          <div className={`mt-2 text-sm ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
            Left click to place blocks. Right click and drag a selected block to move it (camera orbit is paused while dragging).
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === 'build' ? 'bg-sky-500 text-white' : isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
              onClick={() => onModeChange('build')}
            >
              Build
            </button>
            <button
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === 'play' ? 'bg-emerald-500 text-white' : isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
              onClick={onPlay}
            >
              Play
            </button>
          </div>

          <div className={`rounded-xl border p-3 ${isLight ? 'border-slate-300/80 bg-slate-100/80' : 'border-white/10 bg-white/5'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className={`text-xs uppercase tracking-[0.22em] ${isLight ? 'text-slate-500' : 'text-white/50'}`}>Map Presets</div>
              <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/55'}`}>{savedMaps.length} maps</div>
            </div>

            <div className="mt-3 space-y-2">
              <input
                value={mapNameInput}
                onChange={(event) => setMapNameInput(event.target.value)}
                placeholder="Map name..."
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${isLight ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-sky-500' : 'border-white/10 bg-slate-900/80 text-white placeholder:text-white/35 focus:border-sky-400'}`}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${canSaveByName ? 'bg-sky-500 text-white hover:bg-sky-400' : isLight ? 'bg-slate-200 text-slate-500' : 'bg-white/10 text-white/40'}`}
                  onClick={handleSaveNewMap}
                  disabled={!canSaveByName}
                >
                  Save New
                </button>
                <button
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${activeSavedMapId ? 'bg-emerald-500 text-white hover:bg-emerald-400' : isLight ? 'bg-slate-200 text-slate-500' : 'bg-white/10 text-white/40'}`}
                  onClick={handleUpdateActiveMap}
                  disabled={!activeSavedMapId}
                >
                  Update
                </button>
              </div>
            </div>

            {activeSavedMap && (
              <div className={`mt-3 rounded-lg border px-2 py-1.5 text-xs ${isLight ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-sky-400/25 bg-sky-500/10 text-sky-200'}`}>
                Editing: {activeSavedMap.name}
              </div>
            )}

            <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
              {savedMaps.length === 0 && (
                <div className={`rounded-lg border px-3 py-2 text-xs ${isLight ? 'border-slate-300/80 bg-white/70 text-slate-500' : 'border-white/10 bg-slate-900/60 text-white/55'}`}>
                  No saved maps yet.
                </div>
              )}

              {savedMaps.map((map) => {
                const isActiveMap = activeSavedMapId === map.id;
                const isRenaming = renamingMapId === map.id;
                return (
                  <div
                    key={map.id}
                    className={`rounded-lg border px-2.5 py-2 ${isActiveMap ? 'border-sky-400/70 bg-sky-500/10' : isLight ? 'border-slate-300/80 bg-white/75' : 'border-white/10 bg-slate-900/60'}`}
                  >
                    {isRenaming ? (
                      <div className="space-y-2">
                        <input
                          value={renamingMapName}
                          onChange={(event) => setRenamingMapName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') handleCommitRename(map.id);
                            if (event.key === 'Escape') {
                              setRenamingMapId(null);
                              setRenamingMapName('');
                            }
                          }}
                          className={`w-full rounded-md border px-2 py-1.5 text-xs outline-none ${isLight ? 'border-slate-300 bg-white text-slate-900 focus:border-sky-500' : 'border-white/10 bg-slate-900 text-white focus:border-sky-400'}`}
                          placeholder="New map name..."
                        />
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            className="rounded-md bg-emerald-500 px-2 py-1 font-semibold text-white hover:bg-emerald-400"
                            onClick={() => handleCommitRename(map.id)}
                          >
                            Save
                          </button>
                          <button
                            className={`rounded-md px-2 py-1 font-semibold ${isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                            onClick={() => {
                              setRenamingMapId(null);
                              setRenamingMapName('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{map.name}</div>
                            <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-white/55'}`}>
                              {map.blockCount} blocks • {formatSavedTime(map.updatedAt)}
                            </div>
                          </div>
                          {isActiveMap && (
                            <div className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${isLight ? 'bg-sky-100 text-sky-700' : 'bg-sky-500/25 text-sky-200'}`}>
                              ACTIVE
                            </div>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-1.5 text-xs">
                          <button
                            className={`rounded-md px-2 py-1 font-semibold ${isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                            onClick={() => handleLoadMap(map)}
                          >
                            Load
                          </button>
                          <button
                            className={`rounded-md px-2 py-1 font-semibold ${isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                            onClick={() => handleStartRename(map)}
                          >
                            Rename
                          </button>
                          <button
                            className="rounded-md bg-red-600 px-2 py-1 font-semibold text-white hover:bg-red-500"
                            onClick={() => onDeleteSavedMap(map.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`rounded-xl border p-3 ${isLight ? 'border-slate-300/80 bg-slate-100/80' : 'border-white/10 bg-white/5'}`}>
            <div className={`text-xs uppercase tracking-[0.22em] ${isLight ? 'text-slate-500' : 'text-white/50'}`}>Selected block</div>
            <div className="mt-1 text-lg font-semibold">{selectedItem.label}</div>
            <div className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-white/65'}`}>Blocks on map: {blockCount}</div>
            {selectedBlock && (
              <div className="mt-3 space-y-2">
                <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Selected ID: {selectedBlock.id}</div>
                <div className="flex items-center gap-2">
                  <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-white/60'}`}>Color</div>
                  <input
                    aria-label="Selected block color"
                    type="color"
                    value={selectedBlock.color}
                    onChange={(e) => onUpdateBlock && onUpdateBlock({ ...selectedBlock, color: e.target.value })}
                    className="w-10 h-8 rounded"
                  />
                  <button
                    className="ml-auto rounded-md bg-red-600 px-2 py-1 text-sm font-semibold text-white"
                    onClick={() => onDeleteBlock && onDeleteBlock(selectedBlock.id)}
                  >
                    Delete
                  </button>
                </div>
                <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/50'}`}>Left click places a new block on the clicked face. Right click selects a block.</div>
              </div>
            )}
          </div>

          <div className={`rounded-xl border p-3 ${isLight ? 'border-slate-300/80 bg-slate-100/80' : 'border-white/10 bg-white/5'}`}>
            <div className={`mb-2 text-xs uppercase tracking-[0.22em] ${isLight ? 'text-slate-500' : 'text-white/50'}`}>Theme</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${theme === 'dark' ? 'bg-slate-900 text-white' : isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                onClick={() => onThemeChange('dark')}
              >
                Dark
              </button>
              <button
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${theme === 'light' ? 'bg-sky-500 text-white' : isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                onClick={() => onThemeChange('light')}
              >
                Light
              </button>
            </div>
          </div>

          <div>
            <div className={`mb-2 text-xs uppercase tracking-[0.22em] ${isLight ? 'text-slate-500' : 'text-white/50'}`}>Palette</div>
            <div className="grid grid-cols-1 gap-2">
              {MAP_BLOCK_CATALOG.map((item) => (
                <button
                  key={item.kind}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    selectedKind === item.kind
                      ? 'border-sky-400 bg-sky-500/20'
                      : isLight
                        ? 'border-slate-300/80 bg-slate-100/80 hover:bg-slate-200/90'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                  onClick={() => onSelectKind(item.kind)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{item.label}</div>
                      <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-white/60'}`}>{item.description}</div>
                    </div>
                    <div className={`h-8 w-8 rounded-lg border ${isLight ? 'border-slate-300/80' : 'border-white/10'} ${item.swatchClass}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={`rounded-xl border p-3 text-sm leading-relaxed ${isLight ? 'border-slate-300/80 bg-slate-100/80 text-slate-600' : 'border-white/10 bg-white/5 text-white/70'}`}>
            <div className={`font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>How it works</div>
            <div className="mt-1">1. Pick a block from the palette.</div>
            <div>2. Click on the scene to place it.</div>
            <div>3. Switch to Play when the route is ready.</div>
          </div>
        </div>

        <div className={`mt-auto border-t p-4 ${isLight ? 'border-slate-300/80 bg-slate-100/90' : 'border-white/10 bg-slate-950/90'}`}>
          <button
            className={`w-full rounded-xl px-3 py-2 text-sm font-semibold transition ${isLight ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-white/10 hover:bg-white/15'}`}
            onClick={onResetMap}
          >
            Clear map
          </button>
        </div>
      </div>
    </aside>
  );
}
