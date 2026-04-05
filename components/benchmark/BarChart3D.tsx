'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, OrbitControls, Text, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface BenchmarkData {
    id: string;
    model_name: string;
    single_tokens_per_sec: number;
    stress_degradation_pct: number;
}

interface BarChart3DProps {
    data: BenchmarkData[];
    onSelect?: (id: string) => void;
    onHover?: (id: string | null) => void;
}

function BarHover({ model, height, xPos, color, onSelect, onHover }: { model: BenchmarkData, height: number, xPos: number, color: string, onSelect?: (id: string) => void, onHover?: (id: string | null) => void }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHover] = React.useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            // Slight levitation and scale on hover
            const targetY = hovered ? height / 2 + 0.2 : height / 2;
            meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
            const scale = hovered ? 1.05 : 1;
            meshRef.current.scale.set(scale, 1, scale);
        }
    });

    return (
        <group position={[xPos, 0, 0]}>
            {/* The 3D Bar */}
            <Box
                ref={meshRef}
                args={[1.4, height, 1.4]} // Much thicker bars
                position={[0, height / 2, 0]}
                onClick={() => onSelect?.(model.id)}
                onPointerOver={() => { setHover(true); onHover?.(model.id); }}
                onPointerOut={() => { setHover(false); onHover?.(null); }}
                castShadow
            >
                <meshStandardMaterial
                    color={color}
                    roughness={0.1}
                    metalness={0.8}
                    emissive={new THREE.Color(color)}
                    emissiveIntensity={hovered ? 0.9 : 0.5}
                />
            </Box>

            {/* Model Name Label */}
            <Text
                position={[0, -0.6, 1.0]}
                rotation={[-Math.PI / 6, 0, 0]}
                fontSize={hovered ? 0.35 : 0.25}
                color={hovered ? "#ffffff" : "#a1a1aa"}
                anchorX="center"
                anchorY="middle"
                maxWidth={2}
                textAlign="center"
            >
                {model.model_name.replace('onnx-', '').replace('-q4f16_1-MLC', '')}
            </Text>

            <Text
                position={[0, height + 0.6, 0]}
                fontSize={0.4}
                color={hovered ? "#ffffff" : color}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
            >
                {model.single_tokens_per_sec?.toFixed(1)} t/s
            </Text>

            {/* Degradation Warning if hovered and high */}
            {hovered && model.stress_degradation_pct > 15 && (
                <Text
                    position={[0, height + 1.2, 0]}
                    fontSize={0.25}
                    color="#ff3333"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.03}
                    outlineColor="#000000"
                >
                    Stress: -{model.stress_degradation_pct}%
                </Text>
            )}
        </group>
    );
}

export default function BarChart3DViewer({ data, onSelect, onHover }: BarChart3DProps) {
    // Process data to find max
    const maxSpeed = useMemo(() => {
        return Math.max(...data.map(d => d.single_tokens_per_sec || 0), 10);
    }, [data]);

    // Gather top models for clarity (limited to 5 so they look massive)
    const displayData = useMemo(() => {
        const sorted = [...data].sort((a, b) => (b.single_tokens_per_sec || 0) - (a.single_tokens_per_sec || 0)).slice(0, 5);
        return sorted;
    }, [data]);

    const spacing = 2.5; // Wider spacing for thicker bars
    const totalWidth = (displayData.length - 1) * spacing;
    const startX = -totalWidth / 2;

    return (
        <div
            className="w-full relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900/40 via-zinc-950/80 to-black border border-white/10 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-md cursor-grab active:cursor-grabbing"
            style={{ height: '500px', minHeight: '400px' }}
        >
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <span className="text-xs font-bold text-white/70 uppercase tracking-widest flex items-center gap-2 drop-shadow-md">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Comparaison 3D des Vitesses (Tokens/sec)
                </span>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm drop-shadow-sm">Tournez la caméra librement avec la souris ou le doigt. La hauteur indique la vitesse. <span className="text-red-400 font-bold">Rouge</span> = Forte Dégradation.</p>
            </div>

            <Canvas camera={{ position: [0, 4, 10], fov: 45 }} className="w-full h-full">
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
                <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#22D3EE" />
                <pointLight position={[0, 2, 4]} intensity={0.5} color="#34D399" />

                <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
                    <group position={[0, -1.8, 0]}>
                        {displayData.map((d, i) => {
                            // Normalize height: max 3.5 units
                            const h = ((d.single_tokens_per_sec || 0) / maxSpeed) * 3.5 + 0.2;
                            const x = startX + i * spacing;

                            // Native Site Colors
                            let color = '#A1A1AA'; // zinc-400 (base neutral)
                            if (d.stress_degradation_pct > 20) color = '#EF4444'; // red-500
                            else if (d.stress_degradation_pct > 10) color = '#F59E0B'; // amber-500
                            else if (h > 3.0) color = '#34D399'; // emerald-400 (very fast)
                            else color = '#22D3EE'; // cyan-400 (standard good)

                            return (
                                <BarHover
                                    key={d.id}
                                    model={d}
                                    height={h}
                                    xPos={x}
                                    color={color}
                                    onSelect={onSelect}
                                    onHover={onHover}
                                />
                            );
                        })}

                        {/* High Quality Contact Shadows instead of flat plane */}
                        <ContactShadows
                            position={[0, -0.01, 0]}
                            opacity={0.9}
                            scale={30}
                            blur={2.0}
                            far={6}
                            resolution={512}
                            color="#000000"
                        />
                    </group>
                </Float>

                <OrbitControls
                    enableZoom={true}
                    maxPolarAngle={Math.PI / 2 - 0.1}
                    minPolarAngle={0.1}
                    enablePan={true}
                    autoRotate={false}
                />
            </Canvas>
        </div>
    );
}
