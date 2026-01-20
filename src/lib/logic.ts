import { DailyEntry, DayAssessment, OutlierFlag, RecoveryState, RecColor, AppSettings, BaselineStats } from "./types";

// --- Math Helpers ---
export function mean(xs: (number | null)[]): number | null {
    const a = xs.filter((x): x is number => x != null && Number.isFinite(x));
    if (!a.length) return null;
    return a.reduce((p, c) => p + c, 0) / a.length;
}

export function sd(xs: (number | null)[]): number | null {
    const a = xs.filter((x): x is number => x != null && Number.isFinite(x));
    if (a.length < 2) return null;
    const m = mean(a)!;
    const v = a.reduce((p, c) => p + (c - m) * (c - m), 0) / (a.length - 1);
    return Math.sqrt(v);
}

export function clamp(x: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, x));
}

// --- Thresholds ---
function getThresholds(mode: "standard" | "adt") {
    if (mode === "adt") {
        return {
            zOutlier: 1.6,
            rhrAbs: 6,
            hrvDropPct: 0.18,
            recDropAbs: 10,
            fatigueHigh: 6,
            fatigueLow: 4,
            jointWarn: 4,
            disagreementPenalty: 25,
            outlierPenalty: 25,
            fatigueMismatchPenalty: 25,
            trainingPenalty: 10,
            stepsSwingPenalty: 10,
        };
    }
    return {
        zOutlier: 2.0,
        rhrAbs: 8,
        hrvDropPct: 0.22,
        recDropAbs: 12,
        fatigueHigh: 7,
        fatigueLow: 4,
        jointWarn: 5,
        disagreementPenalty: 20,
        outlierPenalty: 20,
        fatigueMismatchPenalty: 20,
        trainingPenalty: 8,
        stepsSwingPenalty: 8,
    };
}

// --- Assessment Logic ---

export function computeBaselines(
    entries: DailyEntry[],
    baselineDays: number,
    todayDate: string
): Record<keyof DailyEntry, BaselineStats> {
    const sorted = [...entries].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const idx = sorted.findIndex((e) => e.date === todayDate);
    const prior = idx === -1 ? sorted : sorted.slice(0, idx);
    const window = prior.slice(Math.max(0, prior.length - baselineDays));

    const fields: (keyof DailyEntry)[] = [
        "mReady", "mHrv", "ouraRec", "whoopRec", "whoopRhr", "ouraRhr", "ouraHrv", "whoopHrv", "steps", "fatigue", "joint"
    ];

    const base: any = {};
    for (const f of fields) {
        const xs = window.map((e) => (e as any)[f] as number | null);
        base[f] = { mean: mean(xs), sd: sd(xs), n: xs.filter((x) => x != null).length };
    }
    return base;
}

function classifyRecovery(entry: DailyEntry): { device: string; signal: string; score: number }[] {
    const votes: { device: string; signal: string; score: number }[] = [];
    if (entry.mReady != null) votes.push({ device: "Morpheus", signal: "mReady", score: entry.mReady });
    if (entry.ouraRec != null) votes.push({ device: "Oura", signal: "ouraRec", score: entry.ouraRec });
    if (entry.whoopRec != null) votes.push({ device: "Whoop", signal: "whoopRec", score: entry.whoopRec });
    else if (entry.whoopRhr != null) votes.push({ device: "Whoop", signal: "whoopRhrProxy", score: 120 - entry.whoopRhr });
    return votes;
}

