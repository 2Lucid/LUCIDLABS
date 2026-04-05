import { TaskGenerator } from "@/components/factory/TaskGenerator";
import { FileText } from "lucide-react";

export default function RevisionPage() {
    return (
        <TaskGenerator
            taskType="revision"
            icon={<FileText className="w-7 h-7 text-pink-400" />}
            title="Fiches de Révision"
            description="Synthèses de cours et fiches de mémorisation."
            targetCount={1500}
            colorClass="bg-pink-500/10 border-pink-500/20"
        />
    );
}
