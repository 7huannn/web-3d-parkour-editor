type CheckpointProps = {
  position: [number, number, number];
  size: [number, number, number];
  active: boolean;
};

export function Checkpoint({ position, size, active }: CheckpointProps) {
  const [x, y, z] = position;
  const color = active ? '#38BDF8' : '#0EA5E9';

  return (
    <group position={[x, y, z]}>
      <mesh castShadow receiveShadow position={[0, -size[1] * 0.4, 0]}>
        <cylinderGeometry args={[0.25, 0.25, size[1] * 0.8, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[size[0] * 0.45, 0.08, 12, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}