function outlierFlags(
    entry: DailyEntry,
    base: Record<keyof DailyEntry, BaselineStats>,
    t: ReturnType<typeof getThresholds>
): OutlierFlag[] {
    const flags: OutlierFlag[] = [];
    const zflag = (field: keyof DailyEntry, hintLabel: string) => {
        const b = base[field];
        const val = (entry as any)[field] as number | null;
        if (!b || b.mean == null || val == null) return;
        if (!b.sd || b.sd === 0) return;
        const z = (val - b.mean) / b.sd;
        if (Math.abs(z) >= t.zOutlier) flags.push({ field, kind: "z", z, hint: hintLabel });
    };

    zflag("mReady", "Readiness");
    zflag("mHrv", "HRV");
    zflag("ouraRec", "Recovery");
    zflag("whoopRec", "Recovery");
    zflag("whoopRhr", "RHR");
    zflag("ouraRhr", "RHR");

    const isToday = entry.date === new Date().toISOString().slice(0, 10);
    if (!(isToday && (entry.steps === 0 || entry.steps == null))) {
        zflag("steps", "Steps");
    }
    zflag("fatigue", "Fatigue");

    if (base.whoopRhr?.mean != null && entry.whoopRhr != null && (entry.whoopRhr - base.whoopRhr.mean) >= t.rhrAbs)
        flags.push({ field: "whoopRhr", kind: "abs", hint: `Whoop RHR +${t.rhrAbs} bpm vs baseline` });

    if (base.ouraRhr?.mean != null && entry.ouraRhr != null && (entry.ouraRhr - base.ouraRhr.mean) >= t.rhrAbs)
        flags.push({ field: "ouraRhr", kind: "abs", hint: `Oura RHR +${t.rhrAbs} bpm vs baseline` });

    if (base.mHrv?.mean != null && entry.mHrv != null) {
        const drop = (base.mHrv.mean - entry.mHrv) / base.mHrv.mean;
        if (drop >= t.hrvDropPct) flags.push({ field: "mHrv", kind: "pct", hint: `HRV drop ≥${Math.round(t.hrvDropPct * 100)}% vs baseline` });
    }

    if (base.mReady?.mean != null && entry.mReady != null && (base.mReady.mean - entry.mReady) >= t.recDropAbs)
        flags.push({ field: "mReady", kind: "abs", hint: `Readiness drop ≥${t.recDropAbs}` });

    if (base.ouraRec?.mean != null && entry.ouraRec != null && (base.ouraRec.mean - entry.ouraRec) >= t.recDropAbs)
        flags.push({ field: "ouraRec", kind: "abs", hint: `Recovery drop ≥${t.recDropAbs}` });

    if (base.whoopRec?.mean != null && entry.whoopRec != null && (base.whoopRec.mean - entry.whoopRec) >= t.recDropAbs)
        flags.push({ field: "whoopRec", kind: "abs", hint: `Recovery drop ≥${t.recDropAbs}` });

    return flags;
}

