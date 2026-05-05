import { useState } from 'react';
import { MobileControlsContext } from './mobileControlsStore';

export function MobileControlsProvider({ children }: { children: React.ReactNode }) {
  const [isJumping, setIsJumping] = useState(false);
  const [movement, setMovement] = useState({ x: 0, y: 0 });

  return (
    <MobileControlsContext.Provider value={{ isJumping, setIsJumping, movement, setMovement }}>
      {children}
    </MobileControlsContext.Provider>
  );
}
