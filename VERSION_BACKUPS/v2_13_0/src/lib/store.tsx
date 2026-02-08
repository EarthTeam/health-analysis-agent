"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DailyEntry, AppSettings } from "./types";
import { supabase } from "./supabaseClient";

const LS_KEY = "three_device_recovery_entries_v2";
const SETTINGS_KEY = "three_device_settings";

interface StoreContextType {
    entries: DailyEntry[];
    settings: AppSettings;
    addEntry: (entry: DailyEntry) => void;
    setSettings: (settings: AppSettings) => void;
    importEntries: (entries: DailyEntry[]) => void;
    resetData: () => void;
    syncFromCloud: () => Promise<void>;
    isSyncing: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
    const [entries, setEntries] = useState<DailyEntry[]>([]);
    const [settings, setSettingsState] = useState<AppSettings>({
        baselineDays: 14,
        mode: "adt",
    });
    const [loaded, setLoaded] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Initial load from LocalStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(LS_KEY);
            if (stored) {
                setEntries(JSON.parse(stored));
            }
            const storedSettings = localStorage.getItem(SETTINGS_KEY);
            if (storedSettings) {
                setSettingsState(JSON.parse(storedSettings));
            }
        } catch (e) {
            console.error("Failed to load local data", e);
        }
        setLoaded(true);
    }, []);

    // Sync FROM Cloud on mount
    const syncFromCloud = useCallback(async () => {
        if (!supabase) return;
        setIsSyncing(true);
        try {
            const { data, error } = await supabase.from('daily_entries').select('*');
            if (error) throw error;
            if (data && data.length > 0) {
                const cloudEntries: DailyEntry[] = data.map((d: any) => ({
                    date: d.date,
                    mReady: d.m_ready, mHrv: d.m_hrv,
                    ouraRec: d.oura_rec, ouraRhr: d.oura_rhr, ouraHrv: d.oura_hrv || null,
                    ouraHrvStatus: d.oura_hrv_status || undefined,
                    whoopRec: d.whoop_rec, whoopRhr: d.whoop_rhr, whoopHrv: d.whoop_hrv || null,
                    steps: d.steps, fatigue: d.fatigue, resistance: d.resistance || "N",
                    joint: d.joint, notes: d.notes || "",
                    morningEntry: d.morning_entry ?? false
                }));

                setEntries(prev => {
                    // Merge: Cloud wins for colliding dates
                    const merged = [...prev];
                    cloudEntries.forEach(ce => {
                        const idx = merged.findIndex(e => e.date === ce.date);
                        if (idx >= 0) {
                            merged[idx] = ce;
                        } else {
                            merged.push(ce);
                        }
                    });
                    return merged.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
                });
            }
        } catch (e) {
            console.error("Failed to sync from cloud", e);
        } finally {
            setIsSyncing(false);
        }
    }, []);

    useEffect(() => {
        if (loaded) {
            syncFromCloud();
        }
    }, [loaded, syncFromCloud]);

    // Local Persistence
    useEffect(() => {
        if (!loaded) return;
        localStorage.setItem(LS_KEY, JSON.stringify(entries));
    }, [entries, loaded]);

    useEffect(() => {
        if (!loaded) return;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }, [settings, loaded]);

    // Auto-Sync TO Cloud when entries change locally
    useEffect(() => {
        if (!loaded || !supabase || isSyncing || entries.length === 0) return;

        const timer = setTimeout(async () => {
            try {
                // We upsert all entries (Supabase handles the conflict on 'date')
                await supabase!.from('daily_entries').upsert(
                    entries.map(e => ({
                        date: e.date,
                        m_ready: e.mReady, m_hrv: e.mHrv,
                        oura_rec: e.ouraRec, oura_rhr: e.ouraRhr, oura_hrv: e.ouraHrv,
                        oura_hrv_status: e.ouraHrvStatus,
                        whoop_rec: e.whoopRec, whoop_rhr: e.whoopRhr, whoop_hrv: e.whoopHrv,
                        steps: e.steps, fatigue: e.fatigue, resistance: e.resistance,
                        joint: e.joint, notes: e.notes
                    })),
                    { onConflict: 'date' }
                );
            } catch (e) {
                console.error("Failed to auto-save to cloud", e);
            }
        }, 1000); // 1s debounce to prevent spamming during bulk edits

        return () => clearTimeout(timer);
    }, [entries, loaded, isSyncing]);

    const addEntry = (newEntry: DailyEntry) => {
        setEntries((prev) => {
            const idx = prev.findIndex((e) => e.date === newEntry.date);
            const next = [...prev];
            if (idx >= 0) {
                next[idx] = newEntry;
            } else {
                next.push(newEntry);
            }
            return next.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        });
    };

    const setSettings = (newSettings: AppSettings) => {
        setSettingsState(newSettings);
    };

    const importEntries = (newEntries: DailyEntry[]) => {
        setEntries(newEntries.sort((a, b) => (a.date || "").localeCompare(b.date || "")));
    };

    const resetData = () => {
        setEntries([]);
        localStorage.removeItem(LS_KEY);
    };

    if (!loaded) return null;

    return (
        <StoreContext.Provider value={{ entries, settings, addEntry, setSettings, importEntries, resetData, syncFromCloud, isSyncing }}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error("useStore must be used within a StoreProvider");
    }
    return context;
}
