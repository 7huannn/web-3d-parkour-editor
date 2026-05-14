import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  SMAA as Smaa,
  BrightnessContrast,
  HueSaturation,
  DepthOfField,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector3 } from 'three';
import { CharacterController, CharacterControllerHandle } from './components/CharacterController';
import { FollowCamera } from './components/FollowCamera';
import { BuildCamera } from './components/BuildCamera';
import { MapScene } from './components/MapScene';
import { GameManager } from './components/GameManager';
import { GameUI } from './components/GameUI';
import { MapEditorSidebar } from './components/MapEditorSidebar';
import { alignToSurface, createMapBlock, getCatalogItem, MAP_BLOCK_CATALOG, snapPlacement } from './components/mapBuilderConfig';
import { useLightingControls } from './hooks/useLightingControls';
import { usePostProcessingControls } from './hooks/usePostProcessingControls';
import { Leva } from 'leva';
import { MobileControlsProvider } from './contexts/MobileControlsContext';
import { MobileControls } from './components/MobileControls';
import type { EditorMode, GameStatus, MapBlock, MapBlockKind, RenderMode, SavedMapRecord, SavedMapSummary, TransformMode, TransformState, UiTheme } from './types/game';

const PLAYER_SPAWN_CLEARANCE = 1.6;
const WALKABLE_START_KINDS = new Set<MapBlockKind>(['platform', 'ramp', 'checkpoint', 'building']);
const BOTTOM_ALIGNED_KINDS = new Set<MapBlockKind>(['building', 'spawn']);
const THEME_STORAGE_KEY = 'map-builder-theme';
const MAP_LIBRARY_STORAGE_KEY = 'map-builder-saved-maps-v1';
const VALID_RENDER_MODES = new Set<RenderMode>(['solid', 'lines', 'points']);
const VALID_BLOCK_KINDS = new Set<MapBlockKind>(MAP_BLOCK_CATALOG.map((item) => item.kind));
const AFFINE_EDITABLE_KINDS = new Set<MapBlockKind>([
  'platform',
  'ramp',
  'box',
  'sphere',
  'cone',
  'cylinder',
  'wheel',
  'teapot',
  'building',
]);
const DRAG_MOVE_STEP = 0.2;

type BlockDragPayload = {
  blockId: string;
  pointerId: number;
  rayOrigin: [number, number, number];
  rayDirection: [number, number, number];
};

function createMapRecordId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toSafeNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toVector3(value: unknown, fallback: [number, number, number]): [number, number, number] {
  if (!Array.isArray(value) || value.length < 3) {
    return fallback;
  }

  return [
    toSafeNumber(value[0], fallback[0]),
    toSafeNumber(value[1], fallback[1]),
    toSafeNumber(value[2], fallback[2]),
  ];
}

function normalizeSavedBlock(raw: unknown): MapBlock | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const kindRaw = source.kind;
  if (typeof kindRaw !== 'string' || !VALID_BLOCK_KINDS.has(kindRaw as MapBlockKind)) {
    return null;
  }

  const kind = kindRaw as MapBlockKind;
  const catalogItem = getCatalogItem(kind);
  const defaultPosition: [number, number, number] = [0, catalogItem.size[1] * 0.5, 0];
  const renderModeRaw = source.renderMode;
  const renderMode = typeof renderModeRaw === 'string' && VALID_RENDER_MODES.has(renderModeRaw as RenderMode)
    ? renderModeRaw as RenderMode
    : 'solid';
  const size = toVector3(source.size, catalogItem.size);

  return {
    id: typeof source.id === 'string' && source.id.trim().length > 0 ? source.id : `${kind}-${createMapRecordId()}`,
    kind,
    position: toVector3(source.position, defaultPosition),
    rotation: toVector3(source.rotation, catalogItem.rotation ?? [0, 0, 0]),
    size: [
      Math.max(0.1, size[0]),
      Math.max(0.1, size[1]),
      Math.max(0.1, size[2]),
    ],
    color: typeof source.color === 'string' && source.color.trim().length > 0 ? source.color : catalogItem.color,
    renderMode,
    label: typeof source.label === 'string' && source.label.trim().length > 0 ? source.label : catalogItem.label,
  };
}

function normalizeSavedMapRecord(raw: unknown): SavedMapRecord | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const name = typeof source.name === 'string' ? source.name.trim() : '';
  if (!name) {
    return null;
  }

  const blocks = Array.isArray(source.blocks)
    ? source.blocks.map(normalizeSavedBlock).filter((block): block is MapBlock => block !== null)
    : [];
  const createdAt = toSafeNumber(source.createdAt, Date.now());
  const updatedAt = toSafeNumber(source.updatedAt, createdAt);

  return {
    id: typeof source.id === 'string' && source.id.trim().length > 0 ? source.id : createMapRecordId(),
    name,
    blocks,
    blockCount: blocks.length,
    createdAt,
    updatedAt,
  };
}

