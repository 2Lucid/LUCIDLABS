
import { LucideIcon } from "lucide-react";
import clsx from "clsx";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        label: string;
    };
    color?: "primary" | "secondary" | "accent" | "purple" | "blue" | "green" | "red";
}

export function StatsCard({ title, value, icon: Icon, description, trend, color = "primary" }: StatsCardProps) {
    const colorClasses = {
        primary: "bg-primary/10 text-primary",
        secondary: "bg-secondary/10 text-secondary-foreground",
        accent: "bg-accent/10 text-accent",
        purple: "bg-purple-500/10 text-purple-500",
        blue: "bg-blue-500/10 text-blue-500",
        green: "bg-green-500/10 text-green-500",
        red: "bg-red-500/10 text-red-500",
    };

    return (
        <div className="relative bg-card/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl overflow-hidden group hover:border-primary/30 transition-all duration-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]">
            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 blur-2xl" />
            </div>

            <div className="flex items-center justify-between relative z-10">
                <div>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                    <h3 className="text-3xl font-bold mt-2 text-white drop-shadow-md">{value}</h3>
                </div>
                <div className={clsx("p-3 rounded-xl ring-1 ring-white/10 shadow-lg backdrop-blur-sm", colorClasses[color])}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            {(description || trend) && (
                <div className="mt-4 flex items-center gap-2 text-xs relative z-10">
                    {trend && (
                        <span className={clsx("font-bold px-1.5 py-0.5 rounded", trend.value >= 0 ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30")}>
                            {trend.value > 0 ? "+" : ""}{trend.value}%
                        </span>
                    )}
                    {description && <span className="text-muted-foreground/80">{description}</span>}
                </div>
            )}
        </div>
    );
}
