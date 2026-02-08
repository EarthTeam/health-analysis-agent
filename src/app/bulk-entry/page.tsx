"use client";

import { useStore } from "@/lib/store";
import { DailyEntry } from "@/lib/types";
import { useState, useMemo } from "react";
import { Save, ChevronLeft, ChevronRight, Activity, Watch, Smartphone, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BulkEntryPage() {
    const { entries, addEntry } = useStore();
    const [daysToShow, setDaysToShow] = useState(7);
    const [localEntries, setLocalEntries] = useState<Record<string, Partial<DailyEntry>>>({});

    // Generate dates for the table
    const dates = useMemo(() => {
        const d = [];
        for (let i = 0; i < daysToShow; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            d.push(date.toISOString().split("T")[0]);
        }
        return d;
    }, [daysToShow]);

    // Initialize/Sync local entries with store entries
    const getEntryForDate = (date: string): Partial<DailyEntry> => {
        if (localEntries[date]) return localEntries[date];
        const storeEntry = entries.find(e => e.date === date);
        return storeEntry || { date, resistance: "N" };
    };

    const updateField = (date: string, field: keyof DailyEntry, value: any) => {
        setLocalEntries(prev => {
            const current = prev[date] || getEntryForDate(date);
            return {
                ...prev,
                [date]: { ...current, [field]: value }
            };
        });
    };

    const handleSaveAll = () => {
        Object.values(localEntries).forEach(entry => {
            if (entry.date) {
                // Ensure default values for required fields or structure
                const fullEntry: DailyEntry = {
                    date: entry.date,
                    mReady: entry.mReady ?? null,
                    mHrv: entry.mHrv ?? null,
                    ouraRec: entry.ouraRec ?? null,
                    ouraRhr: entry.ouraRhr ?? null,
                    ouraHrv: entry.ouraHrv ?? null,
                    whoopRec: entry.whoopRec ?? null,
                    whoopRhr: entry.whoopRhr ?? null,
                    whoopHrv: entry.whoopHrv ?? null,
                    steps: entry.steps ?? null,
                    fatigue: entry.fatigue ?? null,
                    resistance: entry.resistance === "Y" ? "Y" : "N",
                    joint: entry.joint ?? null,
                    notes: entry.notes ?? "",
                    morningEntry: entry.morningEntry ?? false,
                    ouraHrvStatus: entry.ouraHrvStatus ?? undefined
                };
                addEntry(fullEntry);
            }
        });
        alert("All changes saved locally!");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bulk Data Entry</h1>
                    <p className="text-sm text-muted-foreground mt-1">Efficiently enter data for multiple days across all trackers.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden">
                        <button
                            onClick={() => setDaysToShow(prev => Math.max(1, prev - 1))}
                            className="p-2 hover:bg-secondary transition-colors border-r border-border"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-4 text-sm font-semibold whitespace-nowrap">{daysToShow} Days</span>
                        <button
                            onClick={() => setDaysToShow(prev => prev + 1)}
                            className="p-2 hover:bg-secondary transition-colors border-l border-border"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={handleSaveAll}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium shadow-sm hover:bg-primary/90 transition-all"
                    >
                        <Save className="w-4 h-4" /> Save All
                    </button>
                </div>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-secondary/30 border-b border-border">
                                <th className="px-4 py-3 text-left font-bold text-muted-foreground sticky left-0 bg-secondary/30 z-20 min-w-[120px]">Date</th>
                                <th colSpan={2} className="px-4 py-2 text-center font-bold text-primary border-r border-border bg-blue-50/30">
                                    <div className="flex items-center justify-center gap-1"><Activity className="w-3 h-3" /> Morpheus</div>
                                </th>
                                <th colSpan={4} className="px-4 py-2 text-center font-bold text-indigo-600 border-r border-border bg-indigo-50/20">
                                    <div className="flex items-center justify-center gap-1"><Watch className="w-3 h-3" /> Oura</div>
                                </th>
                                <th colSpan={3} className="px-4 py-2 text-center font-bold text-red-600 border-r border-border bg-red-50/20">
                                    <div className="flex items-center justify-center gap-1"><Smartphone className="w-3 h-3" /> Whoop</div>
                                </th>
                                <th colSpan={4} className="px-4 py-2 text-center font-bold text-emerald-600 bg-emerald-50/20">
                                    <div className="flex items-center justify-center gap-1"><ClipboardList className="w-3 h-3" /> Logs</div>
                                </th>
                            </tr>
                            <tr className="bg-secondary/10 border-b border-border text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                                <th className="px-4 py-2 sticky left-0 bg-secondary/10 z-20"></th>
                                {/* Morpheus */}
                                <th className="px-2 py-2 text-center min-w-[60px] bg-blue-50/10">Ready%</th>
                                <th className="px-2 py-2 text-center min-w-[60px] bg-blue-50/10 border-r border-border">HRV</th>
                                {/* Oura */}
                                <th className="px-2 py-2 text-center min-w-[60px] bg-indigo-50/10">Rec%</th>
                                <th className="px-2 py-2 text-center min-w-[60px] bg-indigo-50/10">RHR</th>
                                <th className="px-2 py-2 text-center min-w-[60px] bg-indigo-50/10">HRV</th>
                                <th className="px-2 py-2 text-center min-w-[90px] bg-indigo-50/10 border-r border-border">Status</th>
                                {/* Whoop */}
                                <th className="px-2 py-2 text-center min-w-[60px] bg-red-50/10">Rec%</th>
                                <th className="px-2 py-2 text-center min-w-[60px] bg-red-50/10">RHR</th>
                                <th className="px-2 py-2 text-center min-w-[60px] bg-red-50/10 border-r border-border">HRV</th>
                                {/* Other */}
                                <th className="px-2 py-2 text-center min-w-[70px] bg-emerald-50/10">Fatigue</th>
                                <th className="px-2 py-2 text-center min-w-[60px] bg-emerald-50/10">Steps</th>
                                <th className="px-2 py-2 text-center min-w-[40px] bg-emerald-50/10">Jnt</th>
                                <th className="px-4 py-2 text-left bg-emerald-50/10">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {dates.map((date) => {
                                const e = getEntryForDate(date);
                                const isToday = date === new Date().toISOString().split("T")[0];
                                return (
                                    <tr key={date} className={cn("hover:bg-secondary/20 transition-colors", isToday && "bg-primary/5")}>
                                        <td className="px-4 py-2 font-mono text-xs font-bold sticky left-0 bg-white z-10 border-r border-border">
                                            {date}
                                        </td>
                                        {/* Morpheus */}
                                        <td className="p-1 min-w-[60px]">
                                            <input
                                                type="number"
                                                className="w-full h-8 text-center bg-transparent border-none focus:ring-1 focus:ring-primary rounded"
                                                value={e.mReady ?? ""}
                                                onChange={(ev) => updateField(date, "mReady", ev.target.value === "" ? null : Number(ev.target.value))}
                                            />
                                        </td>
                                        <td className="p-1 min-w-[60px] border-r border-border">
                                            <input
                                                type="number"
                                                className="w-full h-8 text-center bg-transparent border-none focus:ring-1 focus:ring-primary rounded"
                                                value={e.mHrv ?? ""}
                                                onChange={(ev) => updateField(date, "mHrv", ev.target.value === "" ? null : Number(ev.target.value))}
                                            />
                                        </td>
                                        {/* Oura */}
                                        <td className="p-1 min-w-[60px]">
                                            <input
                                                type="number"
                                                className="w-full h-8 text-center bg-transparent border-none focus:ring-1 focus:ring-primary rounded"
                                                value={e.ouraRec ?? ""}
                                                onChange={(ev) => updateField(date, "ouraRec", ev.target.value === "" ? null : Number(ev.target.value))}
                                            />
                                        </td>
                                        <td className="p-1 min-w-[60px]">
                                            <input
                                                type="number"
                                                className="w-full h-8 text-center bg-transparent border-none focus:ring-1 focus:ring-primary rounded"
                                                value={e.ouraRhr ?? ""}
                                                onChange={(ev) => updateField(date, "ouraRhr", ev.target.value === "" ? null : Number(ev.target.value))}
                                            />
                                        </td>
                                        <td className="p-1 min-w-[60px]">
                                            <input
                                                type="number"
                                                className="w-full h-8 text-center bg-transparent border-none focus:ring-1 focus:ring-primary rounded"
                                                value={e.ouraHrv ?? ""}
                                                onChange={(ev) => updateField(date, "ouraHrv", ev.target.value === "" ? null : Number(ev.target.value))}
                                            />
                                        </td>
                                        <td className="p-1 min-w-[90px] border-r border-border">
                                            <select
                                                className="w-full h-8 text-[10px] bg-transparent border-none focus:ring-1 focus:ring-primary rounded p-0 text-center"
                                                value={e.ouraHrvStatus ?? ""}
                                                onChange={(ev) => updateField(date, "ouraHrvStatus", ev.target.value === "" ? undefined : ev.target.value)}
                                            >
                                                <option value="">—</option>
                                                <option value="Optimal">Optimal</option>
                                                <option value="Good">Good</option>
                                                <option value="Fair">Fair</option>
                                                <option value="Pay Attention">Pay Attention</option>
                                            </select>
                                        </td>
                                        {/* Whoop */}
                                        <td className="p-1 min-w-[60px]">
                                            <input
                                                type="number"
                                                className="w-full h-8 text-center bg-transparent border-none focus:ring-1 focus:ring-primary rounded"
                                                value={e.whoopRec ?? ""}
                                                onChange={(ev) => updateField(date, "whoopRec", ev.target.value === "" ? null : Number(ev.target.value))}
                                            />
                                        </td>
                                        <td className="p-1 min-w-[60px]">
                                            <input
                                                type="number"
                                                className="w-full h-8 text-center bg-transparent border-none focus:ring-1 focus:ring-primary rounded"
                                                value={e.whoopRhr ?? ""}
                                                onChange={(ev) => updateField(date, "whoopRhr", ev.target.value === "" ? null : Number(ev.target.value))}
                                            />
                                        </td>
                                        <td className="p-1 min-w-[60px] border-r border-border">
                                            <input
                                                type="number"
                                                className="w-full h-8 text-center bg-transparent border-none focus:ring-1 focus:ring-primary rounded"
                                                value={e.whoopHrv ?? ""}
                                                onChange={(ev) => updateField(date, "whoopHrv", ev.target.value === "" ? null : Number(ev.target.value))}
                                            />
                                        </td>
                                        {/* Logs */}
                                        <td className="p-1 min-w-[70px]">
                                            <input
                                                type="number"
                                                className="w-full h-8 text-center bg-transparent border-none focus:ring-1 focus:ring-primary rounded"
                                                value={e.fatigue ?? ""}
                                                onChange={(ev) => updateField(date, "fatigue", ev.target.value === "" ? null : Number(ev.target.value))}
                                                placeholder="1-10"
                                            />
                                        </td>
                                        <td className="p-1 min-w-[60px]">
                                            <input
                                                type="number"
                                                className="w-full h-8 text-center bg-transparent border-none focus:ring-1 focus:ring-primary rounded"
                                                value={e.steps ?? ""}
                                                onChange={(ev) => updateField(date, "steps", ev.target.value === "" ? null : Number(ev.target.value))}
                                            />
                                        </td>
                                        <td className="p-1 min-w-[40px]">
                                            <input
                                                type="number"
                                                className="w-full h-8 text-center bg-transparent border-none focus:ring-1 focus:ring-primary rounded text-xs"
                                                value={e.joint ?? ""}
                                                onChange={(ev) => updateField(date, "joint", ev.target.value === "" ? null : Number(ev.target.value))}
                                            />
                                        </td>
                                        <td className="p-1">
                                            <input
                                                type="text"
                                                className="w-full h-8 px-2 bg-transparent border-none focus:ring-1 focus:ring-primary rounded text-xs"
                                                value={e.notes ?? ""}
                                                onChange={(ev) => updateField(date, "notes", ev.target.value)}
                                                placeholder="..."
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
