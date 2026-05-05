import { createContext } from 'react';

export type MobileControlsContextType = {
  isJumping: boolean;
  setIsJumping: (jumping: boolean) => void;
  movement: { x: number; y: number };
  setMovement: (movement: { x: number; y: number }) => void;
};

export const MobileControlsContext = createContext<MobileControlsContextType>({
  isJumping: false,
  setIsJumping: () => {},
  movement: { x: 0, y: 0 },
  setMovement: () => {},
});
