import { TaskGenerator } from "@/components/factory/TaskGenerator";
import { BookOpen } from "lucide-react";

export default function HomeworkPage() {
    return (
        <TaskGenerator
            taskType="homework"
            icon={<BookOpen className="w-7 h-7 text-indigo-400" />}
            title="Aide aux Devoirs"
            description="Génération d'exercices d'application basés sur les devoirs."
            targetCount={1000}
            colorClass="bg-indigo-500/10 border-indigo-500/20"
        />
    );
}
