/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { exportAllSettings, importAllSettings, SettingsExport } from "@/lib/core/sessionStorage";

interface SettingsExportImportProps {
    onSettingsChanged?: () => void;
}

const SettingsExportImport = ({ onSettingsChanged }: SettingsExportImportProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = useCallback(() => {
        try {
            const settings = exportAllSettings();
            const json = JSON.stringify(settings, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `print-calculator-settings-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("Settings exported successfully!");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export settings");
        }
    }, []);

    const handleImportClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.json')) {
            toast.error("Please select a JSON file");
            return;
        }

        try {
            const text = await file.text();
            const data: SettingsExport = JSON.parse(text);

            const result = importAllSettings(data);

            if (result.success) {
                toast.success(result.message);
                onSettingsChanged?.();
                // Reload the page to reflect changes
                window.location.reload();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error("Import error:", error);
            toast.error("Failed to parse settings file");
        } finally {
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [onSettingsChanged]);

    return (
        <Card className="p-6 border-dashed border-2 border-border bg-muted/20">
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-foreground">Data Management</h2>
                        <p className="text-sm text-muted-foreground">
                            Export your settings to backup or share, or import from a previous backup
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        className="flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export Settings
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleImportClick}
                        className="flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        Import Settings
                    </Button>

                    <input
                        id="import-settings-file"
                        name="importFile"
                        aria-label="Import Settings File"
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>

                <p className="text-xs text-muted-foreground">
                    Exported file includes: Materials, Machines, Consumables, and Customers. Importing will replace all existing settings.
                </p>
            </div>
        </Card>
    );
};

export default SettingsExportImport;
