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

// G-code and 3MF parser utility to extract print time and filament usage
import JSZip from 'jszip';

export interface GcodeData {
  printTimeHours: number;
  filamentWeightGrams: number;
  filamentLengthMm?: number;
  printerModel?: string;
  filamentColour?: string;
  filamentSettingsId?: string;
  thumbnail?: string;
  fileName?: string;
  filePath?: string; // Full path to the uploaded file
  surfaceAreaMm2?: number; // Estimated or calculated surface area
}

/**
 * Parse raw G-code text content to extract print time and filament weight
 */
export function parseGcode(content: string): GcodeData {
  let filamentWeight = 0;
  let timeHours = 0;
  let filamentLengthMm = 0;
  let printerModel = '';
  let filamentColour = '';
  let filamentSettingsId = '';
  let thumbnail = '';

  // --- Filament weight patterns (supports various slicer formats) ---
  const weightPatterns = [
    /total filament weight\s*\[g\]\s*[:=]\s*([\d.]+)/i,
    /total filament used\s*\[g\]\s*[:=]\s*([\d.]+)/i,
    /filament used\s*\[g\]\s*[:=]\s*([\d.]+)/i,
    /total filament used\s*[:=]\s*([\d.]+)\s*g/i,
    /filament used\s*[:=]\s*([\d.]+)\s*g/i,
    /;\s*filament\s*used\s*\[g\]\s*=\s*([\d.]+)/i,
    /;\s*total\s*filament\s*weight\s*=\s*([\d.]+)/i,
  ];

  for (const pattern of weightPatterns) {
    const match = content.match(pattern);
    if (match) {
      filamentWeight = parseFloat(match[1]);
      break;
    }
  }

  // --- Filament length patterns ---
  const lengthPatterns = [
    /filament used\s*\[mm\]\s*=\s*([\d.]+)/i,
    /filament\s*used\s*[:=]\s*([\d.]+)\s*m(?!m)/i, // meters
    /filament\s*used\s*[:=]\s*([\d.]+)\s*mm/i,
  ];

  for (const pattern of lengthPatterns) {
    const match = content.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      // Check if it's meters (convert to mm) or already mm
      if (pattern.source.includes('m(?!m)')) {
        filamentLengthMm = value * 1000;
      } else {
        filamentLengthMm = value;
      }
      break;
    }
  }

  // --- Time extraction ---
  let timeString: string | null = null;
  const timePatterns = [
    /estimated printing time\s*(?:\(normal mode\))?\s*[:=]\s*(.+)/i,
    /estimated time\s*[:=]\s*(.+)/i,
    /;\s*TIME:\s*(\d+)/i, // Cura seconds format
    /print time\s*[:=]\s*(.+)/i,
  ];

  for (const pattern of timePatterns) {
    const m = content.match(pattern);
    if (m) {
      timeString = m[1].trim();
      break;
    }
  }

  if (timeString) {
    // Pure seconds format (Cura)
    if (/^\d+$/.test(timeString)) {
      timeHours = parseInt(timeString, 10) / 3600;
    } else {
      // Format: 1h 1m 13s or 1h 1m or similar
      const h = timeString.match(/(\d+)\s*h/i);
      const m = timeString.match(/(\d+)\s*m(?!s)/i);
      const s = timeString.match(/(\d+)\s*s/i);
      const d = timeString.match(/(\d+)\s*d/i);

      timeHours =
        (d ? parseFloat(d[1]) * 24 : 0) +
        (h ? parseFloat(h[1]) : 0) +
        (m ? parseFloat(m[1]) / 60 : 0) +
        (s ? parseFloat(s[1]) / 3600 : 0);
    }
  }

  // If we have length but no weight, estimate weight
  // Assuming PLA: 1.24 g/cm³, 1.75mm filament diameter
  if (filamentLengthMm > 0 && filamentWeight === 0) {
    filamentWeight = filamentLengthMm * 0.00298;
  }

  // --- Printer model extraction ---
  const printerPatterns = [
    /;\s*printer_model\s*[:=]\s*(.+)/i,
    /;\s*machine_model\s*[:=]\s*(.+)/i,
    /;\s*printer\s*[:=]\s*(.+)/i,
    /;\s*machine\s*[:=]\s*(.+)/i,
    /;\s*printer_type\s*[:=]\s*(.+)/i,
    /;\s*Generated\s*with\s*(.+?)\s*printer/i, // "Generated with Creality Ender-3 printer"
    /;\s*device\s*[:=]\s*(.+)/i,
  ];

  for (const pattern of printerPatterns) {
    const match = content.match(pattern);
    if (match) {
      printerModel = match[1].trim();
      break;
    }
  }

  // --- Filament colour extraction ---
  const colourPatterns = [
    /;\s*filament_colour\s*[:=]\s*(.+)/i,
    /;\s*filament_color\s*[:=]\s*(.+)/i,
    /;\s*extruder_colour\s*[:=]\s*(.+)/i,
    /;\s*extruder_color\s*[:=]\s*(.+)/i,
  ];

  for (const pattern of colourPatterns) {
    const match = content.match(pattern);
    if (match) {
      filamentColour = match[1].trim();
      break;
    }
  }

  // --- Filament settings/material extraction ---
  const materialPatterns = [
    /;\s*filament_settings_id\s*[:=]\s*(.+)/i,
    /;\s*filament_type\s*[:=]\s*(.+)/i,
    /;\s*material_type\s*[:=]\s*(.+)/i,
    /;\s*material_name\s*[:=]\s*(.+)/i,
  ];

  for (const pattern of materialPatterns) {
    const match = content.match(pattern);
    if (match) {
      filamentSettingsId = match[1].trim();
      break;
    }
  }

  // --- Thumbnail extraction (Base64) ---
  // PrusaSlicer/SuperSlicer/Orca format:
  // ; thumbnail begin <width>x<height> <size>
  // ... base64 data ...
  // ; thumbnail end

  // Try to find the largest thumbnail
  const thumbBeginRegex = /;\s*thumbnail(?:_JPG)?\s+begin\s+(\d+)[xX](\d+)\s+(\d+)/gi;
  let match;
  let maxPixels = 0;
  let bestThumbStart = -1;
  let bestThumbType = 'png'; // default to png

  while ((match = thumbBeginRegex.exec(content)) !== null) {
    const width = parseInt(match[1]);
    const height = parseInt(match[2]);
    const pixels = width * height;

    if (pixels > maxPixels) {
      maxPixels = pixels;
      bestThumbStart = match.index;
      if (match[0].toLowerCase().includes('jpg')) {
        bestThumbType = 'jpg';
      } else {
        bestThumbType = 'png';
      }
    }
  }

  if (bestThumbStart !== -1) {
    // Extract the specific thumbnail block
    const thumbBlockStart = content.indexOf('\n', bestThumbStart) + 1;
    const thumbBlockEnd = content.indexOf('thumbnail', thumbBlockStart); // approximate end

    if (thumbBlockStart > 0 && thumbBlockEnd > thumbBlockStart) {
      // Look for the end marker more precisely
      const nextEndMarker = content.substring(thumbBlockStart, thumbBlockStart + 50000).match(/;\s*thumbnail(?:_JPG)?\s+end/i);

      if (nextEndMarker && nextEndMarker.index !== undefined) {
        // Extract lines, remove '; ' prefix and whitespace
        const rawBlock = content.substring(thumbBlockStart, thumbBlockStart + nextEndMarker.index);
        const base64Data = rawBlock.replace(/^[ \t]*;[ \t]*/gm, '').replace(/\s/g, '');

        if (base64Data.length > 100) {
          thumbnail = `data:image/${bestThumbType};base64,${base64Data}`;
        }
      }
    }
  }

  return {
    printTimeHours: Math.round((timeHours || 0) * 100) / 100,
    filamentWeightGrams: Math.round((filamentWeight || 0) * 10) / 10,
    filamentLengthMm: Math.round(filamentLengthMm * 10) / 10,
    printerModel: printerModel || undefined,
    filamentColour: filamentColour || undefined,
    filamentSettingsId: filamentSettingsId || undefined,
    thumbnail: thumbnail || undefined,
  };
}

