import { TaskGenerator } from "@/components/factory/TaskGenerator";
import { MessageSquare } from "lucide-react";

export default function TutorPage() {
    return (
        <TaskGenerator
            taskType="tutor"
            icon={<MessageSquare className="w-7 h-7 text-cyan-400" />}
            title="Tuteur Socratique"
            description="Simulations conversationnelles (Multi-Turn) pour la pédagogie socratique."
            targetCount={3000}
            colorClass="bg-cyan-500/10 border-cyan-500/20"
        />
    );
}
