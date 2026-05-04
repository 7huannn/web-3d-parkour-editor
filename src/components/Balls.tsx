import { useMemo } from 'react';
import { ShaderMaterial, Color } from 'three';
import { RigidBody } from '@react-three/rapier';
import { useControls } from 'leva';
import { ToonVertexShader, ToonFragmentShader } from '../shaders/toonShader';

type BallsProps = Readonly<{
  count?: number;
  center?: [number, number, number];
  spread?: [number, number, number];
}>;

export function Balls({ count = 80, center = [12, 8, 12], spread = [6, 8, 6] }: BallsProps) {
  const controls = useControls('Balls', {
    bounciness: { value: 0.7, min: 0, max: 1, step: 0.1 },
    friction: { value: .25, min: 0, max: 1, step: 0.1 },
    outlineThickness: { value: 0.25, min: 0, max: 0.5, step: 0.01 },
  });

  const toonMaterial = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        color: { value: new Color('#51BCFF') },
        outlineThickness: { value: controls.outlineThickness }
      },
      vertexShader: ToonVertexShader,
      fragmentShader: ToonFragmentShader,
    });
  }, [controls.outlineThickness]);

  const balls = useMemo(() => {
    const ballsArray = [];
    for (let i = 0; i < count; i++) {
      const x = center[0] + (Math.random() - 0.5) * spread[0];
      const y = center[1] + Math.random() * spread[1];
      const z = center[2] + (Math.random() - 0.5) * spread[2];
      const scale = Math.random() * 0.3 + 0.2;
      const color = '#51BCFF';
      
      ballsArray.push({ id: `ball-${i}`, position: [x, y, z], scale, color });
    }
    return ballsArray;
  }, [count, center, spread]);

  return (
    <>
      {balls.map((ball) => (
        <RigidBody
          key={ball.id}
          colliders="ball"
          restitution={controls.bounciness}
          friction={controls.friction}
          position={ball.position}
        >
          <mesh castShadow receiveShadow>
            <icosahedronGeometry args={[ball.scale, 3]} />
            <primitive object={toonMaterial} />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}