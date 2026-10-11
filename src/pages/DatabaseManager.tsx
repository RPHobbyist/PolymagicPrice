/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Download,
    Upload,
    RefreshCcw,
    AlertTriangle,
    ShieldCheck,
    ShieldAlert,
    History
} from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import {
    exportAllSettings,
    importAllSettings,
    ImportResult,
    SettingsExport,
    resetSessionData,
    getStorageUsage,
    getLastBackupAt,
    recordBackupTaken,
} from "@/lib/core/sessionStorage";
import { getPersistenceState, requestPersistence, PersistenceState } from "@/lib/core/storagePersistence";
import { isDesktop } from "@/lib/utils";
import { describeBackupAge, stashReloadNotice, announceDataReplaced, ReloadNotice } from "@/lib/databaseManager";
import {
    takeSnapshot,
    listSnapshots,
    restoreSnapshot,
    snapshotsSupported,
    SnapshotReason,
    SnapshotSummary,
} from "@/lib/core/dataSnapshots";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";

/**
 * Far above any real backup, so a file this big is the wrong file and reading it would only stall
 * the tab. Sized against the desktop app, whose store holds up to 52,428,800 characters: its
 * backup is pretty-printed and writes accented text as two or three bytes, so a full desktop store
 * exports a file larger than that. A 50 MB cap refused the shop's own backup.
 */
const MAX_BACKUP_BYTES = 256 * 1024 * 1024;

/** Local date and time, so two backups taken the same day sort in order and neither is renamed "(1)". */
const backupStamp = (): string => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
};

/**
 * Hands everything the app stores to the browser as one JSON file, and returns when that happened.
 * Throws if the export fails.
 *
 * Through `saveAs`, as the app's other downloads are. The hand-rolled link revoked its blob URL in
 * the same tick as the click, which some browsers treat as cancelling the download; `saveAs` keeps
 * the URL alive until the download has started. No browser says whether the file was then saved
 * or the save dialog cancelled, so the page calls this a backup file created, not one saved.
 */
const downloadBackup = (): string => {
    const json = JSON.stringify(exportAllSettings(), null, 2);
    saveAs(new Blob([json], { type: "application/json" }), `polymagic-db-${backupStamp()}.json`);
    return recordBackupTaken();
};

/** What a backup holds, in the order a shop cares about. Only collections the file carries are listed. */
const CONTENTS_ORDER: [key: string, label: string][] = [
    ["quotes", "quotes"],
    ["customers", "customers"],
    ["production jobs", "production jobs"],
    ["materials", "materials"],
    ["spools", "spools"],
    ["machines", "machines"],
    ["stored files", "G-code files"],
    ["employees", "employees"],
    ["reviews", "reviews"],
];

/**
 * Quotes and customers are always named, even at zero: "0 quotes" is how a shop notices it picked
 * the wrong file before it replaces its quote book. Anything else is named only when present.
 */
const ALWAYS_SHOWN = new Set(["quotes", "customers"]);

const describeContents = (counts: Record<string, number> = {}): string =>
    CONTENTS_ORDER
        .filter(([key]) => key in counts && (counts[key] > 0 || ALWAYS_SHOWN.has(key)))
        .map(([key, label]) => `${counts[key]} ${label}`)
        .join(" · ");

const SNAPSHOT_LABELS: Record<SnapshotReason, string> = {
    import: "Before an import",
    reset: "Before a reset",
    restore: "Before a restore",
};

const formatDateTime = (iso: string): string =>
    new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/**
 * The end of every import, reset and restore: tell the other tabs, keep the outcome for after the
 * reload, and reload now. Until the reload, the providers still hold the old data in memory and
 * save it on every change.
 */
const finishReplacement = (notice: ReloadNotice): void => {
    announceDataReplaced();
    stashReloadNotice(notice);
    window.location.reload();
};

/** Above this share of the limit the panel warns, while a shop still has room to act. */
const NEARLY_FULL = 0.8;

/** Storage is counted in characters; for this data a character is close enough to a byte. */
const formatSize = (chars: number): string =>
    chars >= 1024 * 1024 ? `${(chars / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(chars / 1024))} KB`;

/**
 * How full this device's store is, what fills it, and how safe it is.
 *
 * The browser caps the whole app at a few megabytes and may clear it without asking, so a shop
 * should learn both from this page rather than from a save that fails or a quote book that is gone.
 */
