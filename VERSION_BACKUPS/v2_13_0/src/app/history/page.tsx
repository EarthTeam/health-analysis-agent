"use client";

import { useStore } from "@/lib/store";
import { computeDayAssessment, voteLabelFromAssess } from "@/lib/logic";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
    const { entries, settings } = useStore();
    const router = useRouter();

    // Create rows
    const rows = [...entries]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((entry) => {
            const assess = computeDayAssessment(entry, entries, settings.baselineDays, settings.mode);
            const outlierFields = [...new Set(assess.flags.map((f) => f.field))];

            return {
                entry,
                assess,
                outliers: outlierFields.length ? outlierFields.join(", ") : "—",
            };
        });

    if (!rows.length) {
        return (
            <div className="text-center p-12 text-muted-foreground">
                No entries found.
            </div>
        );
    }

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-secondary/50 border-b border-border">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vote</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Outliers</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conf</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rec</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground max-w-xs">Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {rows.map(({ entry, assess, outliers }) => {
                            const recColor = assess.rec === "Green" ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                                : assess.rec === "Yellow" ? "text-amber-600 bg-amber-50 border-amber-100"
                                    : "text-red-600 bg-red-50 border-red-100";

                            const voteColor = assess.cycleLabel ? "text-amber-600 bg-amber-50"
                                : assess.majority === "ok" ? "text-emerald-600 bg-emerald-50"
                                    : assess.majority === "stressed" ? "text-red-600 bg-red-50"
                                        : "text-amber-600 bg-amber-50";

                            return (
                                <tr
                                    key={entry.date}
                                    className="hover:bg-secondary/50 cursor-pointer transition-colors"
                                    onClick={() => router.push(`/entry?date=${entry.date}`)}
                                >
                                    <td className="px-4 py-3 font-mono text-foreground">{entry.date}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-transparent whitespace-nowrap", voteColor)}>
                                            {voteLabelFromAssess(assess)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-muted-foreground">{outliers}</td>
                                    <td className="px-4 py-3 font-mono">{assess.conf}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border leading-tight uppercase", recColor)}>
                                            {assess.recText}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground truncate max-w-xs" title={entry.notes}>
                                        {entry.notes}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