export function computeDayAssessment(
    entry: DailyEntry,
    entries: DailyEntry[],
    baselineDays: number,
    mode: "standard" | "adt",
    _depth = 0
): DayAssessment {
    const t = getThresholds(mode);
    const base = computeBaselines(entries, baselineDays, entry.date);
    const flags = outlierFlags(entry, base, t);
    const stepsMissing = !!entry.morningEntry || (entry.steps == null);
    const votes = classifyRecovery(entry);
    const voteResults: { device: string; state: RecoveryState }[] = [];

    for (const v of votes) {
        let bmean: number | null = null;
        if (v.signal === "mReady") bmean = base.mReady?.mean ?? null;
        if (v.signal === "ouraRec") bmean = base.ouraRec?.mean ?? null;
        if (v.signal === "whoopRec") bmean = base.whoopRec?.mean ?? null;
        if (v.signal === "whoopRhrProxy") bmean = (base.whoopRhr?.mean != null ? 120 - base.whoopRhr.mean : null);

        let state: RecoveryState = "neutral";
        if (bmean != null && v.score != null) {
            const delta = v.score - bmean;
            if (delta >= 2) state = "ok";
            else if (delta <= -2) state = "stressed";
        } else if (v.score != null) {
            if (v.score >= 70) state = "ok";
            else if (v.score <= 45) state = "stressed";
        }
        voteResults.push({ device: v.device, state });
    }

    const okCount = voteResults.filter((x) => x.state === "ok").length;
    const stCount = voteResults.filter((x) => x.state === "stressed").length;
    let majority: RecoveryState | "mixed" = "mixed";
    if (okCount >= 2) majority = "ok";
    if (stCount >= 2) majority = "stressed";

    let fatigueSignal: RecoveryState | "unknown" = "unknown";
    if (entry.fatigue != null) {
        if (entry.fatigue >= t.fatigueHigh) fatigueSignal = "stressed";
        else if (entry.fatigue <= t.fatigueLow) fatigueSignal = "ok";
        else fatigueSignal = "neutral";
    }

    const disagreement = (majority === "mixed") ? true : (voteResults.some((v) => v.state !== "neutral" && v.state !== majority));
    const fatigueMismatch = (fatigueSignal !== "unknown" && fatigueSignal !== "neutral" && majority !== "mixed" && fatigueSignal !== majority);

    let conf = 100;
    const outlierCount = (new Set(flags.map((f) => f.field))).size;
    conf -= outlierCount * t.outlierPenalty;
    if (disagreement) conf -= t.disagreementPenalty;
    if (fatigueMismatch) conf -= t.fatigueMismatchPenalty;
    if (entry.resistance === "Y") conf -= t.trainingPenalty;

    if (!stepsMissing && base.steps?.mean != null && entry.steps != null && base.steps.mean > 0) {
        const swing = Math.abs(entry.steps - base.steps.mean) / base.steps.mean;
        if (swing > 0.30) conf -= t.stepsSwingPenalty;
    }
    conf = clamp(conf, 0, 100);

    const outlierFields = new Set<string>(flags.map((f) => f.field));
    const deviceFields: Record<string, string[]> = { Morpheus: ["mReady", "mHrv"], Oura: ["ouraRec", "ouraRhr"], Whoop: ["whoopRec", "whoopRhr"] };
    let odd: string | null = null;
    let oddWhy = "";

    if (majority !== "mixed" && voteResults.length >= 2) {
        const candidates = voteResults.filter((v) => v.state !== "neutral" && v.state !== majority);
        if (candidates.length === 1) {
            const c = candidates[0];
            const fields = deviceFields[c.device] || [];
            const hasOutlier = fields.some((f) => outlierFields.has(f));
            const disagreesWithFatigue = (fatigueSignal !== "unknown" && fatigueSignal !== "neutral" && c.state !== fatigueSignal);
            if (hasOutlier && (fatigueSignal === "unknown" || disagreesWithFatigue)) {
                odd = c.device;
                oddWhy = `Conflicts with majority (${majority}) and shows outlier behavior in ${fields.filter((f) => outlierFields.has(f)).join(", ") || "device metrics"}.`;
            }
        }
    }

    let rec: RecColor = "Green";
    const why: string[] = [];
    if (conf < 55) rec = "Red";
    else if (conf < 80) rec = "Yellow";

    if (entry.joint != null && entry.joint >= t.jointWarn) {
        if (rec === "Green") rec = "Yellow";
        why.push(`Joint warning ${entry.joint}/10 → joint-protective bias.`);
    }
    if (fatigueSignal === "stressed") {
        if (rec === "Green") rec = "Yellow";
        if (conf < 55) rec = "Red";
        why.push(`Fatigue ${entry.fatigue}/10 indicates strain.`);
    }
    if (outlierCount) why.push(`${outlierCount} outlier signal(s) vs baseline.`);
    if (disagreement) why.push(`Devices disagree → uncertainty day.`);
    if (!why.length) why.push("Stable vs baseline; devices mostly consistent.");

    // --- Post‑regulation dip detection (ADT/CFS-friendly) ---
    let cycleLabel = "";
    if (_depth === 0) {
        try {
            const sorted = [...entries].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
            const idx = sorted.findIndex(e => e.date === entry.date);
            const prev1 = idx > 0 ? sorted[idx - 1] : null;
            const prev2 = idx > 1 ? sorted[idx - 2] : null;

            const prevAssess1 = prev1 ? computeDayAssessment(prev1, sorted, baselineDays, mode, _depth + 1) : null;
            const prevAssess2 = prev2 ? computeDayAssessment(prev2, sorted, baselineDays, mode, _depth + 1) : null;

            const stressedNow = (majority === "stressed" || fatigueSignal === "stressed");
            const wasOkRecently = (
                (prevAssess1 && (prevAssess1.majority === "ok" || prevAssess1.rec === "Yellow")) ||
                (prevAssess2 && (prevAssess2.majority === "ok" || prevAssess2.rec === "Yellow"))
            );
            const noTraining = entry.resistance !== "Y";
            const morningPattern = (entry.fatigue != null && entry.fatigue >= t.fatigueHigh);
            if (mode === "adt" && stressedNow && wasOkRecently && noTraining && morningPattern && !disagreement) {
                cycleLabel = "Post-regulation dip";
            }
        } catch (e) { }
    }

    // --- Load sequencing (anti-stacking) ---
    const HIGH_STEPS = 9500;
    let loadStackFlag = false;
    if (_depth === 0 && mode === "adt") {
        try {
            const sortedSeq = [...entries].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
            const i = sortedSeq.findIndex(e => e.date === entry.date);
            if (i >= 2) {
                const d1 = sortedSeq[i - 1];
                const d2 = sortedSeq[i - 2];
                const daysDiff = (aISO: string, bISO: string) => {
                    const a = new Date(aISO + "T00:00:00");
                    const b = new Date(bISO + "T00:00:00");
                    return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
                };
                const consecutive = (daysDiff(d2.date, d1.date) === 1) && (daysDiff(d1.date, entry.date) === 1);
                if (consecutive && d1.steps != null && d2.steps != null && d1.steps >= HIGH_STEPS && d2.steps >= HIGH_STEPS) {
                    loadStackFlag = true;
                }
            }
        } catch (e) { }
    }

    if (cycleLabel) why.push("Pattern suggests a post‑regulation dip: protect the morning and reassess later.");
    if (stepsMissing) why.push("Steps not yet entered (morning entry) → excluded from outliers.");

    const moveScout = "Go Slow, Scout";
    let recText = "";
    const plan: string[] = [];

    if (rec === "Green") {
        recText = `Maintain Rhythm — Go Wolf`;
        plan.push("Maintain rhythm: walk naturally; hills allowed if they feel good.");
        plan.push("Strength work only if it improves symptoms.");
    } else if (rec === "Yellow") {
        recText = `Modulate & Observe — Stay in Motion`;
        plan.push("Modulate: keep the walk easy/conversational; avoid 'testing' the system.");
        plan.push("Reassess after ~3–5 pm before adding intensity.");
    } else {
        if (cycleLabel) {
            recText = `Morning Protection — Scout`;
            plan.push("Morning protection: keep the morning gentle.");
            plan.push("Short, easy walk only if it lightens heaviness.");
        } else {
            recText = `Morning Protection — Rest`;
            plan.push("Protect the system: rest first.");
        }
    }

    if (mode === "adt" && loadStackFlag && rec !== "Red") {
        why.push(`Load sequencing: two consecutive high-step days detected → Scout day.`);
        plan.length = 0;
        recText = (rec === "Green") ? `REGULATED — Scout Day` : `Modulate & Observe — Scout Day`;
        plan.push("Scout day: move to maintain trust, but de-stack load.");
    }

    let insight = "";
    let signalTension = false;
    const morphHigh = (entry.mReady != null && base.mReady?.mean != null && entry.mReady > base.mReady.mean);
    const recLow = ((entry.ouraRec != null && base.ouraRec?.mean != null && entry.ouraRec < base.ouraRec.mean) ||
        (entry.whoopRec != null && base.whoopRec?.mean != null && entry.whoopRec < base.whoopRec.mean));

    if (morphHigh && recLow) {
        signalTension = true;
        insight = "Engine vs. Battery Mismatch: Performance capacity is high, but internal recovery is lagging behind.";
    }

    // --- Nuanced Fragility & Mantra Logic ---
    let fragilityType: "Consolidation" | "Global" | "Recovering" | "None" = "None";
    let mantra = "";
    let scoutCheck = "";

    const hrvLow = (entry.mHrv != null && base.mHrv?.mean != null && (base.mHrv.mean - entry.mHrv) / base.mHrv.mean >= t.hrvDropPct);
    const rhrHigh = (entry.ouraRhr != null && base.ouraRhr?.mean != null && (entry.ouraRhr - base.ouraRhr.mean) >= t.rhrAbs) ||
        (entry.whoopRhr != null && base.whoopRhr?.mean != null && (entry.whoopRhr - base.whoopRhr.mean) >= t.rhrAbs);

    if (majority === "stressed" && (hrvLow || rhrHigh || (entry.fatigue != null && entry.fatigue >= 8))) {
        fragilityType = "Global";
        mantra = "Autonomic Reset: Systemic crash signature detected. Protection is mandatory today.";
        scoutCheck = "Notice any dizziness or heart racing: stay strictly within the lowest effort zones.";
    } else if (signalTension || (morphHigh && (recLow || (entry.joint != null && entry.joint >= t.jointWarn)))) {
        fragilityType = "Consolidation";
        mantra = "Scout Then Roam: Consolidation fragility present. Capacity is present, but protection is needed.";
        scoutCheck = "Ask after 10 min: 'Is my system loosening or tightening?'";
    } else if (majority === "ok" && conf >= 80) {
        mantra = "Build Durability: System is harmonized and stable. Maintain rhythm.";
        scoutCheck = "Confirm fluidity through the hips and joints. Keep the 'Wolf' mindset.";
    } else {
        mantra = "Modulate & Observe: Transition day. Use movement to refine the picture.";
        scoutCheck = "Check for energy shifts post-exercise.";
    }

    // --- Load Memory (48h Decay) ---
    const calculateLoadMemory = () => {
        const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
        const idx = sorted.findIndex(e => e.date === entry.date);
        if (idx === -1) return { total: 0, array: [0, 0, 0], status: "COOL" as const, threshold: 0 };

        const stepThreshold = Math.max(9500, (base.steps?.mean || 0) * 1.2);
        const d0 = (sorted[idx].steps || 0) >= stepThreshold ? 1.0 : 0;
        const d1 = idx > 0 && (sorted[idx - 1].steps || 0) >= stepThreshold ? 0.5 : 0;
        const d2 = idx > 1 && (sorted[idx - 2].steps || 0) >= stepThreshold ? 0.25 : 0;

        const total = Math.min(d0 + d1 + d2, 1.5);
        let status: "COOL" | "WARM" | "HOT" | "PEAK" = "COOL";
        if (total >= 1.25) status = "PEAK";
        else if (total >= 0.75) status = "HOT";
        else if (total > 0) status = "WARM";

        return { total, array: [d2, d1, d0], status, threshold: stepThreshold };
    };

    const { total: loadMemory, array: loadHeatArray, status: loadStatus, threshold: loadThreshold } = calculateLoadMemory();

    // --- Crash Score ---
    const getCrashScore = (targetDate: string) => {
        const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
        const idx = sorted.findIndex(e => e.date === targetDate);
        if (idx === -1) return 0;
        const window = sorted.slice(Math.max(0, idx - 2), idx + 1);
        if (window.length < 2) return 0;

        let score = 0;
        const avgHrv = window.reduce((acc, e) => acc + (e.mHrv || 0), 0) / window.length;
        if (base.mHrv?.mean && avgHrv < base.mHrv.mean * 0.9) score += 1;
        const avgRhr = window.reduce((acc, e) => acc + (e.ouraRhr || e.whoopRhr || 0), 0) / window.length;
        if ((base.ouraRhr?.mean && avgRhr > base.ouraRhr.mean + 3) || (base.whoopRhr?.mean && avgRhr > base.whoopRhr.mean + 3)) score += 1;
        const avgFatigue = window.reduce((acc, e) => acc + (e.fatigue || 0), 0) / window.length;
        if (avgFatigue >= 6.5) score += 1;
        if (loadMemory >= 0.75) score += 1;
        if (window.filter(e => (e.ouraRec || 0) < 50 || (e.whoopRec || 0) < 50).length >= 2) score += 2;
        if (window.filter(e => (e.joint || 0) >= t.jointWarn).length >= 2) score += 1;

        const ouraHrvs = window.map(e => e.ouraHrv).filter((v): v is number => v != null && v > 0);
        if (ouraHrvs.length >= 2 && base.ouraHrv?.mean) {
            const avgOura = ouraHrvs.reduce((a, b) => a + b, 0) / ouraHrvs.length;
            if (avgOura < base.ouraHrv.mean * 0.85) score += 1.0;
            else if (avgOura < base.ouraHrv.mean * 0.95) score += 0.5;
        }
        return score;
    };

    const currentScore = getCrashScore(entry.date);
    let finalScore = currentScore;
    const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const entryIdx = sortedEntries.findIndex(e => e.date === entry.date);
    if (entryIdx > 0) {
        const prevScore = getCrashScore(sortedEntries[entryIdx - 1].date);
        if (currentScore < prevScore) finalScore = Math.max(currentScore, prevScore - 0.5);
    }

    let crashStatus: "Stable" | "Vulnerable" | "Pre-Crash" | "Crash-Onset" | "Crash-State" = "Stable";
    if (finalScore >= 5 || (majority === "stressed" && fatigueSignal === "stressed")) crashStatus = "Crash-State";
    else if (finalScore >= 4) crashStatus = "Crash-Onset";
    else if (finalScore >= 2.5) crashStatus = "Pre-Crash";
    else if (finalScore >= 1) crashStatus = "Vulnerable";

    const intensityReady = loadMemory < 0.5 && crashStatus === "Stable" && !signalTension && majority === "ok";

    if (crashStatus !== "Stable" && fragilityType === "None") {
        fragilityType = "Recovering";
    }

    const getOuraHrvStatus = () => {
        if (entry.ouraHrvStatus) return entry.ouraHrvStatus;
        const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
        const idx = sorted.findIndex(e => e.date === entry.date);
        if (idx === -1 || !base.ouraHrv?.mean) return "Unknown";
        const window = sorted.slice(Math.max(0, idx - 2), idx + 1);
        const hrvs = window.map(e => e.ouraHrv).filter((v): v is number => v != null && v > 0);
        if (hrvs.length === 0) return "Unknown";
        const avg = hrvs.reduce((a, b) => a + b, 0) / hrvs.length;
        if (avg >= base.ouraHrv.mean) return "Optimal";
        if (avg >= base.ouraHrv.mean * 0.95) return "Good";
        if (avg >= base.ouraHrv.mean * 0.85) return "Fair";
        return "Pay Attention";
    };

    return {
        flags, voteResults, majority, fatigueSignal, disagreement, fatigueMismatch,
        conf, oddOneOut: odd, oddWhy, rec, recText, why, plan,
        insight, fragilityType, signalTension, mantra, scoutCheck,
        crashStatus, loadMemory, loadHeatArray, loadStatus, intensityReady,
        loadThreshold,
        ouraHrvStatus: getOuraHrvStatus(), cycleLabel
    };
}

