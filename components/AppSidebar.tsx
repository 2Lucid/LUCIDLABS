
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Zap, Database, Settings } from "lucide-react";
import clsx from "clsx";

const navigation = [
    { name: "Production", href: "/", icon: LayoutDashboard },
    { name: "Generator Studio", href: "/generator", icon: Zap },
    { name: "Dataset", href: "/warehouse", icon: Database },
];

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <div className="flex flex-col w-64 h-screen sticky top-0 p-4">
            <div className="flex flex-col h-full bg-card/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/5">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-secondary animate-pulse-glow">
                        LUCID LABS
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1 tracking-wider uppercase">Dataset Forge</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                                    isActive
                                        ? "bg-primary/20 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-primary/30"
                                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <item.icon
                                    className={clsx(
                                        "w-5 h-5 transition-colors",
                                        isActive ? "text-primary drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" : "text-muted-foreground group-hover:text-white"
                                    )}
                                />
                                <span className="font-medium tracking-wide">{item.name}</span>
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5 bg-white/5">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/20 border border-white/5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xs ring-2 ring-white/10">
                            AD
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">Admin User</p>
                            <p className="text-xs text-muted-foreground truncate">admin@lucidlabs.ai</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
