import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3 } from 'three';
import { useMobileControls } from '../contexts/MobileControlsContext';
import type { EditorMode, GameStatus, MapBlock } from '../types/game';
import type { CharacterControllerHandle } from './CharacterController';

type GameManagerProps = {
  characterRef: React.RefObject<CharacterControllerHandle>;
  editorMode: EditorMode;
  status: GameStatus;
  setStatus: (status: GameStatus) => void;
  setElapsed: (elapsed: number) => void;
  checkpointIndex: number | null;
  setCheckpointIndex: (index: number | null) => void;
  onCheckpoint: (label: string) => void;
  blocks: MapBlock[];
};

function isInsideBox(position: Vector3, box: { position: [number, number, number]; size: [number, number, number] }) {
  return (
    Math.abs(position.x - box.position[0]) <= box.size[0] * 0.5 &&
    Math.abs(position.y - box.position[1]) <= box.size[1] * 0.5 &&
    Math.abs(position.z - box.position[2]) <= box.size[2] * 0.5
  );
}

export function GameManager({
  characterRef,
  editorMode,
  status,
  setStatus,
  setElapsed,
  checkpointIndex,
  setCheckpointIndex,
  onCheckpoint,
  blocks,
}: GameManagerProps) {
  const [, getKeys] = useKeyboardControls();
  const { movement, isJumping } = useMobileControls();
  const elapsedRef = useRef(0);
  const lastUiUpdateRef = useRef(0);

  useEffect(() => {
    if (status === 'ready') {
      elapsedRef.current = 0;
      lastUiUpdateRef.current = 0;
      setElapsed(0);
    }
  }, [status, setElapsed]);

  useFrame((_, delta) => {
    const position = characterRef.current?.getPosition();
    if (!position) return;

    if (editorMode !== 'play') {
      return;
    }

    const input = getKeys();
    const hasInput =
      input.forward ||
      input.backward ||
      input.left ||
      input.right ||
      input.jump ||
      input.sprint ||
      isJumping ||
      Math.abs(movement.x) > 0.05 ||
      Math.abs(movement.y) > 0.05;

    if (status === 'ready' && hasInput) {
      setStatus('playing');
    }

    if (status !== 'playing') return;

    elapsedRef.current += delta;
    if (elapsedRef.current - lastUiUpdateRef.current > 0.05) {
      lastUiUpdateRef.current = elapsedRef.current;
      setElapsed(elapsedRef.current);
    }

    if (position.y < -10) {
      setStatus('lost');
      return;
    }

    const finishBlocks = blocks.filter((block) => block.kind === 'finish');
    if (finishBlocks.some((block) => isInsideBox(position, block))) {
      setStatus('won');
      return;
    }

    const hazardBlocks = blocks.filter((block) => block.kind === 'hazard');
    for (const hazard of hazardBlocks) {
      if (isInsideBox(position, hazard)) {
        setStatus('lost');
        return;
      }
    }

    const checkpointBlocks = blocks.filter((block) => block.kind === 'checkpoint');
    for (let i = 0; i < checkpointBlocks.length; i += 1) {
      const checkpoint = checkpointBlocks[i];
      if (isInsideBox(position, checkpoint) && (checkpointIndex === null || i > checkpointIndex)) {
        setCheckpointIndex(i);
        onCheckpoint(checkpoint.label ?? 'Checkpoint reached');
      }
    }
  });

  return null;
}
