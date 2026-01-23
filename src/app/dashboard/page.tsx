"use client";

import { useStore } from "@/lib/store";
import { computeDayAssessment, makeAnalysisBundle, voteLabelFromAssess } from "@/lib/logic";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, Copy, Activity, Calendar, ChevronLeft, ChevronRight, X, Waves, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, AreaChart, Area, ReferenceLine } from "recharts";

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

            // Map status phase to numeric for graphing
            let regulationVal = 50; // INTEGRATION LAG
            if (assess.statusPhase === "REGULATED") regulationVal = 100;
            if (assess.statusPhase === "PRIMARY DYSREGULATION") regulationVal = 0;

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
                {/* Main Content Area */}
                <div className="col-span-1 md:col-span-2 space-y-6">
                    {/* Recommendation Card */}
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden">
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
                        <div className="mb-6 p-4 bg-secondary/30 rounded-xl border border-border flex gap-3 items-center mt-6">
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

                    {/* Secondary Metrics Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Load Memory Card */}
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <Waves className="w-3.5 h-3.5 text-blue-500" />
                                        Load Memory
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground/60 italic font-medium">Unintegrated physiological work</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-full select-none",
                                        assessment.loadStatus === "Saturated" ? "bg-red-100 text-red-700 border border-red-200" :
                                            assessment.loadStatus === "Integrating" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                                                "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    )}>
                                        {assessment.loadStatus.toUpperCase()}
                                    </span>
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                                        {assessment.loadTrend === "Rising" && <TrendingUp className="w-3 h-3 text-red-500" />}
                                        {assessment.loadTrend === "Declining" && <TrendingDown className="w-3 h-3 text-emerald-500" />}
                                        {assessment.loadTrend === "Plateau" && <Minus className="w-3 h-3 text-blue-400" />}
                                        {assessment.loadTrend}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-foreground leading-none tracking-tighter">
                                        {assessment.loadMemory.toFixed(2)}
                                    </span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Reservoir Depth</span>
                                </div>

                                {/* Reference Scale Bar */}
                                <div className="mt-3 space-y-1">
                                    <div className="w-full h-1.5 bg-secondary/30 rounded-full relative overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-1000",
                                                assessment.loadStatus === "Saturated" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" :
                                                    assessment.loadStatus === "Integrating" ? "bg-blue-500" : "bg-emerald-500"
                                            )}
                                            style={{ width: `${Math.min((assessment.loadMemory / 3.0) * 100, 100)}%` }}
                                        />
                                        {/* Markers for 0.8 and 2.5 */}
                                        <div className="absolute left-[26.6%] top-0 w-px h-full bg-background/50" />
                                        <div className="absolute left-[83.3%] top-0 w-px h-full bg-background/20" />
                                    </div>
                                    <div className="flex justify-between text-[8px] font-bold text-muted-foreground/50 uppercase tracking-tighter tabular-nums">
                                        <span>0.0</span>
                                        <div className="flex flex-col items-center -ml-4">
                                            <div className="h-1 w-px bg-muted-foreground/30 mb-0.5" />
                                            <span>0.8 Clear</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="h-1 w-px bg-muted-foreground/30 mb-0.5" />
                                            <span>2.5 Limit</span>
                                        </div>
                                        <span>3.0</span>
                                    </div>
                                </div>
                            </div>

                            {/* Reservoir Graph */}
                            <div className="h-28 w-full mt-auto">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={assessment.loadHistory}>
                                        <defs>
                                            <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={assessment.loadStatus === "Saturated" ? "#ef4444" : "#3b82f6"} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={assessment.loadStatus === "Saturated" ? "#ef4444" : "#3b82f6"} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-background/95 border border-border p-2 rounded-lg shadow-xl backdrop-blur-sm">
                                                            <p className="text-[10px] font-bold">{payload[0].payload.date}</p>
                                                            <p className="text-xs font-black text-primary">{payload[0].value}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke={assessment.loadStatus === "Saturated" ? "#ef4444" : "#3b82f6"}
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#loadGradient)"
                                            isAnimationActive={true}
                                        />
                                        <ReferenceLine
                                            y={2.5}
                                            stroke="#ef4444"
                                            strokeDasharray="3 3"
                                            strokeOpacity={0.5}
                                            label={{ position: 'right', value: 'LIMIT', fill: '#ef4444', fontSize: 8, fontWeight: 'bold' }}
                                        />
                                        <ReferenceLine
                                            y={0.8}
                                            stroke="#3b82f6"
                                            strokeDasharray="3 3"
                                            strokeOpacity={0.3}
                                            label={{ position: 'right', value: 'CLEAR', fill: '#3b82f6', fontSize: 8, fontWeight: 'bold' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="pt-4 border-t border-border mt-4">
                                <p className="text-sm font-bold text-foreground mb-1 leading-tight">
                                    {assessment.loadStatus === "Clear" ? "System is Absorbing" :
                                        assessment.loadStatus === "Integrating" ? "Processing Recent Load" :
                                            "PEM Risk: System Saturated"}
                                </p>
                                <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                    {assessment.loadStatus === "Clear" ? "Clearance exceeds new load. Safe to resume exploration." :
                                        assessment.loadStatus === "Integrating" ? "Plateau: System is working through recent volume. Hold steady." :
                                            "Rising: Load accumulating faster than absorption. Settle in and protect your baseline."}
                                </p>
                            </div>
                        </div>

                        {/* Fragility Card */}
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-between">
                            <div>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fragility Profile</h3>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-3 w-3 rounded-full",
                                        assessment.fragilityType === "Global" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" :
                                            assessment.fragilityType === "Integration Lag" ? "bg-orange-500" :
                                                assessment.fragilityType === "Recovering" ? "bg-blue-500" : "bg-emerald-500"
                                    )}></div>
                                    <span className={cn(
                                        "text-2xl font-bold uppercase tracking-tight",
                                        assessment.fragilityType === "Global" ? "text-red-500" :
                                            assessment.fragilityType === "Integration Lag" ? "text-orange-500" :
                                                assessment.fragilityType === "Recovering" ? "text-blue-500" : "text-emerald-500"
                                    )}>
                                        {assessment.fragilityType === "None" ? "Stable" : assessment.fragilityType}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                    {assessment.fragilityType === "Global" ? "Systemic crash signature. Full nervous system protection required." :
                                        assessment.fragilityType === "Integration Lag" ? "Structural lag. Engine is ready but recharge/tissues are tender." :
                                            assessment.fragilityType === "Recovering" ? "A crash signature is still clearing. System capacity is returning but vulnerable." :
                                                "System is harmonized. Safe to build durability."}
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-border/50">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Heat Limit</span>
                                    <span className="text-xs font-mono font-bold text-foreground/80">{assessment.loadThreshold.toLocaleString()} steps</span>
                                </div>
                                <div className="text-[9px] text-muted-foreground italic">Personalized based on 1.2x baseline mean</div>
                            </div>
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
                                assessment.statusPhase === "REGULATED" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                    assessment.statusPhase === "INTEGRATION LAG" ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" :
                                        "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"
                            )}></div>
                            <span className={cn(
                                "text-2xl font-bold uppercase tracking-tight",
                                assessment.statusPhase === "REGULATED" ? "text-emerald-500" :
                                    assessment.statusPhase === "INTEGRATION LAG" ? "text-blue-500" :
                                        "text-red-500"
                            )}>
                                {assessment.statusPhase}
                            </span>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 ml-6">
                            {assessment.statusPhase === "REGULATED" ? "Capacity Online" :
                                assessment.statusPhase === "INTEGRATION LAG" ? "Delayed Absorption Phase" :
                                    "System Offline"}
                        </p>
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

                        </div>
                    </div>

                    {/* Lag Seismograph Card */}
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lag Seismograph</h3>
                            <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded">24-48h SENSITIVE</span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-2 bg-secondary/20 rounded-xl border border-border/50">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", (latest.ouraRec || 0) < 60 ? "bg-amber-500" : "bg-emerald-500")} />
                                    <span className="text-xs font-bold text-foreground tracking-tight uppercase">Recharge Status</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                        (latest.ouraRec || 0) < 60 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
                                    )}>
                                        {(latest.ouraRec || 0) < 60 ? "SUPPRESSED" : "HEALTHY"}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-muted-foreground pr-1">{(latest.ouraRec || 0)}%</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-secondary/20 rounded-xl border border-border/50">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        assessment.ouraHrvStatus === "Optimal" ? "bg-emerald-500" :
                                            assessment.ouraHrvStatus === "Good" ? "bg-emerald-400" :
                                                assessment.ouraHrvStatus === "Fair" ? "bg-amber-500" :
                                                    assessment.ouraHrvStatus === "Pay Attention" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-secondary"
                                    )} />
                                    <span className="text-xs font-bold text-foreground tracking-tight uppercase">Oura HRV Trend</span>
                                </div>
                                <span className={cn(
                                    "text-xs font-bold px-2 py-0.5 rounded-lg",
                                    assessment.ouraHrvStatus === "Optimal" ? "bg-emerald-500/10 text-emerald-600" :
                                        assessment.ouraHrvStatus === "Good" ? "bg-emerald-400/10 text-emerald-600" :
                                            assessment.ouraHrvStatus === "Fair" ? "bg-amber-500/10 text-amber-600" :
                                                "bg-red-500/10 text-red-600"
                                )}>
                                    {assessment.ouraHrvStatus}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-secondary/20 rounded-xl border border-border/50">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        assessment.clearanceRate >= 35 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                            assessment.clearanceRate >= 25 ? "bg-emerald-400" :
                                                assessment.clearanceRate >= 15 ? "bg-amber-500" : "bg-red-500"
                                    )} />
                                    <span className="text-xs font-bold text-foreground tracking-tight uppercase">Absorption Power</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                        assessment.clearanceRate >= 35 ? "bg-emerald-500/10 text-emerald-600" :
                                            assessment.clearanceRate >= 25 ? "bg-emerald-400/10 text-emerald-600" :
                                                assessment.clearanceRate >= 15 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"
                                    )}>
                                        {assessment.clearanceRate >= 35 ? "FLUSHING" :
                                            assessment.clearanceRate >= 25 ? "CLEAN" :
                                                assessment.clearanceRate >= 15 ? "SLUGGISH" : "LOCKED"}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-muted-foreground pr-1">{assessment.clearanceRate}%</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed italic border-t border-border pt-2">
                            Links autonomic recharge to Load Memory clearance.
                            <span className="block mt-1 font-medium text-foreground/70">
                                &ldquo;Absorption Power&rdquo;: Determines how fast yours system drains the reservoir. If &ldquo;Locked,&rdquo; load will stack even with low activity.
                            </span>
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
                                ? "Performance Conflict: The Morpheus 'engine' is ready, but the Oura/Whoop 'battery' is still lagging behind."
                                : "Systemic Alignment: Your ability to perform matches your depth of recovery. No 'engine vs. battery' conflict."}
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
                                    <stop offset="50%" stopColor="#3b82f6" />      {/* Blue - Integration Lag (50) */}
                                    <stop offset="100%" stopColor="#ef4444" />     {/* Red - Primary Dysregulation (0) */}
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
                                        if (val >= 40) return ["INTEGRATION LAG", name];
                                        return ["PRIMARY DYSREGULATION", name];
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
                    <span className="text-red-500">Primary Dysregulation (0)</span>
                    <span className="text-blue-500">Integration Lag (50)</span>
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
