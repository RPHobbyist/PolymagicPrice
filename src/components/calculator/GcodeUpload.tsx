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
import { Upload, FileCode, Loader2 } from "lucide-react";
import { ThumbnailPreview } from "@/components/shared/ThumbnailPreview";
import { stripFileExtension, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/utils";
// import { parseGcode, parse3mf, GcodeData } from "@/lib/parsers/gcodeParser"; // Lazy loaded
import { GcodeData } from "@/lib/parsers/gcodeParser"; // Type import is fine
import { toast } from "sonner";

interface GcodeUploadProps {
  onDataExtracted: (data: GcodeData) => void;
}

const GcodeUpload = ({ onDataExtracted }: GcodeUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  /**
   * Handles file selection from the input.
   * Validates extension, parses content, and extracts thumbnail.
   */
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

    // Check file extension
    const validExtensions = ['.gcode', '.gco', '.g', '.3mf'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
      toast.error("Please upload a valid file (.gcode, .gco, .g, or .3mf)");
      return;
    }

    setIsLoading(true);

    try {
      let data: GcodeData;

      if (fileExtension === '.3mf') {
        const { parse3mf } = await import("@/lib/parsers/gcodeParser");
        // Parse 3MF file (ZIP archive with XML metadata)
        data = await parse3mf(file);
      } else {
        // Parse G-code file
        const content = await file.text();
        const { parseGcode } = await import("@/lib/parsers/gcodeParser");
        data = parseGcode(content);
      }

      if (data.printTimeHours === 0 && data.filamentWeightGrams === 0) {
        toast.warning("Could not extract data from file. Please enter values manually.");
        return;
      }

      // Strip the extension (e.g. .gcode) so the UI shows a clean Project Name
      const cleanName = stripFileExtension(file.name);
      // Get file path from Electron (File object has .path property in Electron)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filePath = (file as any).path || '';

      onDataExtracted({ ...data, fileName: cleanName, filePath });

      // Update local preview state if a thumbnail was found
      if (data.thumbnail) {
        setPreviewImage(data.thumbnail);
      } else {
        setPreviewImage(null);
      }

      const extractedInfo = [];
      if (data.printTimeHours > 0) extractedInfo.push(`Print Time: ${data.printTimeHours}h`);
      if (data.filamentWeightGrams > 0) extractedInfo.push(`Filament: ${data.filamentWeightGrams}g`);
      if (data.printerModel) extractedInfo.push(`Printer: ${data.printerModel}`);

      toast.success(`Extracted: ${extractedInfo.join(', ')}`);
    } catch (error) {
      console.error('File parsing error:', error);
      toast.error("Failed to parse file");
    } finally {
      setIsLoading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".gcode,.gco,.g,.3mf"
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoading}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="flex items-center gap-2 border-dashed border-2 transition-all duration-200"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <FileCode className="w-4 h-4" />
          </>
        )}
        {isLoading ? 'Parsing...' : 'Upload G-code / 3MF'}
      </Button>

      <ThumbnailPreview src={previewImage || ""} className="ml-2" />
    </div>
  );
};

export default GcodeUpload;
