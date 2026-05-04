type HazardZoneProps = {
  position: [number, number, number];
  size: [number, number, number];
};

export function HazardZone({ position, size }: HazardZoneProps) {
  const [x, y, z] = position;

  return (
    <group position={[x, y, z]}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#EF4444" emissive="#B91C1C" emissiveIntensity={0.35} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}
