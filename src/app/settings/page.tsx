"use client";

import { useStore } from "@/lib/store";
import { Download, Upload, FileJson, FileSpreadsheet, Trash2, CloudUpload, CloudDownload } from "lucide-react";
import { DailyEntry } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
    const { entries, importEntries, resetData } = useStore();

    const handleExportJSON = () => {
        const dataStr = JSON.stringify(entries, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recovery-data-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportCSV = () => {
        const headers = ["Date", "MorpheusReady", "MorpheusHRV", "OuraRecovery", "WhoopRecovery", "WhoopRHR", "OuraRHR", "Steps", "Fatigue", "Resistance", "JointWarn", "Notes"];
        const rows = [headers.join(",")];

        // Sort logic from legacy
        const sorted = [...entries].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

        for (const e of sorted) {
            const vals = [
                e.date, e.mReady, e.mHrv, e.ouraRec, e.whoopRec, e.whoopRhr, e.ouraRhr,
                e.steps, e.fatigue, e.resistance, e.joint, (e.notes || "").replaceAll('"', '""')
            ].map(v => (v == null ? "" : String(v)));
            vals[vals.length - 1] = `"${vals[vals.length - 1]}"`;
            rows.push(vals.join(","));
        }

        const csv = rows.join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recovery-data.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (Array.isArray(json)) {
                    importEntries(json as DailyEntry[]);
                    alert("Import successful.");
                } else {
                    alert("Invalid JSON format (must be an array).");
                }
            } catch (err) {
                console.error(err);
                alert("Failed to parse JSON.");
            }
        };
        reader.readAsText(file);
        e.target.value = ""; // reset
    };

    const handleCloudSave = async () => {
        if (!supabase) return alert("Supabase is not configured. Add credentials to .env.local");
        if (!entries.length) return alert("No data to save.");
        const { error } = await supabase.from('daily_entries').upsert(
            entries.map(e => ({
                date: e.date,
                m_ready: e.mReady, m_hrv: e.mHrv,
                oura_rec: e.ouraRec, oura_rhr: e.ouraRhr,
                whoop_rec: e.whoopRec, whoop_rhr: e.whoopRhr,
                steps: e.steps, fatigue: e.fatigue, resistance: e.resistance,
                joint: e.joint, notes: e.notes
            })),
            { onConflict: 'date' }
        );
        if (error) alert("Error saving to cloud: " + error.message);
        else alert("Successfully saved to database.");
    };

    const handleCloudLoad = async () => {
        if (!supabase) return alert("Supabase is not configured. Add credentials to .env.local");
        const { data, error } = await supabase.from('daily_entries').select('*');
        if (error) return alert("Error loading from cloud: " + error.message);
        if (!data) return alert("No data found.");

        const mapped: DailyEntry[] = data.map((d: any) => ({
            date: d.date,
            mReady: d.m_ready, mHrv: d.m_hrv,
            ouraRec: d.oura_rec, ouraRhr: d.oura_rhr,
            whoopRec: d.whoop_rec, whoopRhr: d.whoop_rhr,
            steps: d.steps, fatigue: d.fatigue, resistance: d.resistance || "N",
            joint: d.joint, notes: d.notes || ""
        }));
        importEntries(mapped);
        alert(`Loaded ${mapped.length} entries from cloud.`);
    };

    const handleReset = () => {
        if (confirm("Are you sure you want to delete ALL data? This cannot be undone.")) {
            resetData();
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">

            <section className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5 text-primary" /> Export Data
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Download your data to keep a local backup or analyze it in other tools.
                </p>
                <div className="flex flex-wrap gap-4">
                    <button onClick={handleExportJSON} className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
                        <FileJson className="w-4 h-4" /> Export JSON (Full Backup)
                    </button>
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
                        <FileSpreadsheet className="w-4 h-4" /> Export CSV (Excel)
                    </button>
                </div>
            </section>

            <section className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" /> Import Data
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Restore from a JSON backup file. This will merge or overwrite existing entries for the same dates.
                </p>
                <div>
                    <label className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors cursor-pointer w-fit">
                        <FileJson className="w-4 h-4" /> Select JSON File
                        <input type="file" accept="application/json" onChange={handleImportJSON} className="hidden" />
                    </label>
                </div>
            </section>

            <section className={cn("bg-card rounded-2xl border border-border p-6 shadow-sm", !supabase && "opacity-60")}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-600">
                    <CloudUpload className="w-5 h-5" /> Cloud Sync (Supabase)
                </h2>
                {!supabase ? (
                    <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 mb-6">
                        Cloud Sync is currently unavailable. Please check that <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set in your <code>.env.local</code> file.
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground mb-6">
                        Sync your data with the central database.
                    </p>
                )}
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={handleCloudSave}
                        disabled={!supabase}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                    >
                        <CloudUpload className="w-4 h-4" /> Save to Cloud
                    </button>
                    <button
                        onClick={handleCloudLoad}
                        disabled={!supabase}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg font-medium hover:bg-blue-50 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        <CloudDownload className="w-4 h-4" /> Load from Cloud
                    </button>
                </div>
            </section>

            <section className="bg-red-50 rounded-2xl border border-red-100 p-6">
                <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" /> Danger Zone
                </h2>
                <p className="text-sm text-red-600/80 mb-6">
                    Permanently delete all local data.
                </p>
                <button onClick={handleReset} className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors">
                    Reset All Data
                </button>
            </section>

        </div>
    );
}
