/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Download, 
    Upload, 
    RefreshCcw,
    AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { exportAllSettings, importAllSettings, SettingsExport, resetSessionData } from "@/lib/core/sessionStorage";
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
    const [pendingFile, setPendingFile] = useState<File | null>(null);


    const handleExport = useCallback(() => {
        try {
            const settings = exportAllSettings();
            const json = JSON.stringify(settings, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `polymagic-db-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("Data exported successfully");
        } catch {
            toast.error("Export failed");
        }
    }, []);

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setPendingFile(file);
        setIsImportModalOpen(true);
    }, []);

    const executeImport = useCallback(async () => {
        if (!pendingFile) return;

        try {
            const text = await pendingFile.text();
            const data: SettingsExport = JSON.parse(text);
            const result = importAllSettings(data);

            if (result.success) {
                toast.success("Database imported successfully");
                setTimeout(() => window.location.reload(), 1000);
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error("Import failed: invalid file");
        } finally {
            setPendingFile(null);
            setIsImportModalOpen(false);
        }
    }, [pendingFile]);

    const handleReset = useCallback(() => {
        setIsResetModalOpen(true);
    }, []);

    const executeReset = useCallback(() => {
        try {
            resetSessionData();
            toast.success("System reset successfully");
            setTimeout(() => window.location.reload(), 1500);
        } catch {
            toast.error("Reset failed");
        } finally {
            setIsResetModalOpen(false);
        }
    }, []);

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
                                    Permanently delete all data and reset the system to factory defaults.
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

                {/* Import Confirmation Modal */}
                <AlertDialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 font-semibold">
                                <AlertTriangle className="h-5 w-5" />
                                Security Warning
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-4">
                                <p>
                                    Importing a database will overwrite all current data. 
                                    This action cannot be undone.
                                </p>
                                <p className="text-xs text-muted-foreground p-3 bg-muted rounded-lg border border-border">
                                    Ensure the source file is trusted to prevent unintended data loss or configuration issues.
                                </p>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setPendingFile(null)}>Cancel</AlertDialogCancel>
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
                            <AlertDialogDescription className="space-y-3">
                                <p>
                                    This will permanently delete all materials, machines, quotes, customers, and settings.
                                </p>
                                <p className="font-medium text-foreground">
                                    Are you absolutely sure you want to reset the system to its factory state?
                                </p>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
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

            </main>
        </div>
    );
};

export default DatabaseManager;
