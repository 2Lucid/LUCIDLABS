
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Factory, Database, ChevronLeft, ChevronRight, Zap, Scale, Rocket, Activity } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

const navigation = [
    {
        group: "OVERVIEW",
        items: [
            { name: "Dashboard", href: "/", icon: LayoutDashboard },
        ]
    },
    {
        group: "FACTORY PIPELINE",
        items: [
            { name: "Autopilot", href: "/factory/autopilot", icon: Rocket },
            { name: "Hub", href: "/factory", icon: Factory },
            { name: "Contextes", href: "/factory/contexts", icon: Database },
            { name: "Exemples", href: "/factory/examples", icon: Zap },
            { name: "Tribunal", href: "/factory/judge", icon: Scale },
        ]
    },
    {
        group: "DATA",
        items: [
            { name: "Warehouse", href: "/warehouse", icon: Database },
            { name: "Benchmark", href: "/benchmark", icon: Activity },
        ]
    },
];

export function AppSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className={clsx(
            "flex flex-col h-screen sticky top-0 p-3 transition-all duration-300",
            collapsed ? "w-20" : "w-64"
        )}>
            <div className="flex flex-col h-full glass-card overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-white/5">
                    <div className="flex items-center justify-between">
                        {!collapsed && (
                            <div>
                                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-secondary">
                                    LUCID LABS
                                </h1>
                                <p className="text-[10px] text-muted-foreground mt-0.5 tracking-[0.2em] uppercase">
                                    Dataset Factory
                                </p>
                            </div>
                        )}
                        {collapsed && (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-black text-sm mx-auto">
                                L
                            </div>
                        )}
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className={clsx(
                                "p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-colors",
                                collapsed && "mx-auto mt-2"
                            )}
                        >
                            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
                    {navigation.map((group) => (
                        <div key={group.group}>
                            {!collapsed && (
                                <p className="text-[10px] text-muted-foreground/60 font-bold tracking-[0.15em] uppercase px-3 mb-2">
                                    {group.group}
                                </p>
                            )}
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={clsx(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                                                isActive
                                                    ? "bg-white/10 text-white"
                                                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                            )}
                                            title={collapsed ? item.name : undefined}
                                        >
                                            <item.icon
                                                className={clsx(
                                                    "w-[18px] h-[18px] transition-colors flex-shrink-0",
                                                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-white"
                                                )}
                                            />
                                            {!collapsed && (
                                                <span className="font-medium text-sm">{item.name}</span>
                                            )}
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-white/5">
                    <div className={clsx(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5",
                        collapsed && "justify-center"
                    )}>
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                            LG
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-white truncate">Lucas G.</p>
                                <p className="text-[10px] text-muted-foreground truncate">Admin</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