/**
 * Parse 3MF file (ZIP archive) to extract print data
 * Specifically looks for G-code files inside the Metadata folder
 */
export async function parse3mf(file: File): Promise<GcodeData> {
  let printTimeHours = 0;
  let filamentWeightGrams = 0;
  let printerModel = '';
  let thumbnail = '';

  try {
    const zip = await JSZip.loadAsync(file);
    const fileNames = Object.keys(zip.files);



    // Step 1: Look for G-code file inside Metadata folder or anywhere
    const gcodePath = fileNames.find(
      (path) => (path.toLowerCase().startsWith('metadata/') && path.toLowerCase().endsWith('.gcode')) ||
        path.toLowerCase().endsWith('.gcode')
    );

    if (gcodePath) {

      const gcodeText = await zip.files[gcodePath].async('string');
      const result = parseGcode(gcodeText);

      // If G-code didn't have thumbnail, try to find one in Metadata
      if (!result.thumbnail) {
        const thumbPath = fileNames.find(p => p.toLowerCase().endsWith('.png') && (p.toLowerCase().includes('thumbnail') || p.toLowerCase().includes('metadata')));
        if (thumbPath) {
          const thumbData = await zip.files[thumbPath].async('base64');
          result.thumbnail = `data:image/png;base64,${thumbData}`;
        }
      }
      return result;
    }

    // Step 2: Fallback - search JSON/XML files for metadata (BambuStudio/OrcaSlicer)
    for (const filename of fileNames) {
      if (zip.files[filename].dir) continue;

      const lowerFilename = filename.toLowerCase();

      // Check JSON files (plate_X.json, etc.)
      if (lowerFilename.endsWith('.json')) {
        try {
          const content = await zip.files[filename].async('string');
          const jsonData = JSON.parse(content);

          // BambuStudio/OrcaSlicer format
          if (jsonData.prediction !== undefined && printTimeHours === 0) {
            printTimeHours = jsonData.prediction / 3600;
          }
          if (jsonData.weight !== undefined && filamentWeightGrams === 0) {
            filamentWeightGrams = jsonData.weight;
          }
          if (jsonData.filament_used_g !== undefined && filamentWeightGrams === 0) {
            filamentWeightGrams = jsonData.filament_used_g;
          }
          if (jsonData.print_time !== undefined && printTimeHours === 0) {
            printTimeHours = jsonData.print_time / 3600;
          }
          // Extract printer model
          if (jsonData.printer_model && !printerModel) {
            printerModel = jsonData.printer_model;
          }
          if (jsonData.machine && !printerModel) {
            printerModel = jsonData.machine;
          }
        } catch {
          // Not valid JSON, continue
        }
      }

      // Check XML files for metadata
      if (lowerFilename.endsWith('.xml') || lowerFilename.endsWith('.config')) {
        try {
          const content = await zip.files[filename].async('string');

          const timeMatch = content.match(/estimated[_-]?time["\s:=>]+(\d+)/i);
          if (timeMatch && printTimeHours === 0) {
            printTimeHours = parseInt(timeMatch[1]) / 3600;
          }

          const weightMatch = content.match(/filament[_-]?weight[_-]?total["\s:=>]+(\d+\.?\d*)/i);
          if (weightMatch && filamentWeightGrams === 0) {
            filamentWeightGrams = parseFloat(weightMatch[1]);
          }

          // Extract printer model from XML
          const printerMatch = content.match(/printer[_-]?model["\s:=>]+([^"<\n]+)/i);
          if (printerMatch && !printerModel) {
            printerModel = printerMatch[1].trim();
          }
        } catch {
          // Could not read file
        }
      }
    }

    // --- Surface Area Calculation (Hierarchical) ---
    let surfaceAreaMm2 = 0;
    // Try standard name first, then fallback to any .model file
    let modelPath = fileNames.find(p => p.toLowerCase().endsWith('3dmodel.model'));
    if (!modelPath) {
      modelPath = fileNames.find(p => p.toLowerCase().endsWith('.model'));
    }

    if (modelPath) {
      try {
        const modelContent = await zip.files[modelPath].async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(modelContent, "text/xml");

        // Helper to find elements ignoring namespace prefixes
        const getElements = (root: Element | Document, tagName: string) => {
          // Fast path
          const els = root.getElementsByTagName(tagName);
          if (els.length > 0) return Array.from(els);
          // Prefix path
          const mEls = root.getElementsByTagName('m:' + tagName);
          if (mEls.length > 0) return Array.from(mEls);
          // Warning: getElementsByTagName('*') with filter is slow, but robust for mixed namespaces
          // Optimization: Check typical namespaces manually if needed? 
          // For now, assume if direct lookup fails, we iterate.
          const all = root.getElementsByTagName('*');
          const matches = [];
          for (let i = 0; i < all.length; i++) {
            // localName is the safe generic way
            if (all[i].localName === tagName) {
              matches.push(all[i]);
            }
          }
          return matches;
        };

        const meshes = getElements(xmlDoc, 'mesh');

        for (const mesh of meshes) {
          const vertices = getElements(mesh, 'vertex');
          const triangles = getElements(mesh, 'triangle');

          // Parse vertices
          const v: { x: number; y: number; z: number }[] = [];
          for (let i = 0; i < vertices.length; i++) {
            v.push({
              x: parseFloat(vertices[i].getAttribute('x') || '0'),
              y: parseFloat(vertices[i].getAttribute('y') || '0'),
              z: parseFloat(vertices[i].getAttribute('z') || '0')
            });
          }

          // Calculate area for each triangle
          for (let i = 0; i < triangles.length; i++) {
            const v1Index = parseInt(triangles[i].getAttribute('v1') || '0');
            const v2Index = parseInt(triangles[i].getAttribute('v2') || '0');
            const v3Index = parseInt(triangles[i].getAttribute('v3') || '0');

            if (v[v1Index] && v[v2Index] && v[v3Index]) {
              const p1 = v[v1Index];
              const p2 = v[v2Index];
              const p3 = v[v3Index];

              // Vector A = P2 - P1
              const ax = p2.x - p1.x;
              const ay = p2.y - p1.y;
              const az = p2.z - p1.z;

              // Vector B = P3 - P1
              const bx = p3.x - p1.x;
              const by = p3.y - p1.y;
              const bz = p3.z - p1.z;

              // Cross Product A x B
              const cx = ay * bz - az * by;
              const cy = az * bx - ax * bz;
              const cz = ax * by - ay * bx;

              // Area = 0.5 * |A x B|
              const area = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
              if (!isNaN(area)) {
                surfaceAreaMm2 += area;
              }
            }
          }
        }

        // --- SCALE FACTOR CALCULATION ---
        // We need to check if the model is scaled in the build/item list
        let scaleFactor = 1.0;
        const buildItems = getElements(xmlDoc, 'item');

        for (const item of buildItems) {
          const transform = item.getAttribute('transform');
          if (transform) {
            // Format: "m00 m01 m02 n0 m10 m11 m12 n1 m20 m21 m22 n2"
            // We just want to extract the scaling components (diagonal) approximately
            const parts = transform.split(/\s+/).map(parseFloat);
            if (parts.length >= 10) {
              // Simple assumption: uniform scaling or taking the average scaling
              // m00, m11, m22 correspond to indices 0, 4, 8 in a 3x3 matrix logic, 
              // but in 3MF 4x3 matrix it is: 
              // m00 m01 m02
              // m10 m11 m12
              // m20 m21 m22
              // x   y   z 
              // Flattened string usually: m00 m01 m02 m10 m11 m12 m20 m21 m22 x y z (12 values)

              const sx = Math.abs(parts[0]);
              const sy = Math.abs(parts[4]);
              const sz = Math.abs(parts[8]);

              // Surface area scales with the square of the linear scale
              // Approximate composite scale for area (if uniform)
              const avgScale = (sx + sy + sz) / 3;
              scaleFactor = avgScale * avgScale;
            }
          }
        }

        // Apply scale (this is rough for non-unifrom scaling, but much better than nothing)
        if (scaleFactor !== 1.0) {
          surfaceAreaMm2 *= scaleFactor;
        }

      } catch (e) {
        console.error("Failed to parse 3MF structure:", e);
      }
    } else {
      // No file found ending in '3dmodel.model'
    }

    // Step 3: Try to find a thumbnail image if not found yet
    const thumbPath = fileNames.find(p =>
      (p.toLowerCase().endsWith('.png') || p.toLowerCase().endsWith('.jpg')) &&
      (p.toLowerCase().includes('thumbnail') || p.toLowerCase().includes('preview') || p.toLowerCase().startsWith('metadata/'))
    );

    if (thumbPath) {
      const ext = thumbPath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
      const thumbData = await zip.files[thumbPath].async('base64');
      thumbnail = `data:image/${ext};base64,${thumbData}`;
    }

    return {
      printTimeHours: Math.round(printTimeHours * 100) / 100,
      filamentWeightGrams: Math.round(filamentWeightGrams * 10) / 10,
      printerModel: printerModel || undefined,
      thumbnail: thumbnail || undefined,
      filamentSettingsId: undefined, // 3MF parsing limitation (for now)
      surfaceAreaMm2: surfaceAreaMm2 > 0 ? Math.round(surfaceAreaMm2 * 100) / 100 : undefined,
    };

  } catch {
    // Error parsing 3MF file
    return { printTimeHours: 0, filamentWeightGrams: 0 };
  }
}
