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

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from "lucide-react";
import { LargeThumbnailPreview } from "@/components/shared/ThumbnailPreview";
import { stripFileExtension, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/utils";
import { toast } from "sonner";
import { parseResinFile, ResinFileData } from "@/lib/parsers/resinFileParser";

interface ResinFileUploadProps {
  onDataExtracted: (data: ResinFileData) => void;
}

const ResinFileUpload = ({ onDataExtracted }: ResinFileUploadProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    // Supported resin printer file formats
    const supportedExtensions = [
      '.ctb',      // Elegoo, Phrozen, Anycubic (CHITUBOX)
      '.goo',      // Anycubic Cloud printers
      '.photon',   // Anycubic Photon series
      '.pwmo',     // Anycubic Photon mid-gen
      '.fdg',      // Elegoo Mars/Saturn
      '.cxdlpv4',  // Creality Halot series
      '.sl1s',     // Prusa SL1/SL1S
      '.form',     // Formlabs
    ];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!supportedExtensions.includes(fileExtension)) {
      toast.error(`Unsupported file type. Supported: ${supportedExtensions.join(', ')}`);
      return;
    }

    setIsLoading(true);
    setFileName(file.name);

    try {
      const data = await parseResinFile(file);

      if (data.printTimeHours === 0 && data.resinVolumeMl === 0) {
        toast.warning("Could not extract data from file. Please enter values manually.");
      } else {
        const extractedInfo = [];
        if (data.printTimeHours > 0) extractedInfo.push(`Print Time: ${data.printTimeHours}h`);
        if (data.resinVolumeMl > 0) extractedInfo.push(`Volume: ${data.resinVolumeMl}ml`);
        if (data.layerCount) extractedInfo.push(`Layers: ${data.layerCount}`);
        if (data.printerModel) extractedInfo.push(`Printer: ${data.printerModel}`);

        toast.success(`Extracted: ${extractedInfo.join(', ')}`);

        // Clean filename for the Project Name field
        const cleanName = stripFileExtension(file.name);
        onDataExtracted({ ...data, fileName: cleanName });

        if (data.thumbnail) {
          setPreviewImage(data.thumbnail);
        } else {
          setPreviewImage(null);
        }
      }
    } catch (error) {
      console.error('Error parsing resin file:', error);
      toast.error("Failed to parse file");
    } finally {
      setIsLoading(false);
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".ctb,.goo,.photon,.pwmo,.fdg,.cxdlpv4,.sl1s,.form"
        onChange={handleFileSelect}
        className="hidden"
        id="resin-file-input"
      />

      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="w-full border-dashed border-2 transition-all duration-200"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Parsing...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Auto-fill from Slicer File
          </>
        )}
      </Button>

      {fileName && !isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span className="truncate">{fileName}</span>
        </div>
      )}

      <LargeThumbnailPreview src={previewImage || ""} />
    </div>
  );
};

export default ResinFileUpload;
