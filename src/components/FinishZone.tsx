type FinishZoneProps = {
  position: [number, number, number];
  size: [number, number, number];
};

export function FinishZone({ position, size }: FinishZoneProps) {
  const [x, y, z] = position;

  return (
    <group position={[x, y, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#4ADE80" emissive="#16A34A" emissiveIntensity={0.4} transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, size[1] * 0.75, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[size[0] * 0.6, 0.2, 16, 48]} />
        <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
