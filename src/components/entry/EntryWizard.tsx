"use client";

import { useStore } from "@/lib/store";
import { DailyEntry } from "@/lib/types";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Save, Activity, Watch, Smartphone, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
    { id: "morpheus", title: "Morpheus Data", icon: Activity },
    { id: "oura", title: "Oura Data", icon: Watch },
    { id: "whoop", title: "Whoop Data", icon: Smartphone },
    { id: "other", title: "Other Data", icon: ClipboardList },
];

export function EntryWizard() {
    const { addEntry, entries } = useStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const dateParam = searchParams.get("date");

    const [currentStep, setCurrentStep] = useState(0);

    const [formData, setFormData] = useState<Partial<DailyEntry>>({
        date: new Date().toISOString().split("T")[0],
        resistance: "N",
    });

    useEffect(() => {
        if (dateParam) {
            const existing = entries.find(e => e.date === dateParam);
            if (existing) {
                setFormData(existing);
            } else {
                setFormData(prev => ({ ...prev, date: dateParam }));
            }
        }
    }, [dateParam, entries]);

    const updateField = (field: keyof DailyEntry, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep((prev) => prev + 1);
        } else {
            handleSave();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    const handleSave = () => {
        if (!formData.date) {
            alert("Please select a date.");
            return;
        }
        const isToday = formData.date === new Date().toISOString().split("T")[0];
        const morningEntry = formData.morningEntry !== undefined ? formData.morningEntry : isToday;

        const entry: DailyEntry = {
            date: formData.date,
            mReady: formData.mReady ?? null,
            mHrv: formData.mHrv ?? null,
            ouraRec: formData.ouraRec ?? null,
            ouraRhr: formData.ouraRhr ?? null,
            ouraHrv: formData.ouraHrv ?? null,
            whoopRec: formData.whoopRec ?? null,
            whoopRhr: formData.whoopRhr ?? null,
            whoopHrv: formData.whoopHrv ?? null,
            steps: morningEntry ? null : (formData.steps ?? null),
            morningEntry,
            fatigue: formData.fatigue ?? null,
            resistance: formData.resistance === "Y" ? "Y" : "N",
            joint: formData.joint ?? null,
            notes: formData.notes ?? "",
        };
        addEntry(entry);
        router.push("/dashboard");
    };

    const renderStep = () => {
        switch (currentStep) {
            case 0: // Morpheus
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Morpheus Readiness (%)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-lg"
                                    value={formData.mReady ?? ""}
                                    onChange={(e) => updateField("mReady", e.target.value === "" ? null : Number(e.target.value))}
                                    placeholder="e.g. 85"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Morpheus HRV</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-lg"
                                    value={formData.mHrv ?? ""}
                                    onChange={(e) => updateField("mHrv", e.target.value === "" ? null : Number(e.target.value))}
                                    placeholder="e.g. 60"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 1: // Oura
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Oura Recovery (0-100)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-lg"
                                    value={formData.ouraRec ?? ""}
                                    onChange={(e) => updateField("ouraRec", e.target.value === "" ? null : Number(e.target.value))}
                                    placeholder="e.g. 80"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Oura RHR (bpm)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-lg"
                                    value={formData.ouraRhr ?? ""}
                                    onChange={(e) => updateField("ouraRhr", e.target.value === "" ? null : Number(e.target.value))}
                                    placeholder="e.g. 55"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Oura Nightly HRV</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-lg"
                                    value={formData.ouraHrv ?? ""}
                                    onChange={(e) => updateField("ouraHrv", e.target.value === "" ? null : Number(e.target.value))}
                                    placeholder="e.g. 65"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 2: // Whoop
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Whoop Recovery (0-100)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-lg"
                                    value={formData.whoopRec ?? ""}
                                    onChange={(e) => updateField("whoopRec", e.target.value === "" ? null : Number(e.target.value))}
                                    placeholder="e.g. 70"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Whoop RHR (bpm)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-lg"
                                    value={formData.whoopRhr ?? ""}
                                    onChange={(e) => updateField("whoopRhr", e.target.value === "" ? null : Number(e.target.value))}
                                    placeholder="e.g. 58"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Whoop Nightly HRV</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-lg"
                                    value={formData.whoopHrv ?? ""}
                                    onChange={(e) => updateField("whoopHrv", e.target.value === "" ? null : Number(e.target.value))}
                                    placeholder="e.g. 70"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 3: // Other
                const isToday = formData.date === new Date().toISOString().split("T")[0];
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10 mb-4">
                            <input
                                id="morning-entry"
                                type="checkbox"
                                className="w-5 h-5 rounded border-input text-primary focus:ring-primary"
                                checked={!!formData.morningEntry || (isToday && formData.morningEntry === undefined)}
                                onChange={(e) => updateField("morningEntry", e.target.checked)}
                            />
                            <label htmlFor="morning-entry" className="text-sm font-medium leading-tight">
                                <strong>Morning entry (steps pending)</strong><br />
                                <span className="text-muted-foreground font-normal text-xs">Exclude steps from today’s assessment until filled later.</span>
                            </label>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Step Count</label>
                                <input
                                    type="number"
                                    disabled={formData.morningEntry || (isToday && formData.morningEntry === undefined)}
                                    className="w-full p-3 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-secondary/50 disabled:text-muted-foreground"
                                    value={formData.steps ?? ""}
                                    onChange={(e) => updateField("steps", e.target.value === "" ? null : Number(e.target.value))}
                                    placeholder={formData.morningEntry || (isToday && formData.morningEntry === undefined) ? "Steps pending..." : "e.g. 5000"}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Subjective Fatigue (1-10)</label>
                                <input
                                    type="number"
                                    min="1" max="10"
                                    className="w-full p-3 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={formData.fatigue ?? ""}
                                    onChange={(e) => updateField("fatigue", e.target.value === "" ? null : Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Resistance Training?</label>
                                <select
                                    className="w-full p-3 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                    value={formData.resistance}
                                    onChange={(e) => updateField("resistance", e.target.value)}
                                >
                                    <option value="N">No</option>
                                    <option value="Y">Yes</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Joint Pain/Warning (0-10)</label>
                                <input
                                    type="number"
                                    min="0" max="10"
                                    className="w-full p-3 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={formData.joint ?? ""}
                                    onChange={(e) => updateField("joint", e.target.value === "" ? null : Number(e.target.value))}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Notes</label>
                            <textarea
                                className="w-full p-3 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-24 resize-none"
                                placeholder="Sleep quality, injuries, travel, etc."
                                value={formData.notes}
                                onChange={(e) => updateField("notes", e.target.value)}
                            />
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    const CurrentIcon = STEPS[currentStep].icon;

    return (
        <div className="max-w-xl mx-auto">
            {/* Header / Date */}
            <div className="mb-8 flex items-center justify-between">
                <h2 className="text-xl font-bold">New Entry</h2>
                <input
                    type="date"
                    className="bg-transparent border-b border-muted-foreground/30 focus:border-primary outline-none px-2 py-1 font-mono text-sm"
                    value={formData.date}
                    onChange={(e) => updateField("date", e.target.value)}
                />
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
                {STEPS.map((step, idx) => (
                    <div key={step.id} className={cn("h-1 flex-1 rounded-full transition-all duration-300",
                        idx <= currentStep ? "bg-primary" : "bg-primary/20"
                    )} />
                ))}
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-6 border-b border-border bg-secondary/30 flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <CurrentIcon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-lg">{STEPS[currentStep].title}</h3>
                </div>

                <div className="p-6 flex-1">
                    {renderStep()}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-border bg-gray-50 flex justify-between">
                    <button
                        disabled={currentStep === 0}
                        onClick={handleBack}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-black/5 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" /> Back
                    </button>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-1 px-6 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        {currentStep === STEPS.length - 1 ? (
                            <>Save Entry <Save className="w-4 h-4 ml-1" /></>
                        ) : (
                            <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
