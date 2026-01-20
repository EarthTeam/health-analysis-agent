"use client";

import { useStore } from "@/lib/store";
import { computeDayAssessment, makeAnalysisBundle, voteLabelFromAssess } from "@/lib/logic";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, Copy, Activity, Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from "recharts";

export default function DashboardPage() {
    const { entries, settings } = useStore();
    const [copied, setCopied] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const effectiveDate = useMemo(() => {
        if (selectedDate) return selectedDate;
        if (!entries.length) return null;
        const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
        return sorted[sorted.length - 1].date;
    }, [entries, selectedDate]);

    const assessmentResult = useMemo(() => {
        if (!entries.length || !effectiveDate) return null;
        const currentEntry = entries.find(e => e.date === effectiveDate);
        if (!currentEntry) return null;

        return {
            assessment: computeDayAssessment(currentEntry, entries, settings.baselineDays, settings.mode),
            latest: currentEntry
        };
    }, [entries, settings, effectiveDate]);

    const { assessment, latest } = assessmentResult || { assessment: null, latest: null };

    const chartData = useMemo(() => {
        if (!entries.length || !effectiveDate) return [];
        const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
        const index = sorted.findIndex(e => e.date === effectiveDate);
        if (index === -1) return [];

        const window = sorted.slice(Math.max(0, index - settings.baselineDays + 1), index + 1);

        return window.map(entry => {
            const assess = computeDayAssessment(entry, entries, settings.baselineDays, settings.mode);

            // Map majority state to numeric for graphing
            let regulationVal = 50; // Neutral/Mixed
            if (assess.majority === "ok") regulationVal = 100;
            if (assess.majority === "stressed") regulationVal = 0;
            if (assess.cycleLabel) regulationVal = 25; // Special value for Dip

            return {
                date: entry.date.split("-").slice(1).join("/"), // MM/DD for compactness
                confidence: assess.conf,
                regulation: regulationVal,
                fullDate: entry.date
            };
        });
    }, [entries, settings, effectiveDate]);

    const latestDate = latest?.date || null;

    const handleCopyBundle = async () => {
        // @ts-ignore - stale type definition in some environments
        const text = makeAnalysisBundle(entries, settings, effectiveDate || undefined);
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error(e);
            alert("Failed to copy to clipboard");
        }
    };

    if (!assessment || !latest) {
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
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Recommendation Card */}
                <div className="col-span-1 md:col-span-2 bg-card rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden">
                    <div className={cn("absolute top-0 left-0 w-1 h-full", ringBg)}></div>
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Today&apos;s Strategy</h2>

                            {/* Daily Mantra */}
                            <div className="mt-3 mb-6">
                                <p className="text-xl md:text-2xl font-bold text-foreground leading-tight tracking-tight">
                                    {assessment.mantra}
                                </p>
                            </div>

                            <div className="flex items-center mt-2 flex-wrap gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-full bg-opacity-10", ringColor.replace("text-", "bg-"), ringColor)}>
                                        {icon}
                                    </div>
                                    <span className={cn("text-2xl md:text-3xl font-bold", ringColor)}>{assessment.recText}</span>
                                </div>

                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCalendarOpen(true)}
                        className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded-md hover:bg-secondary/80 transition-colors"
                    >
                        <Calendar className="w-3 h-3" />
                        {latestDate}
                    </button>

                    {/* Morning Scout Check */}
                    <div className="mb-6 p-4 bg-secondary/30 rounded-xl border border-border flex gap-3 items-center">
                        <div className="p-2 bg-background rounded-lg shadow-sm">
                            <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Morning Scout Check</h4>
                            <p className="text-sm font-semibold text-foreground">
                                {assessment.scoutCheck}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        <ul className="space-y-2">
                            {assessment.plan.map((p, i) => (
                                <li key={i} className="flex gap-2 text-foreground font-medium text-lg leading-snug">
                                    <span className="text-primary mt-1.5">•</span>
                                    <span>{p}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {assessment.insight && (
                        <div className="mb-6 p-4 bg-primary/5 border border-primary/10 rounded-xl flex gap-3 items-start">
                            <div className="mt-1">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Physiological Principle</h4>
                                <p className="text-sm text-foreground font-medium leading-relaxed italic">
                                    &ldquo;{assessment.insight}&rdquo;
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-border">
                        <div className="flex gap-2 items-start">
                            <span className="text-sm text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Why?</span>
                            <ul className="space-y-1">
                                {assessment.why.map((w, i) => (
                                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                        <span className="text-muted-foreground/50">•</span>
                                        <span>{w}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Stats Column */}
                <div className="space-y-6">
                    {/* Daily Status Card */}
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Daily Status</h3>
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "h-3 w-3 rounded-full",
                                assessment.cycleLabel ? "bg-amber-500" :
                                    assessment.majority === "ok" ? "bg-emerald-500" :
                                        assessment.majority === "stressed" ? "bg-red-500" :
                                            "bg-amber-500"
                            )}></div>
                            <span className={cn(
                                "text-2xl font-bold uppercase tracking-tight",
                                assessment.cycleLabel ? "text-amber-500" :
                                    assessment.majority === "ok" ? "text-emerald-500" :
                                        assessment.majority === "stressed" ? "text-red-500" :
                                            "text-amber-500"
                            )}>
                                {voteLabelFromAssess(assessment)}
                            </span>
                        </div>
                    </div>
                    {/* Crash Signature Card */}
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Crash Signature</h3>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                                    assessment.crashStatus === "Crash-State" ? "bg-red-500 text-white border-red-600" :
                                        assessment.crashStatus === "Crash-Onset" ? "bg-red-100 text-red-700 border-red-200" :
                                            assessment.crashStatus === "Pre-Crash" ? "bg-orange-100 text-orange-700 border-orange-200" :
                                                assessment.crashStatus === "Vulnerable" ? "bg-amber-100 text-amber-700 border-amber-200" :
                                                    "bg-emerald-100 text-emerald-700 border-emerald-200"
                                )}>
                                    {assessment.cycleLabel ? assessment.cycleLabel.toUpperCase() :
                                        (assessment.crashStatus === "Stable" ? "Stable/No Signal" : assessment.crashStatus.replace("-", " "))}
                                </div>
                            </div>

                            {assessment.cycleLabel === "Post-regulation dip" ? (
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-foreground leading-snug">
                                        The system has capacity, but neuro-energy hasn&apos;t come online yet.
                                    </p>
                                    <ul className="space-y-1">
                                        <li className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                                            <div className="w-1 h-1 rounded-full bg-primary" />
                                            <span>Capacity signals remain high (Morpheus readiness)</span>
                                        </li>
                                        <li className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                                            <div className="w-1 h-1 rounded-full bg-primary" />
                                            <span>Neuro-energy not yet online (fatigue + morning flatness)</span>
                                        </li>
                                        <li className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                                            <div className="w-1 h-1 rounded-full bg-primary" />
                                            <span>Recent load present (2 higher-step days)</span>
                                        </li>
                                    </ul>
                                    <p className="text-[10px] italic text-muted-foreground border-t border-border pt-1.5 mt-2">
                                        Capacity is present, but protection is needed until neuro-energy comes online.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm font-medium text-foreground leading-snug">
                                    {assessment.crashStatus === "Stable" && "System responding normally within expected ADT/CFS range."}
                                    {assessment.crashStatus === "Vulnerable" && "Reduced margin. System absorbing load more slowly."}
                                    {assessment.crashStatus === "Pre-Crash" && "Warning signs accumulating. Load tolerance is narrowing."}
                                    {assessment.crashStatus === "Crash-Onset" && "Multi-signal convergence. Strong recommendation to protect."}
                                    {assessment.crashStatus === "Crash-State" && "Dysregulation established. Recovery priority only."}
                                </p>
                            )}

                            <div className="flex gap-1 h-1.5 w-full bg-secondary/30 rounded-full overflow-hidden">
                                <div className={cn("h-full flex-1 transition-all", assessment.crashStatus !== "Stable" ? "bg-emerald-500" : "bg-emerald-200 opacity-20")} />
                                <div className={cn("h-full flex-1 transition-all", ["Vulnerable", "Pre-Crash", "Crash-Onset", "Crash-State"].includes(assessment.crashStatus) ? "bg-amber-500" : "bg-secondary")} />
                                <div className={cn("h-full flex-1 transition-all", ["Pre-Crash", "Crash-Onset", "Crash-State"].includes(assessment.crashStatus) ? "bg-orange-500" : "bg-secondary")} />
                                <div className={cn("h-full flex-1 transition-all", ["Crash-Onset", "Crash-State"].includes(assessment.crashStatus) ? "bg-red-500" : "bg-secondary")} />
                                <div className={cn("h-full flex-1 transition-all", assessment.crashStatus === "Crash-State" ? "bg-red-700" : "bg-secondary")} />
                            </div>

                            {/* Lag Seismograph */}
                            <div className="pt-3 border-t border-border mt-2">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Lag Seismograph (Oura/Whoop)</h4>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", (latest.ouraRec || 0) < 60 ? "bg-amber-500" : "bg-emerald-500")} />
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase">Recovery Suppression</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                assessment.ouraHrvStatus === "Optimal" ? "bg-emerald-500" :
                                                    assessment.ouraHrvStatus === "Good" ? "bg-emerald-400" :
                                                        assessment.ouraHrvStatus === "Fair" ? "bg-amber-500" :
                                                            assessment.ouraHrvStatus === "Pay Attention" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-secondary"
                                            )} />
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase">Oura HRV: {assessment.ouraHrvStatus}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded">24-48h SENSITIVE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Load Memory Card */}
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Load Memory (48h)</h3>
                            <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                assessment.loadMemory > 1.0 ? "bg-red-100 text-red-700" :
                                    assessment.loadMemory > 0.5 ? "bg-amber-100 text-amber-700" :
                                        "bg-emerald-100 text-emerald-700"
                            )}>
                                {assessment.loadMemory > 0 ? "STILL HOT" : "COOL"}
                            </span>
                        </div>
                        <div className="flex items-end gap-4">
                            <div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-foreground">{assessment.loadMemory.toFixed(2)}</span>
                                    <span className="text-xs text-muted-foreground mb-1">heat</span>
                                </div>
                            </div>

                            {/* Decay Visualization */}
                            <div className="flex-1 flex gap-1 h-12 items-end mb-1">
                                {assessment.loadHeatArray.map((h, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex-1 rounded-t-sm transition-all duration-500",
                                            h >= 1.0 ? "bg-red-500" : h >= 0.5 ? "bg-amber-500" : h > 0 ? "bg-emerald-500" : "bg-secondary"
                                        )}
                                        style={{ height: `${(h / 1.0) * 100}%`, minHeight: h > 0 ? '4px' : '2px' }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between text-[8px] text-muted-foreground uppercase tracking-tighter mt-1">
                            <span>-48h</span>
                            <span>-24h</span>
                            <span>Today</span>
                        </div>

                        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed italic border-t border-border pt-2">
                            How much recent load is the system still processing?
                        </p>
                    </div>

                    {/* Fragility Card */}
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fragility Profile</h3>
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "h-3 w-3 rounded-full",
                                assessment.fragilityType === "Global" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" :
                                    assessment.fragilityType === "Consolidation" ? "bg-orange-500" :
                                        assessment.fragilityType === "Recovering" ? "bg-blue-500" : "bg-emerald-500"
                            )}></div>
                            <span className={cn(
                                "text-2xl font-bold uppercase tracking-tight",
                                assessment.fragilityType === "Global" ? "text-red-500" :
                                    assessment.fragilityType === "Consolidation" ? "text-orange-500" :
                                        assessment.fragilityType === "Recovering" ? "text-blue-500" : "text-emerald-500"
                            )}>
                                {assessment.fragilityType === "None" ? "Stable" : assessment.fragilityType}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                            {assessment.fragilityType === "Global" ? "Systemic crash signature. Full nervous system protection required." :
                                assessment.fragilityType === "Consolidation" ? "Structural lag. Engine is ready but recharge/tissues are tender." :
                                    assessment.fragilityType === "Recovering" ? "A crash signature is still clearing. System capacity is returning but vulnerable." :
                                        "System is harmonized. Safe to build durability."}
                        </p>
                    </div>

                    {/* Signal Tension Card */}
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Signal Tension</h3>
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "h-3 w-3 rounded-full",
                                assessment.signalTension ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-emerald-500"
                            )}></div>
                            <span className={cn(
                                "text-2xl font-bold uppercase tracking-tight",
                                assessment.signalTension ? "text-amber-500" : "text-emerald-500"
                            )}>
                                {assessment.signalTension ? "YES" : "NO"}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                            {assessment.signalTension
                                ? "Morpheus engine is hot, but Oura/Whoop battery is lagging. High capacity vs low consolidation."
                                : "Signals are harmonized. No significant capacity vs consolidation gap."}
                        </p>
                    </div>

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
                    </div>

                    {/* Outliers Card */}
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Outliers</h3>
                        <div className="space-y-2 mt-2">
                            {assessment.flags.length > 0 ? (
                                <ul className="space-y-1.5">
                                    {assessment.flags.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            {f.hint}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    No outlier signals
                                </p>
                            )}
                        </div>

                        {assessment.oddOneOut && (
                            <div className="mt-4 pt-4 border-t border-border">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Device Conflict</h4>
                                <p className="text-xs font-bold text-foreground">{assessment.oddOneOut}</p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{assessment.oddWhy}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-foreground">Recovery Trends ({settings.baselineDays}d Window)</h2>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-primary"></div>
                            <span className="text-xs text-muted-foreground font-medium">Confidence</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span className="text-xs text-muted-foreground font-medium">Regulation</span>
                        </div>
                    </div>
                </div>

                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 20, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="regulationGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" />       {/* Green - Regulated (100) */}
                                    <stop offset="50%" stopColor="#f59e0b" />      {/* Yellow - Transitional (50) */}
                                    <stop offset="75%" stopColor="#f97316" />      {/* Orange - Dip (25) */}
                                    <stop offset="100%" stopColor="#ef4444" />     {/* Red - Dysregulated (0) */}
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                            />
                            <YAxis
                                domain={[0, 100]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                ticks={[0, 25, 50, 75, 100]}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                                formatter={(value: any, name: any) => {
                                    if (name === "Regulation Status") {
                                        const val = Number(value);
                                        if (val >= 90) return ["REGULATED", name];
                                        if (val >= 40) return ["TRANSITIONAL", name];
                                        if (val >= 15) return ["POST-REG DIP", name];
                                        return ["DYSREGULATED", name];
                                    }
                                    return [value, name];
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="confidence"
                                stroke="#2563eb"
                                strokeWidth={3}
                                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                activeDot={{ r: 6 }}
                                name="Confidence"
                                zIndex={10}
                            />
                            <Line
                                type="monotone"
                                dataKey="regulation"
                                stroke="url(#regulationGradient)"
                                strokeWidth={4}
                                dot={{ r: 3, strokeWidth: 1, fill: '#fff' }}
                                name="Regulation Status"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-between text-[10px] uppercase tracking-widest font-bold">
                    <span className="text-red-500">Dysregulated (0)</span>
                    <span className="text-orange-500">Post Reg Dip (25)</span>
                    <span className="text-amber-500">Transitional (50)</span>
                    <span className="text-emerald-500">Regulated (100)</span>
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
            {
                copied && (
                    <div className="mt-4 p-4 bg-secondary/50 rounded-xl border border-border text-xs font-mono text-muted-foreground overflow-auto max-h-40 whitespace-pre animate-in slide-in-from-bottom-2 duration-300">
                        {/* @ts-ignore */}
                        {makeAnalysisBundle(entries, settings, effectiveDate || undefined)}
                    </div>
                )
            }

            {/* Calendar Modal */}
            {
                isCalendarOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold">Select Date</h3>
                                <button
                                    onClick={() => setIsCalendarOpen(false)}
                                    className="p-2 hover:bg-secondary rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <CalendarView
                                entries={entries}
                                selectedDate={effectiveDate || ""}
                                onSelect={(date) => {
                                    setSelectedDate(date);
                                    setIsCalendarOpen(false);
                                }}
                            />
                        </div>
                    </div>
                )
            }
        </div >
    );
}

function CalendarView({ entries, selectedDate, onSelect }: { entries: any[], selectedDate: string, onSelect: (date: string) => void }) {
    const entryDates = new Set(entries.map(e => e.date));
    const [viewDate, setViewDate] = useState(new Date(selectedDate || Date.now()));

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

    const monthName = viewDate.toLocaleString('default', { month: 'long' });

    const days = [];
    // Padding for first day
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<div key={`pad-${i}`} className="h-10" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hasEntry = entryDates.has(dateStr);
        const isSelected = selectedDate === dateStr;

        days.push(
            <button
                key={d}
                disabled={!hasEntry}
                onClick={() => onSelect(dateStr)}
                className={cn(
                    "h-10 w-full rounded-lg flex items-center justify-center text-sm transition-all focus:outline-none",
                    isSelected ? "bg-primary text-primary-foreground font-bold shadow-md" :
                        hasEntry ? "hover:bg-primary/10 text-foreground font-medium" : "text-muted-foreground/30 cursor-not-allowed"
                )}
            >
                {d}
            </button>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <span className="font-bold text-lg">{monthName} {year}</span>
                <div className="flex gap-1">
                    <button onClick={prevMonth} className="p-2 hover:bg-secondary rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={nextMonth} className="p-2 hover:bg-secondary rounded-lg"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                    <div key={d} className="text-[10px] font-bold text-muted-foreground py-2 uppercase">{d}</div>
                ))}
                {days}
            </div>

            <div className="pt-4 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground justify-center">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                    <span>HAS ENTRY</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span>SELECTED</span>
                </div>
            </div>
        </div>
    );
}
