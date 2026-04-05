import React from "react";
import { MessageSquare, ListChecks, Layers, BookOpen, FileText, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

interface TaskPreviewPanelProps {
    taskType: 'quiz' | 'homework' | 'flashcards' | 'revision' | 'tutor';
    example: any;
}

export function TaskPreviewPanel({ taskType, example }: TaskPreviewPanelProps) {
    if (!example) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 p-8 text-center border border-white/5 border-dashed rounded-2xl bg-black/10">
                <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                    <span className="text-2xl">⏳</span>
                </div>
                <p className="font-medium text-sm">En attente de la première génération...</p>
                <p className="text-xs max-w-xs mt-2 opacity-50">L'IA est en train de traiter le contexte Pronote pour fabriquer le meilleur exemple possible.</p>
            </div>
        );
    }

    const renderContent = () => {
        switch (taskType) {
            case 'tutor': {
                const conversation = example.conversation || [];
                return (
                    <div className="space-y-4 px-2">
                        {conversation.slice(-4).map((msg: any, i: number) => (
                            <div key={i} className={clsx(
                                "max-w-[85%] rounded-2xl p-4 flex flex-col gap-1 text-sm animate-in slide-in-from-bottom-2 fade-in duration-300",
                                msg.role === 'user' 
                                    ? "ml-auto bg-cyan-500/20 text-cyan-50 rounded-br-none border border-cyan-500/30" 
                                    : "mr-auto bg-white/10 text-white rounded-bl-none border border-white/10"
                            )}>
                                <span className={clsx("text-xs font-bold uppercase tracking-wider", msg.role === 'user' ? "text-cyan-300" : "text-white/50")}>
                                    {msg.role === 'user' ? 'Élève Simulé' : 'Tuteur IA'}
                                </span>
                                <p className="leading-relaxed">{msg.content}</p>
                            </div>
                        ))}
                    </div>
                );
            }

            case 'quiz': {
                const question = example.questions?.[0];
                if (!question) return null;
                return (
                    <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-500">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl">
                            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2 block">Question 1/10</span>
                            <h4 className="text-lg font-medium text-white mb-4">{question.intitule}</h4>
                            <div className="space-y-2">
                                {question.propositions.map((prop: string, i: number) => {
                                    const isCorrect = question.reponses.includes(prop);
                                    return (
                                        <div key={i} className={clsx(
                                            "p-3 rounded-xl border text-sm flex items-center justify-between",
                                            isCorrect 
                                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-100" 
                                                : "bg-white/5 border-white/10 text-muted-foreground"
                                        )}>
                                            <span>{prop}</span>
                                            {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-sm text-muted-foreground">
                            <span className="font-bold text-white mb-1 block">💡 Explication de l'IA :</span>
                            {question.explication}
                        </div>
                    </div>
                );
            }

            case 'flashcards': {
                const card = example.cards?.[0];
                if (!card) return null;
                return (
                    <div className="w-full h-full flex items-center justify-center animate-in fade-in duration-500">
                        <div className="relative w-full max-w-sm aspect-[4/3] perspective-1000 group">
                            <div className="w-full h-full relative preserve-3d transition-transform duration-700 ease-in-out group-hover:rotate-y-180 cursor-pointer">
                                {/* Front */}
                                <div className="absolute inset-0 backface-hidden bg-amber-500/10 border border-amber-500/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
                                    <span className="absolute top-4 left-4 text-amber-500 text-xs font-bold uppercase">Recto</span>
                                    <h3 className="text-2xl font-bold text-amber-50">{card.front}</h3>
                                    <span className="absolute bottom-4 text-amber-500/50 text-xs uppercase tracking-widest">(Survolez pour retourner)</span>
                                </div>
                                {/* Back */}
                                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white/10 border border-white/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
                                    <span className="absolute top-4 left-4 text-white/50 text-xs font-bold uppercase">Verso</span>
                                    <p className="text-lg font-medium text-white">{card.back}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }

            case 'homework': {
                const aide = example.aide;
                if (!aide) return null;
                return (
                    <div className="w-full space-y-4 animate-in slide-in-from-right-4 fade-in duration-500 text-sm">
                        <div className="bg-indigo-500/10 border border-indigo-500/30 p-5 rounded-2xl">
                            <h4 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" /> Reformulation
                            </h4>
                            <p className="text-indigo-50 leading-relaxed italic">"{aide.reformulation}"</p>
                        </div>
                        <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                            <h4 className="text-white font-bold mb-3">Plan d'Attaque</h4>
                            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                                {aide.plan?.map((step: string, i: number) => (
                                    <li key={i}>{step}</li>
                                ))}
                            </ol>
                        </div>
                    </div>
                );
            }

            case 'revision': {
                const sheet = example.sheet;
                if (!sheet) return null;
                return (
                    <div className="w-full max-h-full overflow-hidden relative fade-in duration-500 bg-pink-500/5 border border-pink-500/20 rounded-2xl p-6">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-500" />
                        <h3 className="text-xl font-bold text-pink-50 mb-6">{sheet.title}</h3>
                        
                        <div className="space-y-6">
                            {sheet.sections?.slice(0, 2).map((section: any, i: number) => (
                                <div key={i}>
                                    <h4 className="text-pink-400 font-bold mb-2 text-sm uppercase tracking-wider">{section.title}</h4>
                                    <p className="text-muted-foreground text-sm line-clamp-4 leading-relaxed bg-white/5 p-3 rounded-xl">{section.content}</p>
                                </div>
                            ))}
                        </div>
                        
                        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#0f1117] to-transparent pointer-events-none rounded-b-2xl" />
                    </div>
                );
            }
        }
    };

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <span className="text-sm font-bold text-white inline-flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Rendu Visuel de l'Exercice
                </span>
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">Live Preview</span>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                {renderContent()}
            </div>
        </div>
    );
}
