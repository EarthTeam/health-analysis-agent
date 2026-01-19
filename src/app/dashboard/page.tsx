"use client";

import { useStore } from "@/lib/store";
import { computeDayAssessment, makeAnalysisBundle, voteLabelFromAssess } from "@/lib/logic";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, Copy, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
    const { entries, settings } = useStore();
    const [copied, setCopied] = useState(false);

    const assessment = useMemo(() => {
        if (!entries.length) return null;
        const latest = [...entries].sort((a, b) => (a.date || "").localeCompare(b.date || "")).pop()!;
        return computeDayAssessment(latest, entries, settings.baselineDays, settings.mode);
    }, [entries, settings]);

    const latestDate = entries.length ? [...entries].sort((a, b) => a.date.localeCompare(b.date)).pop()?.date : null;

    const handleCopyBundle = async () => {
        const text = makeAnalysisBundle(entries, settings);
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error(e);
            alert("Failed to copy to clipboard");
        }
    };

    if (!assessment) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-dashed border-border text-center">
                <Activity className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground">No Data Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">Start by adding your first daily entry to see recovery insights.</p>
                <a href="/entry" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                    Start Entry
                </a>
            </div>
        );
    }

    const recColor = assessment.rec; // Green, Yellow, Red
    const ringColor = recColor === "Green" ? "text-emerald-500" : recColor === "Yellow" ? "text-amber-500" : "text-red-500";
    const ringBg = recColor === "Green" ? "bg-emerald-500" : recColor === "Yellow" ? "bg-amber-500" : "bg-red-500";
    const icon = recColor === "Green" ? <CheckCircle2 className="w-8 h-8" /> : recColor === "Yellow" ? <AlertTriangle className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Recommendation Card */}
                <div className="col-span-1 md:col-span-2 bg-card rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden">
                    <div className={cn("absolute top-0 left-0 w-1 h-full", ringBg)}></div>
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Today&apos;s Recommendation</h2>
                            <div className="flex items-center mt-2">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-full bg-opacity-10", ringColor.replace("text-", "bg-"), ringColor)}>
                                        {icon}
                                    </div>
                                    <span className={cn("text-2xl md:text-3xl font-bold", ringColor)}>{assessment.recText}</span>
                                </div>

                                <div className="h-8 w-px bg-border mx-4 hidden sm:block"></div>

                                <div className="hidden sm:block">
                                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vote</h3>
                                    <span className={cn(
                                        "text-xl font-bold uppercase tracking-tight",
                                        assessment.cycleLabel ? "text-amber-500" :
                                            assessment.majority === "ok" ? "text-emerald-500" :
                                                assessment.majority === "stressed" ? "text-red-500" :
                                                    "text-amber-500"
                                    )}>
                                        {voteLabelFromAssess(assessment)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded-md">{latestDate}</span>
                    </div>

                    <p className="text-lg font-medium text-foreground leading-relaxed mb-4">
                        {assessment.plan}
                    </p>
                    <div className="pt-4 border-t border-border flex gap-2">
                        <span className="text-sm text-muted-foreground font-bold uppercase tracking-wider">Why?</span>
                        <span className="text-sm text-muted-foreground">{assessment.why}</span>
                    </div>
                </div>

                {/* Stats Column */}
                <div className="space-y-6">
                    {/* Confidence Card */}
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm relative">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Confidence Score</h3>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-bold text-foreground">{assessment.conf}</span>
                            <span className="text-sm text-muted-foreground mb-1">/ 100</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${assessment.conf}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Higher = devices agree + stable vs baseline.</p>
                    </div>

                    {/* Odd One Out Card */}
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Odd One Out</h3>
                        <div className="text-xl font-bold text-foreground">
                            {assessment.oddOneOut || "None"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                            {assessment.oddOneOut ? assessment.oddWhy : "Devices are mostly consistent today."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-4">
                <button
                    onClick={handleCopyBundle}
                    className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-xl font-medium shadow-lg hover:bg-foreground/90 transition-all active:scale-95"
                >
                    {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                    {copied ? "Copied to Clipboard" : "Copy Analysis Bundle"}
                </button>
            </div>

            {/* Debug / Details Preview */}
            {copied && (
                <div className="mt-4 p-4 bg-secondary/50 rounded-xl border border-border text-xs font-mono text-muted-foreground overflow-auto max-h-40 whitespace-pre animate-in slide-in-from-bottom-2 duration-300">
                    {makeAnalysisBundle(entries, settings)}
                </div>
            )}
        </div>
    );
}
