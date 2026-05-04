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
import { createMapBlock, getCatalogItem, snapPlacement, getSampleMap } from './components/mapBuilderConfig';
import { useLightingControls } from './hooks/useLightingControls';
import { usePostProcessingControls } from './hooks/usePostProcessingControls';
import { Leva } from 'leva';
import { MobileControlsProvider } from './contexts/MobileControlsContext';
import { MobileControls } from './components/MobileControls';
import type { EditorMode, GameStatus, MapBlock, MapBlockKind, RenderMode, TransformMode, TransformState } from './types/game';

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
  const [status, setStatus] = useState<GameStatus>('ready');
  const [editorMode, setEditorMode] = useState<EditorMode>('build');
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
  const defaultTransform = useRef<TransformState>({
    position: [12, 1.4, -8],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });
  const [transformState, setTransformState] = useState<TransformState>(defaultTransform.current);

  const handleCheckpoint = useCallback((label: string) => {
    setCheckpointToast(`${label} reached`);
  }, []);

  const resetCharacter = useCallback((spawn: [number, number, number]) => {
    characterRef.current?.reset(new Vector3(spawn[0], spawn[1], spawn[2]));
  }, []);

  const resetMap = useCallback(() => {
    setBlocks([]);
    setCheckpointIndex(null);
    setCheckpointToast(null);
    setStatus('ready');
    setEditorMode('build');
    setElapsed(0);
    resetCharacter([0, 2, 0]);
  }, [resetCharacter]);

  const handlePlay = useCallback(() => {
    setEditorMode('play');
    setStatus('playing');
    setElapsed(0);
    setCheckpointToast(null);
    setCheckpointIndex(null);
    resetCharacter([0, 2, 0]);
  }, [resetCharacter]);

  const handleBuildMode = useCallback(() => {
    setEditorMode('build');
    setStatus('ready');
    setElapsed(0);
    setCheckpointToast(null);
    setCheckpointIndex(null);
    resetCharacter([0, 2, 0]);
  }, [resetCharacter]);

  const handleLoadSample = useCallback((name: 'modern' | 'compact') => {
    const sample = getSampleMap(name);
    setBlocks(sample);
    // place character above first block
    const first = sample[0];
    if (first) {
      const spawnY = (first.position[1] ?? 0) + 2.0;
      resetCharacter([first.position[0], spawnY, first.position[2]]);
    } else {
      resetCharacter([0, 2, 0]);
    }
    // switch to play immediately
    setEditorMode('play');
    setStatus('playing');
    setElapsed(0);
    setCheckpointToast(null);
    setCheckpointIndex(null);
  }, [resetCharacter]);

  const handlePlaceBlock = useCallback((point: { x: number; y: number; z: number }) => {
    if (editorMode !== 'build') return;
    const catalogItem = getCatalogItem(selectedKind);
    const position = snapPlacement(point, catalogItem.size);
    setBlocks((currentBlocks) => [...currentBlocks, createMapBlock(selectedKind, position)]);
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
    setElapsed(0);
    setCheckpointToast(null);
    if (editorMode !== 'play') {
      setCheckpointIndex(null);
    }
    const checkpointBlocks = blocks.filter((block) => block.kind === 'checkpoint');
    const checkpointBlock = checkpointIndex === null ? null : checkpointBlocks[checkpointIndex] ?? null;
    if (editorMode === 'play' && checkpointBlock) {
      resetCharacter([checkpointBlock.position[0], checkpointBlock.position[1] + 1.5, checkpointBlock.position[2]]);
      return;
    }

    resetCharacter([0, 2, 0]);
  }, [blocks, checkpointIndex, editorMode, resetCharacter]);

  const nudgeTransform = useCallback((axis: 'x' | 'y' | 'z', direction: 1 | -1) => {
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
        <MobileControls />
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
          onLoadSample={handleLoadSample}
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
          onLoadSample={handleLoadSample}
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
              isBuildMode={editorMode === 'build'}
              onPlaceBlock={handlePlaceBlock}
            />
            <GameManager
              characterRef={characterRef}
              editorMode={editorMode}
              status={status}
              setStatus={setStatus}
              setElapsed={setElapsed}
              checkpointIndex={checkpointIndex}
              setCheckpointIndex={setCheckpointIndex}
              onCheckpoint={handleCheckpoint}
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
