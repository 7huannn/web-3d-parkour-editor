type SpawnMarkerProps = {
  position: [number, number, number];
  size: [number, number, number];
  active?: boolean;
};

export function SpawnMarker({ position, size, active = true }: SpawnMarkerProps) {
  const [x, y, z] = position;
  const color = active ? '#FACC15' : '#EAB308';
  const baseY = -size[1] * 0.5 + 0.04;

  return (
    <group position={[x, y, z]}>
      <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]} position={[0, baseY, 0]}>
        <torusGeometry args={[size[0] * 0.42, 0.07, 12, 36]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, baseY + 0.42, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.84, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, baseY + 0.92, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.42, 0.42, 0.08]} />
        <meshStandardMaterial color="#FEF3C7" emissive={color} emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}
