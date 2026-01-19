"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DailyEntry, AppSettings } from "./types";

const LS_KEY = "three_device_recovery_entries_v2";
const SETTINGS_KEY = "three_device_settings";

interface StoreContextType {
    entries: DailyEntry[];
    settings: AppSettings;
    addEntry: (entry: DailyEntry) => void;
    setSettings: (settings: AppSettings) => void;
    importEntries: (entries: DailyEntry[]) => void;
    resetData: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
    const [entries, setEntries] = useState<DailyEntry[]>([]);
    const [settings, setSettingsState] = useState<AppSettings>({
        baselineDays: 14,
        mode: "adt",
    });
    const [loaded, setLoaded] = useState(false);

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
            console.error("Failed to load data", e);
        }
        setLoaded(true);
    }, []);

    useEffect(() => {
        if (!loaded) return;
        localStorage.setItem(LS_KEY, JSON.stringify(entries));
    }, [entries, loaded]);

    useEffect(() => {
        if (!loaded) return;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }, [settings, loaded]);

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

    if (!loaded) return null; // Or a loading spinner

    return (
        <StoreContext.Provider value={{ entries, settings, addEntry, setSettings, importEntries, resetData }}>
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