const StoragePanel = ({ lastBackupAt, onBackup }: { lastBackupAt: string | null; onBackup: () => void }) => {
    const usage = useMemo(() => getStorageUsage(), []);
    const [persistence, setPersistence] = useState<PersistenceState>("unsupported");

    useEffect(() => {
        // Desktop data lives in the app's own profile, so the browser-eviction question is web-only.
        if (isDesktop) return;
        let cancelled = false;
        getPersistenceState().then(state => { if (!cancelled) setPersistence(state); });
        return () => { cancelled = true; };
    }, []);

    const askToKeep = useCallback(async () => {
        const state = await requestPersistence();
        setPersistence(state);
        if (state === "persisted") {
            toast.success("The browser will keep this data unless you clear it yourself");
        } else {
            toast.info("The browser declined", {
                description: "Chrome and Edge decide from how often you use the site; Safari mostly protects sites added to the Dock or Home Screen. Keep downloading backups.",
                duration: 10_000,
            });
        }
    }, []);

    const share = usage.limitChars > 0 ? usage.usedChars / usage.limitChars : 0;
    const percent = Math.min(100, Math.round(share * 100));
    const nearlyFull = share >= NEARLY_FULL;

    return (
        <Card className="p-8 bg-white border-slate-200 shadow-sm rounded-xl space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-medium text-slate-900">Storage on this device</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                    {isDesktop
                        ? "Your data is saved inside the desktop app on this computer."
                        : "Your data is saved in this browser only. Another browser or device will not see it."}
                </p>
            </div>

            <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-900">
                        {formatSize(usage.usedChars)} used of about {Math.round(usage.limitChars / (1024 * 1024))} MB
                    </span>
                    <span className={nearlyFull ? "font-medium text-amber-700" : "text-slate-600"}>{percent}%</span>
                </div>
                <Progress
                    value={percent}
                    aria-label="Share of browser storage used"
                    className={nearlyFull ? "h-2 [&>div]:bg-amber-500" : "h-2"}
                />
                {nearlyFull && (
                    <p className="text-sm text-amber-700">
                        Nearly full. Download a backup, then delete old quotes or completed jobs to make room.
                    </p>
                )}
            </div>

            {usage.collections.length > 0 && (
                // Columns, not a grid: the list is sorted largest first and should read down each column.
                <dl className="sm:columns-2 gap-x-8 text-sm">
                    {usage.collections.map(c => (
                        <div key={c.label} className="flex justify-between gap-4 border-b border-slate-100 py-1.5 break-inside-avoid">
                            <dt className="text-slate-600">{c.label}</dt>
                            <dd className="font-medium text-slate-900 tabular-nums">{formatSize(c.chars)}</dd>
                        </div>
                    ))}
                </dl>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                <span className="text-slate-700">
                    {lastBackupAt
                        ? <>Last backup file created: <span className="font-medium text-slate-900">{describeBackupAge(lastBackupAt)}</span></>
                        : "No backup file has been created on this device yet."}
                </span>
                <Button variant="outline" onClick={onBackup} className="rounded-xl self-start sm:self-auto">
                    <Download className="w-4 h-4 mr-2" />
                    Download a backup
                </Button>
            </div>

            {persistence !== "unsupported" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm rounded-lg border border-slate-200 p-4">
                    {persistence === "persisted" ? (
                        <span className="flex items-start gap-2 text-slate-700">
                            <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                            The browser has marked this data as persistent, so it should not clear it to free space. Backups are still your safety net.
                        </span>
                    ) : (
                        <>
                            <span className="flex items-start gap-2 text-slate-700">
                                <ShieldAlert className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                                The browser may clear this data to free disk space, and Safari may clear it after a period without use.
                            </span>
                            <Button variant="outline" onClick={askToKeep} className="rounded-xl self-start sm:self-auto shrink-0">
                                Ask the browser to keep it
                            </Button>
                        </>
                    )}
                </div>
            )}
        </Card>
    );
};

const DatabaseManager = () => {
    useDocumentSEO({
        title: "Database Manager — 3D Printing Data Backup & Restore",
        description: "Export, import, and manage your 3D printing business data. Create full backups of quotes, materials, machines, and customer records. Ensure data sovereignty with local-first backups.",
        canonical: "/database-manager",
        ogTitle: "3D Printing Data Manager & Backup Tool | PolymagicPrice",
        ogDescription: "Securely manage your 3D printing shop data. Export and import full database backups for local data sovereignty."
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [pendingImport, setPendingImport] = useState<{ data: SettingsExport; preview: ImportResult } | null>(null);
    const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => getLastBackupAt());
    const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
    const [restoreTarget, setRestoreTarget] = useState<SnapshotSummary | null>(null);

    useEffect(() => {
        let cancelled = false;
        listSnapshots().then(list => { if (!cancelled) setSnapshots(list); });
        return () => { cancelled = true; };
    }, []);

    const handleExport = useCallback(() => {
        try {
            setLastBackupAt(downloadBackup());
            toast.success("Backup file created", {
                description: "Check that it saved to your device, then keep a copy somewhere safe.",
            });
        } catch {
            toast.error("Export failed");
        }
    }, []);

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // Clear the input, or choosing the same file again — after cancelling the dialog, or after
        // a failed import — fires no change event and the button appears to do nothing.
        event.target.value = "";
        if (!file) return;
        if (file.size > MAX_BACKUP_BYTES) {
            toast.error("This file is too large to be a PolymagicPrice backup.");
            return;
        }

        let data: SettingsExport;
        try {
            data = JSON.parse(await file.text());
        } catch {
            toast.error("This file is not a PolymagicPrice backup", {
                description: "It could not be read as a backup file. Nothing was changed.",
            });
            return;
        }

        // Every check runs now, before the shop is asked to let this file replace everything, so
        // a damaged or wrong file is turned away here and the dialog can say what the file holds.
        const preview = importAllSettings(data, { dryRun: true });
        if (!preview.success) {
            toast.error("This backup cannot be imported", {
                description: `${preview.message}. Nothing was changed.`,
            });
            return;
        }

        setPendingImport({ data, preview });
        setIsImportModalOpen(true);
    }, []);

    const executeImport = useCallback(async () => {
        if (!pendingImport) return;

        try {
            const saved = await takeSnapshot("import");
            const result = importAllSettings(pendingImport.data);

            if (result.success) {
                const skipped = result.skipped.length > 0;
                finishReplacement({
                    kind: skipped || !saved ? "warning" : "success",
                    message: [
                        skipped ? result.message : "Database imported successfully.",
                        saved ? "" : "No safety copy could be saved first.",
                    ].filter(Boolean).join(" "),
                });
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error("Import failed");
        } finally {
            setPendingImport(null);
            setIsImportModalOpen(false);
        }
    }, [pendingImport]);

    const handleReset = useCallback(() => {
        setIsResetModalOpen(true);
    }, []);

    const executeReset = useCallback(async () => {
        try {
            const saved = await takeSnapshot("reset");
            resetSessionData();
            finishReplacement(saved
                ? { kind: "success", message: "System reset successfully. Your old data is kept as a safety copy on this page." }
                : { kind: "warning", message: "System reset successfully. No safety copy could be saved first." });
        } catch {
            toast.error("Reset failed");
        } finally {
            setIsResetModalOpen(false);
        }
    }, []);

    const executeRestore = useCallback(async () => {
        if (!restoreTarget) return;
        const target = restoreTarget;
        setRestoreTarget(null);

        const result = await restoreSnapshot(target.id);
        if (result.success) {
            finishReplacement({
                kind: "success",
                message: `Your data was restored to the safety copy from ${formatDateTime(target.takenAt)}.`,
            });
        } else {
            toast.error(result.message);
            setSnapshots(await listSnapshots());
        }
    }, [restoreTarget]);

    return (
        <div className="min-h-full bg-slate-50 font-sans text-slate-900 animate-fade-in flex flex-col">
            <PageHeader 
                title="Database Manager" 
                subtitle="Export and restore your system data"
            />
            
            <main className="container mx-auto px-6 py-8 max-w-[1600px] space-y-6">



                {/* Primary Operations Grid */}
                <section className="animate-fade-in stagger-2 grid lg:grid-cols-3 gap-8">
                    {/* Primary Export */}
                    <Card className="p-10 bg-white border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl relative group">
                        <div className="space-y-6 relative z-10">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-2xl font-medium text-slate-900">Export Database</h2>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Download a backup of all your materials, machines, and settings.
                                </p>
                            </div>
                            
                            <Button 
                                onClick={handleExport}
                                className="h-12 px-8 bg-slate-900 hover:bg-black text-white font-medium tracking-tight rounded-xl shadow-lg shadow-slate-200/50"
                            >
                                <Download className="w-4 h-4 mr-3" />
                                Export Database
                            </Button>
                        </div>
                    </Card>

                    {/* System Restore */}
                    <Card className="p-10 bg-slate-50 border-slate-200 shadow-sm border-dashed border-2 rounded-xl relative group">
                        <div className="space-y-6 relative z-10">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-2xl font-medium text-slate-800">Import Database</h2>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Upload a backup file to restore your system to a previous state.
                                </p>
                            </div>

                            <Button 
                                variant="outline"
                                onClick={handleImportClick}
                                className="h-12 px-8 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium tracking-tight rounded-xl"
                            >
                                <Upload className="w-4 h-4 mr-3" />
                                Import Database
                            </Button>
                            <Input 
                                ref={fileInputRef} 
                                type="file" 
                                accept=".json" 
                                onChange={handleFileSelect} 
                                className="hidden" 
                                aria-label="Upload database backup file"
                            />
                        </div>
                    </Card>

                    {/* Reset Database */}
                    <Card className="p-10 bg-white border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl relative group">
                        <div className="space-y-6 relative z-10">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-2xl font-medium text-slate-900">Reset Database</h2>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Delete all data and return the system to factory defaults.
                                </p>
                            </div>
                            
                            <Button 
                                variant="destructive" 
                                onClick={handleReset}
                                className="h-12 px-8 font-medium tracking-tight rounded-xl shadow-lg shadow-red-200/50"
                            >
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                Reset Database
                            </Button>
                        </div>
                    </Card>
                </section>

                <section className="animate-fade-in stagger-3">
                    <StoragePanel lastBackupAt={lastBackupAt} onBackup={handleExport} />
                </section>

                {snapshotsSupported() && (
                    <section className="animate-fade-in stagger-3">
                        <Card className="p-8 bg-white border-slate-200 shadow-sm rounded-xl space-y-4">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-2xl font-medium text-slate-900">Safety copies</h2>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Saved automatically before every import, reset and restore, so any of them can be undone.
                                    The last three are kept on this device only, so they do not replace a backup file.
                                </p>
                            </div>
                            {snapshots.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    None yet. One is saved the next time you import, reset or restore.
                                </p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {snapshots.map(s => (
                                        <li key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
                                            <div className="text-sm">
                                                <div className="font-medium text-slate-900">{SNAPSHOT_LABELS[s.reason] ?? "Safety copy"}</div>
                                                <div className="text-slate-600">{formatDateTime(s.takenAt)} · {formatSize(s.chars)}</div>
                                            </div>
                                            <Button variant="outline" onClick={() => setRestoreTarget(s)} className="rounded-xl self-start sm:self-auto">
                                                <History className="w-4 h-4 mr-2" />
                                                Restore
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </section>
                )}

                {/* Import Confirmation Modal */}
                <AlertDialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 font-semibold">
                                <AlertTriangle className="h-5 w-5" />
                                Replace all current data?
                            </AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <div className="space-y-3">
                                    <p>
                                        This replaces everything stored now with the backup
                                        {pendingImport?.preview.exportDate ? ` made on ${formatDateTime(pendingImport.preview.exportDate)}` : ""}.
                                    </p>
                                    <p className="text-sm text-foreground p-3 bg-muted rounded-lg border border-border">
                                        {describeContents(pendingImport?.preview.counts) || "This backup holds no records."}
                                    </p>
                                    {pendingImport && pendingImport.preview.skipped.length > 0 && (
                                        <p className="text-amber-700">{pendingImport.preview.message}</p>
                                    )}
                                    <p>
                                        {snapshotsSupported()
                                            ? "A safety copy of your current data is saved first, so you can undo this from this page."
                                            : "This browser cannot keep a safety copy, so download a backup first if you may need your current data."}
                                    </p>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            {/* A plain button, not an AlertDialog action, so the dialog stays open. */}
                            <Button variant="outline" onClick={handleExport} className="sm:mr-auto">
                                <Download className="w-4 h-4 mr-2" />
                                Back up current data first
                            </Button>
                            <AlertDialogCancel onClick={() => setPendingImport(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={executeImport} className="bg-slate-900 hover:bg-black">
                                Proceed with Import
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Reset Confirmation Modal */}
                <AlertDialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-destructive font-semibold">
                                <AlertTriangle className="h-5 w-5" />
                                Critical Action Required
                            </AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <div className="space-y-3">
                                    <p>
                                        This deletes all materials, machines, quotes, customers, and settings.
                                        {snapshotsSupported()
                                            ? " A safety copy is saved first, so you can undo this from this page."
                                            : " This browser cannot keep a safety copy, so download a backup first."}
                                    </p>
                                    <p className="font-medium text-foreground">
                                        Are you absolutely sure you want to reset the system to its factory state?
                                    </p>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <Button variant="outline" onClick={handleExport} className="sm:mr-auto">
                                <Download className="w-4 h-4 mr-2" />
                                Back up current data first
                            </Button>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={executeReset} 
                                className="bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-red-200/50"
                            >
                                Reset Database
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Restore Confirmation Modal */}
                <AlertDialog open={restoreTarget !== null} onOpenChange={open => { if (!open) setRestoreTarget(null); }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 font-semibold">
                                <History className="h-5 w-5" />
                                Restore this safety copy?
                            </AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <div className="space-y-3">
                                    <p>
                                        Your data goes back to how it was on {restoreTarget ? formatDateTime(restoreTarget.takenAt) : ""}.
                                        Anything added or changed since then is replaced.
                                    </p>
                                    <p>Your current data is saved as a safety copy first, so this can be undone too.</p>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={executeRestore} className="bg-slate-900 hover:bg-black">
                                Restore
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </main>
        </div>
    );
};

export default DatabaseManager;
