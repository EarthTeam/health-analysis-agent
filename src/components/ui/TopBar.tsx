"use client";

import { useStore } from "@/lib/store";
import { SlidersHorizontal, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopBar() {
    const { settings, setSettings, isSyncing } = useStore();

    return (
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-border gap-4">
            <div className="flex items-center gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Recovery Dashboard</h1>
                        <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono font-bold text-muted-foreground border border-border">v2.13.1</span>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">Daily recovery analysis and training guidance</p>
                </div>
                {isSyncing && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-full animate-pulse border border-blue-100">
                        <Cloud className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Syncing</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm p-2 rounded-xl border border-border/50 shadow-sm w-full sm:w-auto overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 px-2 text-muted-foreground">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Settings</span>
                </div>

                <div className="h-4 w-px bg-border" />

                <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-foreground whitespace-nowrap">Baseline:</label>
                    <select
                        value={settings.baselineDays}
                        onChange={(e) => setSettings({ ...settings, baselineDays: Number(e.target.value) })}
                        className="text-sm border border-input rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="7">7 Days</option>
                        <option value="10">10 Days</option>
                        <option value="14">14 Days</option>
                        <option value="21">21 Days</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-foreground whitespace-nowrap">Mode:</label>
                    <select
                        value={settings.mode}
                        onChange={(e) => setSettings({ ...settings, mode: e.target.value as "standard" | "adt" })}
                        className="text-sm border border-input rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="standard">Standard</option>
                        <option value="adt">ADT (Joint Protect)</option>
                    </select>
                </div>
            </div>
        </header>
    );
}
