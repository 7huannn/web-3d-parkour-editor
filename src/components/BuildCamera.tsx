import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

type BuildCameraProps = {
  readonly projection: {
    near: number;
    far: number;
    offsetX: number;
    height: number;
    distance: number;
  };
};

export function BuildCamera({ projection }: BuildCameraProps) {
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[projection.offsetX, projection.height, projection.distance]}
        fov={65}
        near={projection.near}
        far={projection.far}
      />
      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        enablePan
        enableZoom
        enableRotate
        screenSpacePanning
        minDistance={2}
        maxDistance={80}
      />
    </>
  );
}
