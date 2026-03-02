
"use client";

import { useState } from "react";
import { Check, Trash2, Edit, Download, FileJson } from "lucide-react";
import { deleteEntry, validateEntry } from "@/app/actions";
import { clsx } from "clsx";

interface Entry {
    id: string;
    created_at: string;
    type: string;
    subject: string;
    content: any;
    is_validated: boolean;
}

export function WarehouseTable({ initialData }: { initialData: Entry[] }) {
    const [data, setData] = useState<Entry[]>(initialData);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this entry?")) return;
        try {
            await deleteEntry(id);
            setData(data.filter(entry => entry.id !== id));
        } catch (e) {
            alert("Failed to delete");
        }
    };

    const handleValidate = async (id: string) => {
        try {
            await validateEntry(id);
            setData(data.map(entry => entry.id === id ? { ...entry, is_validated: true } : entry));
        } catch (e) {
            alert("Failed to validate");
        }
    };

    const handleExportJSONL = () => {
        const jsonl = data
            .filter(entry => entry.is_validated) // Only export validated
            .map(entry => JSON.stringify({
                prompt: `Generate ${entry.type} about ${entry.subject}`,
                completion: JSON.stringify(entry.content)
            }))
            .join("\n");

        const blob = new Blob([jsonl], { type: "application/jsonl" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lucid_labs_dataset_${new Date().toISOString().split('T')[0]}.jsonl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
                <div>
                    <h3 className="font-semibold text-foreground">Dataset Entries</h3>
                    <p className="text-sm text-muted-foreground">{data.length} records found</p>
                </div>
                <button
                    onClick={handleExportJSONL}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                    <Download className="w-4 h-4" /> Export Validated JSONL
                </button>
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-card">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-medium uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Subject</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {data.map((entry) => (
                            <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4">
                                    <span className={clsx(
                                        "px-2 py-1 rounded text-xs font-medium border",
                                        {
                                            'bg-blue-500/10 text-blue-500 border-blue-500/20': entry.type === 'flashcard',
                                            'bg-purple-500/10 text-purple-500 border-purple-500/20': entry.type === 'tutor_chat',
                                            'bg-yellow-500/10 text-yellow-500 border-yellow-500/20': entry.type === 'quiz',
                                        }
                                    )}>
                                        {entry.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-foreground max-w-xs truncate" title={entry.subject}>
                                    {entry.subject || "No subject"}
                                </td>
                                <td className="px-6 py-4">
                                    {entry.is_validated ? (
                                        <span className="flex items-center gap-1 text-green-500 text-xs font-medium">
                                            <Check className="w-3 h-3" /> Validated
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">Pending</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-muted-foreground">
                                    {new Date(entry.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {!entry.is_validated && (
                                            <button
                                                onClick={() => handleValidate(entry.id)}
                                                className="p-2 hover:bg-green-500/10 text-muted-foreground hover:text-green-500 rounded transition-colors" title="Validate"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button className="p-2 hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 rounded transition-colors" title="Edit JSON">
                                            <FileJson className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(entry.id)}
                                            className="p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded transition-colors" title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                    No entries found. Go to Generator Studio to create data.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