export function voteLabelFromAssess(assess: DayAssessment): string {
    if (assess.cycleLabel) return "POST-REGULATION DIP";
    if (assess.majority === "ok") return "REGULATED";
    if (assess.majority === "mixed") return "TRANSITIONAL";
    if (assess.majority === "stressed") return "DYSREGULATED";
    return String(assess.majority || "").toUpperCase();
}

function fmt(n: number | null | undefined, d = 0): string {
    if (n == null || Number.isNaN(n)) return "";
    const x = Number(n);
    return Number.isFinite(x) ? x.toFixed(d) : "";
}

export function makeAnalysisBundle(entries: DailyEntry[], settings: AppSettings, targetDate?: string): string {
    if (!entries.length) return "No entries yet.";
    const { baselineDays, mode } = settings;
    const sorted = [...entries].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const latest = targetDate ? (sorted.find(e => e.date === targetDate) || sorted[sorted.length - 1]) : sorted[sorted.length - 1];
    const assess = computeDayAssessment(latest, sorted, baselineDays, mode);

    const lines: string[] = [];
    lines.push("ANALYSIS BUNDLE — 3-Device Cross-Check");
    lines.push(`Mode=${mode.toUpperCase()} Baseline=${baselineDays}d Entries=${entries.length}`);
    lines.push(`ViewDate=${latest.date}`);
    lines.push(`Inputs: mReady=${fmt(latest.mReady)} mHRV=${fmt(latest.mHrv)} ouraRec=${fmt(latest.ouraRec)} whoopRec=${fmt(latest.whoopRec)} whoopRHR=${fmt(latest.whoopRhr)} ouraRHR=${fmt(latest.ouraRhr)} steps=${fmt(latest.steps)} fatigue=${fmt(latest.fatigue)} res=${latest.resistance} joint=${fmt(latest.joint)} notes="${latest.notes || ""}"`);
    lines.push("");
    lines.push(`Majority=${voteLabelFromAssess(assess)} FatigueSignal=${assess.fatigueSignal.toUpperCase()} Disagree=${assess.disagreement ? "YES" : "NO"} Conf=${assess.conf}/100`);
    lines.push(`Fragility=${assess.fragilityType.toUpperCase()} SignalTension=${assess.signalTension ? "YES" : "NO"} CrashStatus=${assess.crashStatus.toUpperCase()} OuraHRV=${assess.ouraHrvStatus.toUpperCase()} LoadMem=${assess.loadMemory.toFixed(2)}`);
    lines.push(`Mantra="${assess.mantra}"`);
    lines.push(`Recommendation=${assess.recText}`);
    lines.push("Plan:");
    assess.plan.forEach(p => lines.push(`- ${p}`));
    lines.push(`OddOneOut=${assess.oddOneOut || "None"} ${assess.oddOneOut ? ("— " + assess.oddWhy) : ""}`);
    lines.push("");
    lines.push("Why:");
    assess.why.forEach(w => lines.push(`- ${w}`));
    lines.push("");
    lines.push("Outliers:");
    if (!assess.flags.length) lines.push("- none");
    else assess.flags.forEach((f) => lines.push(`- ${f.field}: ${f.kind === "z" ? ("z=" + fmt(f.z, 2)) : f.kind} (${f.hint || ""})`));
    lines.push("");

    const targetIdx = sorted.findIndex(e => e.date === latest.date);
    const recent = sorted.slice(Math.max(0, targetIdx - 13), targetIdx + 1).reverse();
    lines.push(`Recent Context (ending ${latest.date}):`);
    recent.forEach((e) => {
        lines.push(`- ${e.date}: mReady=${fmt(e.mReady)} mHRV=${fmt(e.mHrv)} ouraRec=${fmt(e.ouraRec)} whoopRec=${fmt(e.whoopRec)} whoopRHR=${fmt(e.whoopRhr)} ouraRHR=${fmt(e.ouraRhr)} steps=${fmt(e.steps)} fatigue=${fmt(e.fatigue)} res=${e.resistance} joint=${fmt(e.joint)} notes="${e.notes || ""}"`);
    });
    return lines.join("\n");
}
