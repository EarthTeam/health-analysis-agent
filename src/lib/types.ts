export interface DailyEntry {
    date: string; // YYYY-MM-DD

    // Morpheus
    mReady: number | null;
    mHrv: number | null;

    // Oura
    ouraRec: number | null;
    ouraRhr: number | null;
    ouraHrv: number | null;
    ouraHrvStatus?: "Optimal" | "Good" | "Fair" | "Pay Attention";

    // Whoop
    whoopRec: number | null;
    whoopRhr: number | null;
    whoopHrv: number | null;

    // Other
    steps: number | null;
    morningEntry?: boolean; // Whether for today's entry steps are pending
    fatigue: number | null; // 1-10
    resistance: "Y" | "N";
    joint: number | null; // 0-10
    notes: string;
}

export interface LoadMemoryPoint {
    date: string;
    value: number;
}

export interface AppSettings {
    baselineDays: number;
    mode: "standard" | "adt";
}

export type RecoveryState = "ok" | "stressed" | "neutral";
export type RecColor = "Green" | "Yellow" | "Red";
export type StatusPhase = "REGULATED" | "INTEGRATION LAG" | "PRIMARY DYSREGULATION";

export interface DayAssessment {
    flags: OutlierFlag[];
    voteResults: { device: string; state: RecoveryState }[];
    majority: RecoveryState | "mixed";
    statusPhase: StatusPhase;
    fatigueSignal: RecoveryState | "unknown";
    disagreement: boolean;
    fatigueMismatch: boolean;
    conf: number;
    oddOneOut: string | null;
    oddWhy: string;
    rec: RecColor;
    recText: string;
    why: string[];
    plan: string[];
    insight?: string;
    fragilityType: "Integration Lag" | "Global" | "Recovering" | "None";
    signalTension: boolean;
    mantra: string;
    scoutCheck: string;
    crashStatus: "Stable" | "Load-Integrating" | "Pre-Crash" | "Crash-Onset" | "Crash-State";
    loadMemory: number;
    loadHistory: LoadMemoryPoint[];
    loadStatus: "Clear" | "Integrating" | "Saturated";
    loadTrend: "Rising" | "Plateau" | "Declining";
    clearanceRate: number; // Percentage clearance power 0-100
    intensityReady: boolean;
    loadThreshold: number;
    ouraHrvStatus: "Optimal" | "Good" | "Fair" | "Pay Attention" | "Unknown";
    cycleLabel?: string;
}

export interface OutlierFlag {
    field: keyof DailyEntry;
    kind: "z" | "abs" | "pct";
    z?: number;
    hint: string;
}

export interface BaselineStats {
    mean: number | null;
    sd: number | null;
    n: number;
}
