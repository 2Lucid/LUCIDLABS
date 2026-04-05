import { TaskGenerator } from "@/components/factory/TaskGenerator";
import { Layers } from "lucide-react";

export default function FlashcardsPage() {
    return (
        <TaskGenerator
            taskType="flashcards"
            icon={<Layers className="w-7 h-7 text-amber-400" />}
            title="Flashcards"
            description="Création de cartes mémoire recto-verso pour la répétition espacée."
            targetCount={1500}
            colorClass="bg-amber-500/10 border-amber-500/20"
        />
    );
}
