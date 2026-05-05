import { useContext } from 'react';
import { MobileControlsContext } from './mobileControlsStore';

export function useMobileControls() {
  return useContext(MobileControlsContext);
}
