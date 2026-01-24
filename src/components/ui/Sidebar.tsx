"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, PlusCircle, History, Settings, Activity } from "lucide-react";

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Data Entry", href: "/entry", icon: PlusCircle },
    { name: "History", href: "/history", icon: History },
    { name: "Backup & Restore", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex w-64 bg-card border-r border-border h-screen flex-col p-4 shadow-sm z-10">
            <div className="flex items-center gap-3 px-2 mb-8 mt-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                    <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="font-bold text-lg leading-tight">Recovery<br />Agent</h1>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md mt-1 inline-block">v2.12.1</span>
                </div>
            </div>

            <nav className="space-y-1 flex-1">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-muted-foreground")} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto px-2 pb-4">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Status</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-blue-600 font-medium">System Active</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