function loadSavedMapLibrary(): SavedMapRecord[] {
  try {
    const raw = globalThis.localStorage?.getItem(MAP_LIBRARY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeSavedMapRecord)
      .filter((record): record is SavedMapRecord => record !== null)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  } catch {
    return [];
  }
}

function cloneMapBlocks(sourceBlocks: MapBlock[]) {
  return sourceBlocks.map((block) => ({
    ...block,
    position: [...block.position] as [number, number, number],
    rotation: [...block.rotation] as [number, number, number],
    size: [...block.size] as [number, number, number],
  }));
}

function playVictoryFanfare() {
  const AudioContextClass = globalThis.AudioContext ?? (globalThis as typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const now = context.currentTime;

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now + index * 0.14);
    gain.gain.exponentialRampToValueAtTime(0.18, now + index * 0.14 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.14 + 0.28);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + index * 0.14);
    oscillator.stop(now + index * 0.14 + 0.3);
  });
}

function getAdjacentPlacementFromSurface(
  point: { x: number; y: number; z: number },
  nextSize: [number, number, number],
  normal: [number, number, number],
): [number, number, number] {
  const [nx, ny, nz] = normal;
  const absX = Math.abs(nx);
  const absY = Math.abs(ny);
  const absZ = Math.abs(nz);
  const snap2 = (value: number) => Math.round(value / 2) * 2;
  const snap05 = (value: number) => Math.round(value / 0.5) * 0.5;

  if (absX >= absY && absX >= absZ) {
    const direction = nx >= 0 ? 1 : -1;
    return [
      point.x + direction * nextSize[0] * 0.5,
      snap05(point.y),
      snap2(point.z),
    ];
  }

  if (absZ >= absX && absZ >= absY) {
    const direction = nz >= 0 ? 1 : -1;
    return [
      snap2(point.x),
      snap05(point.y),
      point.z + direction * nextSize[2] * 0.5,
    ];
  }

  const direction = ny >= 0 ? 1 : -1;
  return [
    snap2(point.x),
    point.y + direction * nextSize[1] * 0.5,
    snap2(point.z),
  ];
}

function DynamicDepthOfField({ enabled, target, focalLength, bokehScale }: {
  enabled: boolean;
  target: React.RefObject<CharacterControllerHandle>;
  focalLength: number;
  bokehScale: number;
}) {
  const { camera } = useThree();
  const [focusDistance, setFocusDistance] = React.useState(0);
  
  useFrame(() => {
    if (!enabled || !target.current) return;
    // Calculate distance from camera to character
    const distance = camera.position.distanceTo(target.current.getPosition());
    // Convert world distance to normalized focus distance (0-1 range)
    setFocusDistance(Math.min(distance / 20, 1));
  });

  return enabled ? (
    <DepthOfField
      focusDistance={focusDistance}
      focalLength={focalLength}
      bokehScale={bokehScale}
      height={1080}
    />
  ) : null;
}

