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
import { alignToSurface, createMapBlock, getCatalogItem, snapPlacement } from './components/mapBuilderConfig';
import { useLightingControls } from './hooks/useLightingControls';
import { usePostProcessingControls } from './hooks/usePostProcessingControls';
import { Leva } from 'leva';
import { MobileControlsProvider } from './contexts/MobileControlsContext';
import { MobileControls } from './components/MobileControls';
import type { EditorMode, GameStatus, MapBlock, MapBlockKind, RenderMode, TransformMode, TransformState } from './types/game';

const PLAYER_SPAWN_CLEARANCE = 1.6;
const WALKABLE_START_KINDS = new Set<MapBlockKind>(['platform', 'ramp', 'checkpoint', 'building', 'sci-fi-room']);
const BOTTOM_ALIGNED_KINDS = new Set<MapBlockKind>(['building', 'sci-fi-room', 'spawn']);

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
  const lastSafeSpawnRef = useRef<[number, number, number] | null>(null);
  const [status, setStatus] = useState<GameStatus>('ready');
  const [editorMode, setEditorMode] = useState<EditorMode>('build');
  const [runVersion, setRunVersion] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [checkpointIndex, setCheckpointIndex] = useState<number | null>(null);
  const [checkpointToast, setCheckpointToast] = useState<string | null>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>('solid');
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [selectedKind, setSelectedKind] = useState<MapBlockKind>('platform');
  const [blocks, setBlocks] = useState<MapBlock[]>([]);
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
  const defaultTransform = useRef<TransformState>({
    position: [12, 1.4, -8],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });
  const [transformState, setTransformState] = useState<TransformState>(defaultTransform.current);

  const handleCheckpoint = useCallback((label: string) => {
    setCheckpointToast(`${label} reached`);
  }, []);

  const handleSafeSpawnChange = useCallback((position: [number, number, number]) => {
    lastSafeSpawnRef.current = position;
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

  const resetMap = useCallback(() => {
    setBlocks([]);
    lastSafeSpawnRef.current = null;
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
    lastSafeSpawnRef.current = spawn;
    setEditorMode('play');
    setStatus('playing');
    setRunVersion((version) => version + 1);
    setElapsed(0);
    setCheckpointToast(null);
    setCheckpointIndex(null);
    resetCharacter(spawn);
  }, [blocks, getPlaySpawn, resetCharacter]);

  const handleBuildMode = useCallback(() => {
    lastSafeSpawnRef.current = null;
    setEditorMode('build');
    setStatus('ready');
    setRunVersion((version) => version + 1);
    setElapsed(0);
    setCheckpointToast(null);
    setCheckpointIndex(null);
    resetCharacter([0, 2, 0]);
  }, [resetCharacter]);

  const handlePlaceBlock = useCallback((point: { x: number; y: number; z: number }) => {
    if (editorMode !== 'build') return;
    const catalogItem = getCatalogItem(selectedKind);
    const position = selectedKind === 'spawn'
      ? alignToSurface(point, catalogItem.size)
      : snapPlacement(point, catalogItem.size);
    const nextBlock = createMapBlock(selectedKind, position);
    setBlocks((currentBlocks) => (
      selectedKind === 'spawn'
        ? [...currentBlocks.filter((block) => block.kind !== 'spawn'), nextBlock]
        : [...currentBlocks, nextBlock]
    ));
  }, [editorMode, selectedKind]);

  useEffect(() => {
    if (!checkpointToast) return;
    const timeoutId = globalThis.setTimeout(() => setCheckpointToast(null), 2000);
    return () => globalThis.clearTimeout(timeoutId);
  }, [checkpointToast]);

  useEffect(() => {
    if (status === 'won' || status === 'lost') {
      characterRef.current?.setVelocity({ x: 0, y: 0, z: 0 });
    }
  }, [status]);

  useEffect(() => {
    return () => {
      if (textureUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(textureUrl);
      }
    };
  }, [textureUrl]);

  const handleRestart = useCallback(() => {
    setStatus(editorMode === 'play' ? 'playing' : 'ready');
    setRunVersion((version) => version + 1);
    setElapsed(0);
    setCheckpointToast(null);
    if (editorMode !== 'play') {
      setCheckpointIndex(null);
    }
    const spawnMarker = getSpawnMarker(blocks);
    if (editorMode === 'play' && spawnMarker) {
      const markerSpawn = getBlockSpawn(spawnMarker);
      lastSafeSpawnRef.current = markerSpawn;
      resetCharacter(markerSpawn);
      return;
    }

    const checkpointBlocks = blocks.filter((block) => block.kind === 'checkpoint');
    const checkpointBlock = checkpointIndex === null ? null : checkpointBlocks[checkpointIndex] ?? null;
    if (editorMode === 'play' && checkpointBlock) {
      const checkpointSpawn = getBlockSpawn(checkpointBlock);
      lastSafeSpawnRef.current = checkpointSpawn;
      resetCharacter(checkpointSpawn);
      return;
    }

    const spawn = lastSafeSpawnRef.current ?? getPlaySpawn(blocks);
    resetCharacter(spawn);
  }, [blocks, checkpointIndex, editorMode, getBlockSpawn, getPlaySpawn, getSpawnMarker, resetCharacter]);

  const nudgeTransform = useCallback((axis: 'x' | 'y' | 'z', direction: 1 | -1) => {
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
  }, [transformMode]);

  const handleResetTransform = useCallback(() => {
    setShowTransformPreview(false);
    setTransformState(defaultTransform.current);
  }, []);

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
  }, [handleRestart, nudgeTransform]);

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

  return (
    <div className="w-full h-screen">
      <Leva collapsed />
      <MobileControlsProvider>
        <MobileControls visible={editorMode === 'play'} />
        <MapEditorSidebar
          mode={editorMode}
          selectedKind={selectedKind}
          blockCount={blocks.length}
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
          renderMode={renderMode}
          transformMode={transformMode}
          textureName={textureName}
          projection={projection}
          onStart={handlePlay}
          onRestart={handleRestart}
          onRenderModeChange={setRenderMode}
          onTransformModeChange={setTransformMode}
          onTransformNudge={nudgeTransform}
          onResetTransform={handleResetTransform}
          onTextureSelect={handleTextureSelect}
          onProjectionChange={handleProjectionChange}
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
          <color attach="background" args={['#0B1020']} />
          <ambientLight intensity={lighting.ambientIntensity} />
          <directionalLight
            castShadow
            position={[lighting.directionalDistance, lighting.directionalHeight, lighting.directionalDistance / 2]}
            intensity={lighting.directionalIntensity}
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
            interpolate={false}
            positionIterations={5}
            velocityIterations={4}
          >
            <CharacterController ref={characterRef} spawn={[0, 2, 0]} enabled={editorMode === 'play'} />
            <MapScene
              blocks={blocks}
              renderMode={renderMode}
              textureUrl={textureUrl}
              transformState={transformState}
              showTransformPreview={showTransformPreview}
              isBuildMode={editorMode === 'build'}
              onPlaceBlock={handlePlaceBlock}
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
              onSafeSpawnChange={handleSafeSpawnChange}
              blocks={blocks}
            />
          </Physics>
          {editorMode === 'build' ? (
            <BuildCamera projection={projection} />
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
