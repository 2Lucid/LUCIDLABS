'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, FastForward, Play, Square, Loader2 } from 'lucide-react';

interface TokenSimulatorProps {
    speed: number;
    modelName: string;
}

// 1 token ≈ 4 characters in average French/English
const TOKENS_TO_CHARS = 4;
const PREDEFINED_TEXT = `L'optimisation des grands modèles de langage (LLM) représente l'un des défis majeurs de l'intelligence artificielle moderne. Au sein de Lucid Labs, nous analysons rigoureusement les métriques de latence intra-noeud et les dégradations sous charge. Lorsqu'un modèle est exécuté localement, la vitesse de traitement des tokens dépend directement de l'architecture choisie, des techniques de quantification appliquées (ex: GGUF 4-bit) et de la bande passante mémoire de la machine hôte. Atteindre une vitesse élevée sans compromettre la cohérence nécessite un équilibre délicat que ce banc d'essai permet de mesurer avec précision. L'architecture de test déploie plusieurs instances concurrentes pour valider la robustesse du système sous un stress intense, forçant le matériel à démontrer sa véritable résilience. L'IA générative demande des capacités de calculs asynchrones colossales orchestrées dynamiquement...`;

export default function TokenSimulator({ speed, modelName }: TokenSimulatorProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const textRef = useRef('');
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const playManually = () => {
        if (!speed || speed <= 0) return;
        setIsPlaying(true);
        setIsFinished(false);
        setDisplayedText('');
        textRef.current = '';
        if (intervalRef.current) clearInterval(intervalRef.current);

        const charsPerSec = speed * TOKENS_TO_CHARS;
        const intervalMs = 50; // update every 50ms for smooth visual
        const charsPerInterval = charsPerSec * (intervalMs / 1000);

        let currentIndex = 0;

        intervalRef.current = setInterval(() => {
            const nextIndex = Math.min(currentIndex + charsPerInterval, PREDEFINED_TEXT.length);
            // Append the new chunk to exact output
            const chunk = PREDEFINED_TEXT.substring(currentIndex, nextIndex);

            textRef.current += chunk;
            setDisplayedText(textRef.current);
            currentIndex = nextIndex;

            if (currentIndex >= PREDEFINED_TEXT.length) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setIsFinished(true);
                setIsPlaying(false);
            }
        }, intervalMs);
    };

    // Auto-play when speed/model changes
    useEffect(() => {
        setIsPlaying(false);
        setIsFinished(false);
        setDisplayedText('');
        textRef.current = '';
        if (intervalRef.current) clearInterval(intervalRef.current);

        if (speed > 0) {
            playManually();
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [speed, modelName]);

    const stopSimulation = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsPlaying(false);
    };

    return (
        <div className="w-full h-full min-h-[500px] flex flex-col rounded-2xl overflow-hidden bg-gradient-to-b from-zinc-900 to-black border border-white/10 shadow-lg">
            <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Simulateur Visuel</h3>
                </div>
                {speed > 0 && (
                    <div className="text-xs font-mono bg-primary/20 text-primary px-2 py-1 rounded-md flex items-center gap-1">
                        <FastForward className="w-3 h-3" />
                        {speed.toFixed(1)} t/s
                    </div>
                )}
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-sm leading-relaxed text-zinc-300 custom-scrollbar relative">
                {!speed ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4 opacity-50">
                        <Bot className="w-8 h-8" />
                        <p>Cliquez sur une barre 3D pour sélectionner un modèle</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 text-emerald-400 opacity-80 select-none">
                            <span className="text-zinc-500 mr-2">$</span>
                            bench {modelName} --speed {speed.toFixed(1)}
                        </div>
                        <div className="whitespace-pre-wrap">
                            {displayedText}
                            {isPlaying && <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />}
                        </div>
                    </>
                )}
            </div>

            <div className="p-4 bg-white/5 border-t border-white/10 flex gap-4">
                <button
                    onClick={isPlaying ? stopSimulation : playManually}
                    disabled={!speed || isFinished}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary text-sm font-medium py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isPlaying ? 'Arrêter' : 'Simuler la Génération'}
                </button>
            </div>
        </div>
    );
}
