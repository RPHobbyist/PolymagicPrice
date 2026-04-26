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

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileBox, Loader2, CheckCircle2 } from "lucide-react";
// import { parse3mf } from "@/lib/parsers/gcodeParser"; // Lazy loaded
import { toast } from "sonner";
import { cn, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/utils";

interface SurfaceAreaUploadProps {
    onSurfaceAreaDetected: (areaMm2: number) => void;
    className?: string;
}

export const SurfaceAreaUpload = ({ onSurfaceAreaDetected, className }: SurfaceAreaUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUploadedFile, setLastUploadedFile] = useState<string | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check file size limit (100MB)
        if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`File size too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        // Validate extension
        if (!file.name.toLowerCase().endsWith('.3mf')) {
            toast.error("Please upload a valid .3mf file");
            return;
        }

        setIsLoading(true);

        try {
            const { parse3mf } = await import("@/lib/parsers/gcodeParser");
            const data = await parse3mf(file);

            if (data.surfaceAreaMm2 && data.surfaceAreaMm2 > 0) {
                onSurfaceAreaDetected(data.surfaceAreaMm2);
                setLastUploadedFile(file.name);
                toast.success(`Extracted surface area: ${(data.surfaceAreaMm2 / 100).toFixed(2)} cm²`);
            } else {
                // More descriptive error
                if (data.printTimeHours > 0 || data.filamentWeightGrams > 0) {
                    toast.warning("Parsed 3MF metadata but could not find 3D model geometry for surface area.");
                } else {
                    toast.error("Could not read surface area. Ensure this is a valid 3MF containing a 3D model.");
                }
            }
        } catch (error) {
            console.error('Error parsing 3MF for surface area:', error);
            toast.error("Failed to parse 3MF file");
        } finally {
            setIsLoading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className={cn("", className)}>
            <input
                ref={fileInputRef}
                type="file"
                accept=".3mf"
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading}
            />

            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="h-8 gap-2 border-dashed border-2 transition-all duration-200"
                >
                    {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Upload className="w-3.5 h-3.5" />
                    )}
                    <span className="text-xs">Upload 3MF</span>
                </Button>

            </div>
        </div>
    );
};
