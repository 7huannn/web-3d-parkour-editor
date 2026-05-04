import { useControls } from 'leva';

export function useCameraControls() {
  return useControls('Camera', {
    smoothness: { value: 1, min: 0.01, max: 1, step: 0.01 },
    fov: { value: 70, min: 40, max: 100, step: 1 }
  });
}