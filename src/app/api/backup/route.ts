
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    // This API should only be usable on localhost for security
    const host = request.headers.get('host');
    if (!host?.includes('localhost') && !host?.includes('127.0.0.1')) {
        return NextResponse.json({ error: 'Local backup is only available when running the app locally.' }, { status: 403 });
    }

    try {
        const { entries, format } = await request.json();
        const backupDir = '/Users/manuelescolano/Documents/APPS/HEALTH APP/DATA BACKUPS';

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const dateStr = new Date().toISOString().split('T')[0];

        if (format === 'json') {
            const filePath = path.join(backupDir, `recovery-data-${dateStr}.json`);
            fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
            return NextResponse.json({ success: true, path: filePath });
        } else if (format === 'csv') {
            const filePath = path.join(backupDir, `recovery-data-${dateStr}.csv`);
            const headers = ["Date", "MorpheusReady", "MorpheusHRV", "OuraRecovery", "WhoopRecovery", "WhoopRHR", "OuraRhr", "OuraHrv", "WhoopHrv", "OuraHrvStatus", "Steps", "Fatigue", "Resistance", "JointWarn", "Notes"];
            const rows = [headers.join(",")];

            const sorted = [...entries].sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""));
            for (const e of sorted) {
                const vals = [
                    e.date, e.mReady, e.mHrv, e.ouraRec, e.whoopRec, e.whoopRhr, e.ouraRhr,
                    e.ouraHrv, e.whoopHrv, e.ouraHrvStatus || "",
                    e.steps, e.fatigue, e.resistance, e.joint, (e.notes || "").replaceAll('"', '""')
                ].map(v => (v == null ? "" : String(v)));
                vals[vals.length - 1] = `"${vals[vals.length - 1]}"`;
                rows.push(vals.join(","));
            }

            fs.writeFileSync(filePath, rows.join("\n"));
            return NextResponse.json({ success: true, path: filePath });
        }

        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    } catch (error: any) {
        console.error('Backup error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
