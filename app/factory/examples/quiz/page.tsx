import { TaskGenerator } from "@/components/factory/TaskGenerator";
import { ListChecks } from "lucide-react";

export default function QuizPage() {
    return (
        <TaskGenerator
            taskType="quiz"
            icon={<ListChecks className="w-7 h-7 text-emerald-400" />}
            title="Quiz QCM"
            description="Évaluation ciblée de connaissances à choix multiples."
            targetCount={3000}
            colorClass="bg-emerald-500/10 border-emerald-500/20"
        />
    );
}