function App() {
  const lighting = useLightingControls();
  const postProcessing = usePostProcessingControls();
  const characterRef = useRef<CharacterControllerHandle>(null);
  const lastWonRunRef = useRef<number | null>(null);
  const [status, setStatus] = useState<GameStatus>('ready');
  const [editorMode, setEditorMode] = useState<EditorMode>('build');
  const [runVersion, setRunVersion] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [checkpointIndex, setCheckpointIndex] = useState<number | null>(null);
  const [checkpointToast, setCheckpointToast] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [theme, setTheme] = useState<UiTheme>(() => {
    const storedTheme = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    return globalThis.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const [selectedKind, setSelectedKind] = useState<MapBlockKind>('platform');
  const [levaCollapsed, setLevaCollapsed] = useState(false);
  const [blocks, setBlocks] = useState<MapBlock[]>([]);
  const [savedMaps, setSavedMaps] = useState<SavedMapRecord[]>(() => loadSavedMapLibrary());
  const [activeSavedMapId, setActiveSavedMapId] = useState<string | null>(null);
  const [, setActionStack] = useState<Array<{ type: 'add'; block: MapBlock }>>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [textureUrl, setTextureUrl] = useState<string | null>(null);
  const [textureName, setTextureName] = useState<string | null>(null);
  const [projection, setProjection] = useState({
    near: 0.1,
    far: 120,
    offsetX: 0,
    height: 4,
    distance: 6,
  });
  const [showTransformPreview, setShowTransformPreview] = useState(false);
  const [isBlockDragActive, setIsBlockDragActive] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const defaultTransform = useRef<TransformState>({
    position: [12, 1.4, -8],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });
  const [transformState, setTransformState] = useState<TransformState>(defaultTransform.current);
  const blockDragRef = useRef<{
    blockId: string;
    pointerId: number;
    planeY: number;
    anchor: [number, number, number];
    origin: [number, number, number];
  } | null>(null);

  const handleCheckpoint = useCallback((label: string) => {
    setCheckpointToast(`${label} reached`);
  }, []);

  useEffect(() => {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    globalThis.localStorage?.setItem(MAP_LIBRARY_STORAGE_KEY, JSON.stringify(savedMaps));
  }, [savedMaps]);

  const requestPlayPointerLock = useCallback(() => {
    if (typeof document === 'undefined') return;
    const canvas = document.querySelector('canvas') as (HTMLCanvasElement & {
      requestPointerLock?: () => Promise<void> | void;
    }) | null;
    if (!canvas || !canvas.requestPointerLock) return;
    if (document.pointerLockElement === canvas) return;
    void canvas.requestPointerLock();
  }, []);

  const releasePointerLock = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.pointerLockElement) return;
    document.exitPointerLock?.();
  }, []);

  useEffect(() => {
    if (editorMode !== 'build') {
      blockDragRef.current = null;
      setIsBlockDragActive(false);
    }
  }, [editorMode]);

  useEffect(() => {
    const handlePointerLockChange = () => {
      const canvas = document.querySelector('canvas');
      setIsPointerLocked(document.pointerLockElement === canvas);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange);
  }, []);

  useEffect(() => {
    if (editorMode !== 'play') {
      setIsPointerLocked(false);
      releasePointerLock();
      return;
    }

    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const handleMouseDown = () => requestPlayPointerLock();
    canvas.addEventListener('mousedown', handleMouseDown);
    return () => canvas.removeEventListener('mousedown', handleMouseDown);
  }, [editorMode, releasePointerLock, requestPlayPointerLock]);

  useEffect(() => {
    const handlePointerRelease = () => {
      if (!blockDragRef.current) return;
      blockDragRef.current = null;
      setIsBlockDragActive(false);
    };

    globalThis.addEventListener('pointerup', handlePointerRelease);
    globalThis.addEventListener('pointercancel', handlePointerRelease);
    return () => {
      globalThis.removeEventListener('pointerup', handlePointerRelease);
      globalThis.removeEventListener('pointercancel', handlePointerRelease);
    };
  }, []);

  const resetCharacter = useCallback((spawn: [number, number, number]) => {
    characterRef.current?.reset(new Vector3(spawn[0], spawn[1], spawn[2]));
  }, []);

  const getSpawnMarker = useCallback((sourceBlocks: MapBlock[]) => (
    [...sourceBlocks].reverse().find((block) => block.kind === 'spawn') ?? null
  ), []);

  const getBlockSpawn = useCallback((block: MapBlock): [number, number, number] => {
    const groundY = BOTTOM_ALIGNED_KINDS.has(block.kind)
      ? block.position[1] - block.size[1] * 0.5
      : block.position[1] + block.size[1] * 0.5;
    return [
      block.position[0],
      groundY + PLAYER_SPAWN_CLEARANCE,
      block.position[2],
    ];
  }, []);

  const getPlaySpawn = useCallback((sourceBlocks: MapBlock[]): [number, number, number] => {
    const spawnMarker = getSpawnMarker(sourceBlocks);
    if (spawnMarker) {
      return getBlockSpawn(spawnMarker);
    }

    const candidate = [...sourceBlocks].reverse().find((block) => WALKABLE_START_KINDS.has(block.kind));
    if (!candidate) {
      return [0, 2, 0];
    }

    return getBlockSpawn(candidate);
  }, [getBlockSpawn, getSpawnMarker]);

  const getProgressRespawn = useCallback((sourceBlocks: MapBlock[], checkpoint: number | null): [number, number, number] => {
    const checkpointBlocks = sourceBlocks.filter((block) => block.kind === 'checkpoint');
    const checkpointBlock = checkpoint === null ? null : checkpointBlocks[checkpoint] ?? null;
    if (checkpointBlock) {
      return getBlockSpawn(checkpointBlock);
    }

    const spawnMarker = getSpawnMarker(sourceBlocks);
    if (spawnMarker) {
      return getBlockSpawn(spawnMarker);
    }

    return getPlaySpawn(sourceBlocks);
  }, [getBlockSpawn, getPlaySpawn, getSpawnMarker]);

  const handleSaveMapAsNew = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setCheckpointToast('Enter a map name before saving.');
      return;
    }

    const now = Date.now();
    const nextRecord: SavedMapRecord = {
      id: createMapRecordId(),
      name: trimmedName,
      blocks: cloneMapBlocks(blocks),
      blockCount: blocks.length,
      createdAt: now,
      updatedAt: now,
    };

    setSavedMaps((prev) => [nextRecord, ...prev].sort((left, right) => right.updatedAt - left.updatedAt));
    setActiveSavedMapId(nextRecord.id);
    setCheckpointToast(`Saved map "${trimmedName}".`);
  }, [blocks]);

  const handleUpdateSavedMap = useCallback((id: string, nextName?: string) => {
    const trimmedName = nextName?.trim();
    let updatedName = '';
    let hasUpdated = false;

    setSavedMaps((prev) => prev
      .map((record) => {
        if (record.id !== id) {
          return record;
        }

        hasUpdated = true;
        updatedName = trimmedName && trimmedName.length > 0 ? trimmedName : record.name;
        return {
          ...record,
          name: updatedName,
          blocks: cloneMapBlocks(blocks),
          blockCount: blocks.length,
          updatedAt: Date.now(),
        };
      })
      .sort((left, right) => right.updatedAt - left.updatedAt));

    if (!hasUpdated) {
      setCheckpointToast('Could not find a map to update.');
      return;
    }

    setActiveSavedMapId(id);
    setCheckpointToast(`Updated map "${updatedName}".`);
  }, [blocks]);

  const handleLoadSavedMap = useCallback((id: string) => {
    const targetMap = savedMaps.find((record) => record.id === id);
    if (!targetMap) {
      setCheckpointToast('Could not find a map to load.');
      return;
    }

    const nextBlocks = cloneMapBlocks(targetMap.blocks);
    lastWonRunRef.current = null;
    setBlocks(nextBlocks);
    setSelectedBlockId(null);
    setSelectedKind(nextBlocks[0]?.kind ?? 'platform');
    setActionStack([]);
    setCheckpointIndex(null);
    setCheckpointToast(`Loaded map "${targetMap.name}".`);
    setStatus('ready');
    setEditorMode('build');
    setRunVersion((version) => version + 1);
    setElapsed(0);
    setActiveSavedMapId(id);
    resetCharacter([0, 2, 0]);
  }, [resetCharacter, savedMaps]);

  const handleRenameSavedMap = useCallback((id: string, nextName: string) => {
    const trimmedName = nextName.trim();
    if (!trimmedName) {
      setCheckpointToast('Map name cannot be empty.');
      return;
    }

    let hasRenamed = false;
    setSavedMaps((prev) => prev
      .map((record) => {
        if (record.id !== id) {
          return record;
        }

        hasRenamed = true;
        return {
          ...record,
          name: trimmedName,
          updatedAt: Date.now(),
        };
      })
      .sort((left, right) => right.updatedAt - left.updatedAt));

    if (!hasRenamed) {
      setCheckpointToast('Could not find a map to rename.');
      return;
    }

    setCheckpointToast(`Renamed map to "${trimmedName}".`);
  }, []);

  const handleDeleteSavedMap = useCallback((id: string) => {
    let removedMapName = '';
    let hasRemoved = false;

    setSavedMaps((prev) => prev.filter((record) => {
      if (record.id === id) {
        removedMapName = record.name;
        hasRemoved = true;
        return false;
      }
      return true;
    }));

    if (!hasRemoved) {
      setCheckpointToast('Could not find a map to delete.');
      return;
    }

    if (activeSavedMapId === id) {
      setActiveSavedMapId(null);
    }
    setCheckpointToast(`Deleted map "${removedMapName}".`);
  }, [activeSavedMapId]);

  const resetMap = useCallback(() => {
    setBlocks([]);
    setSelectedBlockId(null);
    setActionStack([]);
    lastWonRunRef.current = null;
    setActiveSavedMapId(null);
    setCheckpointIndex(null);
    setCheckpointToast(null);
    setStatus('ready');
    setEditorMode('build');
    setRunVersion((version) => version + 1);
    setElapsed(0);
    resetCharacter([0, 2, 0]);
  }, [resetCharacter]);

  const handlePlay = useCallback(() => {
    const spawn = getPlaySpawn(blocks);
    lastWonRunRef.current = null;
    setEditorMode('play');
    setStatus('playing');
    setRunVersion((version) => version + 1);
    setElapsed(0);
    setCheckpointToast(null);
    setCheckpointIndex(null);
    resetCharacter(spawn);
    requestPlayPointerLock();
  }, [blocks, getPlaySpawn, requestPlayPointerLock, resetCharacter]);

  const handleBuildMode = useCallback(() => {
    lastWonRunRef.current = null;
    setEditorMode('build');
    setStatus('ready');
    setRunVersion((version) => version + 1);
    setElapsed(0);
    setCheckpointToast(null);
    setCheckpointIndex(null);
    resetCharacter([0, 2, 0]);
    releasePointerLock();
  }, [releasePointerLock, resetCharacter]);

  const handlePlaceBlock = useCallback((payload: {
    point: { x: number; y: number; z: number };
    source: 'ground' | 'block';
    blockId?: string;
    normal?: [number, number, number];
  }) => {
    if (editorMode !== 'build') return;
    const { point, source, blockId, normal } = payload;
    const catalogItem = getCatalogItem(selectedKind);
    let position: [number, number, number];

    if (source === 'block' && blockId) {
      const targetBlock = blocks.find((block) => block.id === blockId);
      if (targetBlock) {
        position = getAdjacentPlacementFromSurface(point, catalogItem.size, normal ?? [0, 1, 0]);
      } else {
        position = alignToSurface(point, catalogItem.size);
      }
    } else {
      position = selectedKind === 'spawn'
        ? alignToSurface(point, catalogItem.size)
        : snapPlacement(point, catalogItem.size);
    }

    const nextBlock = createMapBlock(selectedKind, position);
    setBlocks((currentBlocks) => (
      selectedKind === 'spawn'
        ? [...currentBlocks.filter((block) => block.kind !== 'spawn'), nextBlock]
        : [...currentBlocks, nextBlock]
    ));
    setSelectedBlockId(nextBlock.id);
    setActionStack((s) => [...s, { type: 'add', block: nextBlock }]);
  }, [blocks, editorMode, selectedKind]);

  const handleUndo = useCallback(() => {
    setActionStack((stack) => {
      const next = [...stack];
      const last = next.pop();
      if (!last) return stack;
      if (last.type === 'add') {
        setBlocks((prev) => prev.filter((b) => b.id !== last.block.id));
        setSelectedBlockId((sel) => (sel === last.block.id ? null : sel));
      }
      return next;
    });
  }, []);

  const updateBlock = useCallback((id: string, updater: (b: MapBlock) => MapBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? updater(b) : b)));
  }, []);

  const getRayGroundHit = useCallback((payload: BlockDragPayload, planeY: number): [number, number, number] | null => {
    const [ox, oy, oz] = payload.rayOrigin;
    const [dx, dy, dz] = payload.rayDirection;
    if (Math.abs(dy) < 1e-6) return null;
    const t = (planeY - oy) / dy;
    if (!Number.isFinite(t) || t < 0) return null;
    return [ox + dx * t, planeY, oz + dz * t];
  }, []);

  const handleBlockDragStart = useCallback((payload: BlockDragPayload) => {
    if (editorMode !== 'build') return;
    const block = blocks.find((candidate) => candidate.id === payload.blockId);
    if (!block) return;
    const anchor = getRayGroundHit(payload, block.position[1]);
    if (!anchor) return;
    blockDragRef.current = {
      blockId: block.id,
      pointerId: payload.pointerId,
      planeY: block.position[1],
      anchor,
      origin: [...block.position] as [number, number, number],
    };
    setIsBlockDragActive(true);
    setSelectedBlockId(block.id);
  }, [blocks, editorMode, getRayGroundHit]);

  const handleBlockDragMove = useCallback((payload: BlockDragPayload) => {
    if (editorMode !== 'build') return;
    const dragState = blockDragRef.current;
    if (!dragState) return;
    if (dragState.blockId !== payload.blockId || dragState.pointerId !== payload.pointerId) return;
    const point = getRayGroundHit(payload, dragState.planeY);
    if (!point) return;

    const nextX = Math.round((dragState.origin[0] + (point[0] - dragState.anchor[0])) / DRAG_MOVE_STEP) * DRAG_MOVE_STEP;
    const nextZ = Math.round((dragState.origin[2] + (point[2] - dragState.anchor[2])) / DRAG_MOVE_STEP) * DRAG_MOVE_STEP;
    updateBlock(dragState.blockId, (block) => {
      if (block.position[0] === nextX && block.position[2] === nextZ) {
        return block;
      }
      return {
        ...block,
        position: [nextX, block.position[1], nextZ],
      };
    });
  }, [editorMode, getRayGroundHit, updateBlock]);

  const handleBlockDragEnd = useCallback((payload: { blockId: string; pointerId: number }) => {
    const dragState = blockDragRef.current;
    if (!dragState) return;
    if (dragState.blockId !== payload.blockId || dragState.pointerId !== payload.pointerId) return;
    blockDragRef.current = null;
    setIsBlockDragActive(false);
  }, []);

  const handleSelectedBlockRenderModeChange = useCallback((mode: RenderMode) => {
    if (!selectedBlockId) return;
    updateBlock(selectedBlockId, (block) => ({ ...block, renderMode: mode }));
  }, [selectedBlockId, updateBlock]);

  const handleDeleteBlock = useCallback((id: string) => {
    if (blockDragRef.current?.blockId === id) {
      blockDragRef.current = null;
      setIsBlockDragActive(false);
    }
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedBlockId((sel) => (sel === id ? null : sel));
  }, []);

  useEffect(() => {
    if (!checkpointToast) return;
    const timeoutId = globalThis.setTimeout(() => setCheckpointToast(null), 2000);
    return () => globalThis.clearTimeout(timeoutId);
  }, [checkpointToast]);

  useEffect(() => {
    if (status === 'won') {
      characterRef.current?.setVelocity({ x: 0, y: 0, z: 0 });
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'won') return;
    if (lastWonRunRef.current === runVersion) return;
    lastWonRunRef.current = runVersion;
    playVictoryFanfare();
    setCheckpointToast('Congratulations! You completed the parkour map!');
  }, [runVersion, status]);

  useEffect(() => {
    return () => {
      if (textureUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(textureUrl);
      }
    };
  }, [textureUrl]);

  const handleRespawn = useCallback((reason: 'fall' | 'hazard') => {
    if (editorMode !== 'play') return;
    const respawn = getProgressRespawn(blocks, checkpointIndex);
    setStatus('playing');
    resetCharacter(respawn);
    setCheckpointToast(
      reason === 'hazard'
        ? 'Hazard hit - respawned at safe point.'
        : 'Fell down - respawned at safe point.',
    );
  }, [blocks, checkpointIndex, editorMode, getProgressRespawn, resetCharacter]);

  const handleRestart = useCallback(() => {
    setStatus(editorMode === 'play' ? 'playing' : 'ready');
    setRunVersion((version) => version + 1);
    setElapsed(0);
    setCheckpointToast(null);
    if (editorMode !== 'play') {
      setCheckpointIndex(null);
    }
    const spawn = editorMode === 'play'
      ? getProgressRespawn(blocks, checkpointIndex)
      : getPlaySpawn(blocks);
    resetCharacter(spawn);
  }, [blocks, checkpointIndex, editorMode, getPlaySpawn, getProgressRespawn, resetCharacter]);

  const nudgeTransform = useCallback((axis: 'x' | 'y' | 'z', direction: 1 | -1) => {
    if (editorMode === 'build' && selectedBlockId) {
      const selected = blocks.find((block) => block.id === selectedBlockId);
      if (selected && AFFINE_EDITABLE_KINDS.has(selected.kind)) {
        updateBlock(selectedBlockId, (block) => {
          const position = [...block.position] as [number, number, number];
          const rotation = [...block.rotation] as [number, number, number];
          const size = [...block.size] as [number, number, number];
          const axisIndexMap = { x: 0, y: 1, z: 2 } as const;
          const index = axisIndexMap[axis];

          if (transformMode === 'translate') {
            position[index] += 0.2 * direction;
          } else if (transformMode === 'rotate') {
            rotation[index] += (Math.PI / 12) * direction;
          } else {
            size[index] = Math.max(0.2, size[index] + 0.2 * direction);
          }

          return {
            ...block,
            position,
            rotation,
            size,
          };
        });
        return;
      }
    }

    setShowTransformPreview(true);
    setTransformState((prev) => {
      const position = [...prev.position] as [number, number, number];
      const rotation = [...prev.rotation] as [number, number, number];
      const scale = [...prev.scale] as [number, number, number];
      let step = 0.1;
      if (transformMode === 'translate') {
        step = 0.2;
      } else if (transformMode === 'rotate') {
        step = Math.PI / 12;
      }

      const axisIndexMap = { x: 0, y: 1, z: 2 } as const;
      const index = axisIndexMap[axis];

      if (transformMode === 'translate') {
        position[index] += step * direction;
      } else if (transformMode === 'rotate') {
        rotation[index] += step * direction;
      } else {
        scale[index] = Math.max(0.2, scale[index] + step * direction);
      }

      return { position, rotation, scale };
    });
  }, [blocks, editorMode, selectedBlockId, transformMode, updateBlock]);

  const handleResetTransform = useCallback(() => {
    if (editorMode === 'build' && selectedBlockId) {
      const selected = blocks.find((block) => block.id === selectedBlockId);
      if (selected && AFFINE_EDITABLE_KINDS.has(selected.kind)) {
        const catalogItem = getCatalogItem(selected.kind);
        updateBlock(selectedBlockId, (block) => ({
          ...block,
          rotation: catalogItem.rotation ?? [0, 0, 0],
          size: [...catalogItem.size] as [number, number, number],
        }));
        return;
      }
    }

    setShowTransformPreview(false);
    setTransformState(defaultTransform.current);
  }, [blocks, editorMode, selectedBlockId, updateBlock]);

  const handleTextureSelect = useCallback((file: File | null) => {
    if (!file) {
      setTextureUrl(null);
      setTextureName(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setTextureUrl(url);
    setTextureName(file.name);
  }, []);

  const handleProjectionChange = useCallback((field: 'near' | 'far' | 'offsetX' | 'height' | 'distance', value: number) => {
    setProjection((prev) => {
      if (field === 'near') {
        const near = Math.max(0.1, Math.min(value, prev.far - 1));
        return { ...prev, near };
      }
      if (field === 'far') {
        const far = Math.max(value, prev.near + 1);
        return { ...prev, far };
      }
      if (field === 'height') {
        return { ...prev, height: value };
      }
      if (field === 'distance') {
        return { ...prev, distance: value };
      }
      return { ...prev, offsetX: value };
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT') return;

      if (event.code === 'Space' || event.code.startsWith('Arrow')) {
        event.preventDefault();
      }

      // Undo (Ctrl+Z / Cmd+Z)
      if ((event.ctrlKey || event.metaKey) && (event.key === 'z' || event.key === 'Z')) {
        event.preventDefault();
        handleUndo();
        return;
      }

      // Delete selected block when in build mode
      if (event.code === 'Delete' && editorMode === 'build' && selectedBlockId) {
        event.preventDefault();
        handleDeleteBlock(selectedBlockId);
        return;
      }

      // Move selected block with arrow keys while in build mode
      if (editorMode === 'build' && selectedBlockId && event.code.startsWith('Arrow')) {
        event.preventDefault();
        const step = DRAG_MOVE_STEP;
        switch (event.code) {
          case 'ArrowLeft':
            updateBlock(selectedBlockId, (b) => ({ ...b, position: [b.position[0] - step, b.position[1], b.position[2]] }));
            break;
          case 'ArrowRight':
            updateBlock(selectedBlockId, (b) => ({ ...b, position: [b.position[0] + step, b.position[1], b.position[2]] }));
            break;
          case 'ArrowUp':
            updateBlock(selectedBlockId, (b) => ({ ...b, position: [b.position[0], b.position[1], b.position[2] - step] }));
            break;
          case 'ArrowDown':
            updateBlock(selectedBlockId, (b) => ({ ...b, position: [b.position[0], b.position[1], b.position[2] + step] }));
            break;
          default:
            break;
        }
        return;
      }

      switch (event.code) {
        case 'KeyI':
          nudgeTransform('z', -1);
          break;
        case 'KeyK':
          nudgeTransform('z', 1);
          break;
        case 'KeyJ':
          nudgeTransform('x', -1);
          break;
        case 'KeyL':
          nudgeTransform('x', 1);
          break;
        case 'KeyU':
          nudgeTransform('y', 1);
          break;
        case 'KeyO':
          nudgeTransform('y', -1);
          break;
        case 'KeyR':
          handleRestart();
          break;
        default:
          break;
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [editorMode, handleDeleteBlock, handleRestart, handleUndo, nudgeTransform, selectedBlockId, updateBlock]);

  const checkpointBlocks = blocks.filter((block) => block.kind === 'checkpoint');
  const checkpointLabel = checkpointIndex === null
    ? null
    : checkpointBlocks[checkpointIndex]?.label ?? null;
  let statusMessage: string | null = null;
  if (status === 'won') {
    statusMessage = 'Finish reached!';
  } else if (status === 'lost') {
    statusMessage = 'You fell off the course.';
  }
  const displayMessage = checkpointToast ?? statusMessage;

  const selectedBlock = selectedBlockId ? blocks.find((b) => b.id === selectedBlockId) ?? null : null;
  const activeRenderMode = selectedBlock?.renderMode ?? 'solid';
  const savedMapSummaries: SavedMapSummary[] = savedMaps.map((record) => ({
    id: record.id,
    name: record.name,
    blockCount: record.blockCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }));

  const isLight = theme === 'light';
  const sceneBackground = isLight ? '#E6EDF8' : '#0B1020';
  const ambientIntensity = isLight
    ? Math.max(lighting.ambientIntensity, 0.75)
    : lighting.ambientIntensity;
  const directionalIntensity = isLight
    ? Math.max(lighting.directionalIntensity, 1.55)
    : lighting.directionalIntensity;

  return (
    <div className={`w-full h-screen ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-white'}`}>
      <Leva collapsed={{ collapsed: levaCollapsed, onChange: setLevaCollapsed }} />
      <MobileControlsProvider>
        <MobileControls visible={editorMode === 'play'} />
        <MapEditorSidebar
          mode={editorMode}
          theme={theme}
          onThemeChange={setTheme}
          selectedKind={selectedKind}
          blockCount={blocks.length}
          savedMaps={savedMapSummaries}
          activeSavedMapId={activeSavedMapId}
          selectedBlock={selectedBlock}
          onUpdateBlock={(block) => updateBlock(block.id, () => block)}
          onDeleteBlock={(id) => handleDeleteBlock(id)}
          onSaveMap={handleSaveMapAsNew}
          onUpdateSavedMap={handleUpdateSavedMap}
          onLoadSavedMap={handleLoadSavedMap}
          onRenameSavedMap={handleRenameSavedMap}
          onDeleteSavedMap={handleDeleteSavedMap}
          onModeChange={(mode) => {
            if (mode === 'build') {
              handleBuildMode();
              return;
            }

            handlePlay();
          }}
          onSelectKind={setSelectedKind}
          onPlay={handlePlay}
          onResetMap={resetMap}
        />
        <GameUI
          status={status}
          elapsed={elapsed}
          checkpointLabel={checkpointLabel}
          message={displayMessage}
          theme={theme}
          selectedBlock={selectedBlock}
          renderMode={activeRenderMode}
          transformMode={transformMode}
          textureName={textureName}
          projection={projection}
          onStart={handlePlay}
          onRestart={handleRestart}
          onRenderModeChange={handleSelectedBlockRenderModeChange}
          onTransformModeChange={setTransformMode}
          onTransformNudge={nudgeTransform}
          onResetTransform={handleResetTransform}
          onTextureSelect={handleTextureSelect}
          onProjectionChange={handleProjectionChange}
          levaCollapsed={levaCollapsed}
          pointerLockActive={isPointerLocked}
        />
        <KeyboardControls
          map={[
            { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
            { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
            { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
            { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
            { name: 'jump', keys: ['Space'] },
            { name: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] },
          ]}
        >
          <Canvas shadows>
          <color attach="background" args={[sceneBackground]} />
          <ambientLight intensity={ambientIntensity} />
          <directionalLight
            castShadow
            position={[lighting.directionalDistance, lighting.directionalHeight, lighting.directionalDistance / 2]}
            intensity={directionalIntensity}
            shadow-mapSize={[4096, 4096]}
            shadow-camera-left={-30}
            shadow-camera-right={30}
            shadow-camera-top={30}
            shadow-camera-bottom={-30}
            shadow-camera-far={50}
            shadow-bias={-0.0001}
            shadow-normalBias={0.02}
          />
          <Physics
            interpolate
            timeStep={1 / 60}
            positionIterations={5}
            velocityIterations={4}
          >
            <CharacterController ref={characterRef} spawn={[0, 2, 0]} enabled={editorMode === 'play'} />
            <MapScene
              blocks={blocks}
              theme={theme}
              renderMode={activeRenderMode}
              textureUrl={textureUrl}
              transformState={transformState}
              showTransformPreview={showTransformPreview}
              isBuildMode={editorMode === 'build'}
              onPlaceBlock={handlePlaceBlock}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              onDragStart={handleBlockDragStart}
              onDragMove={handleBlockDragMove}
              onDragEnd={handleBlockDragEnd}
            />
            <GameManager
              characterRef={characterRef}
              editorMode={editorMode}
              status={status}
              runVersion={runVersion}
              setStatus={setStatus}
              setElapsed={setElapsed}
              checkpointIndex={checkpointIndex}
              setCheckpointIndex={setCheckpointIndex}
              onCheckpoint={handleCheckpoint}
              onRespawn={handleRespawn}
              blocks={blocks}
            />
          </Physics>
          {editorMode === 'build' ? (
            <BuildCamera projection={projection} controlsEnabled={!isBlockDragActive} />
          ) : (
            <FollowCamera target={characterRef} projection={projection} />
          )}
          <EffectComposer>
            <DynamicDepthOfField
              enabled={postProcessing.depthOfFieldEnabled}
              target={characterRef}
              focalLength={postProcessing.focalLength}
              bokehScale={postProcessing.bokehScale}
            />
            {postProcessing.bloomEnabled && (
              <Bloom 
                intensity={postProcessing.bloomIntensity}
              />
            )}
            {postProcessing.chromaticAberrationEnabled && (
              <ChromaticAberration
                offset={[postProcessing.chromaticAberrationOffset, postProcessing.chromaticAberrationOffset]}
                blendFunction={BlendFunction.NORMAL}
              />
            )}
            {postProcessing.vignetteEnabled && (
              <Vignette
                darkness={postProcessing.vignetteDarkness}
                offset={postProcessing.vignetteOffset}
                blendFunction={BlendFunction.NORMAL}
              />
            )}
            {postProcessing.brightnessContrastEnabled && (
              <BrightnessContrast
                brightness={postProcessing.brightness}
                contrast={postProcessing.contrast}
                blendFunction={BlendFunction.NORMAL}
              />
            )}
            {postProcessing.hueSaturationEnabled && (
              <HueSaturation
                hue={postProcessing.hue}
                saturation={postProcessing.saturation}
                blendFunction={BlendFunction.NORMAL}
              />
            )}
            <Smaa />
          </EffectComposer>
        </Canvas>
      </KeyboardControls>
      </MobileControlsProvider>
    </div>
  );
}
export default App;
