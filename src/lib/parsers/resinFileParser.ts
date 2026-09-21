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

// Resin file parser for .cxdlpv4 and other resin printer formats

import JSZip from 'jszip';

export interface ResinFileData {
  printTimeHours: number;
  resinVolumeMl: number;
  layerCount?: number;
  printerModel?: string;
  thumbnail?: string;
  fileName?: string;
  filePath?: string;
}

/**
 * Resin slicer files carry per-layer image data and are routinely 100 MB - 1 GB. Everything
 * this parser needs (header fields and the preview image) lives near the start, so only the
 * leading slice is read into memory instead of the whole file.
 */
const HEADER_SLICE_BYTES = 8 * 1024 * 1024; // 8 MB

async function readHeaderBuffer(file: File): Promise<ArrayBuffer> {
  const slice = file.size > HEADER_SLICE_BYTES ? file.slice(0, HEADER_SLICE_BYTES) : file;
  return slice.arrayBuffer();
}

/**
 * Cleans a string read out of an untrusted binary file before it reaches the UI:
 * strips control characters and caps the length.
 */
function cleanBinaryString(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x1f\x7f-\x9f]/g, '').trim().substring(0, 128);
}

/**
 * Read a null-terminated string with a Big Endian length prefix
 */
function readNullTerminatedString(dataView: DataView, offset: number): { value: string; bytesRead: number } {
  // Bounds check first: the length prefix comes from the file and can point past the buffer,
  // which would throw a RangeError and abort the whole parse.
  if (offset + 4 > dataView.byteLength) {
    return { value: '', bytesRead: 4 };
  }

  // Read the length (4 bytes, Big Endian)
  const length = dataView.getUint32(offset, false);

  if (length === 0 || length > 256 || offset + 4 + length > dataView.byteLength) {
    return { value: '', bytesRead: 4 };
  }

  const bytes = new Uint8Array(dataView.buffer, offset + 4, length);
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) break;
    str += String.fromCharCode(bytes[i]);
  }

  return { value: str, bytesRead: 4 + length };
}

/**
 * Parse .cxdlpv4 file (Creality Halot resin printer format)
 * Based on UVtools CrealityCXDLPv4File.cs format specification
 * 
 * Header structure:
 * - MagicSize (4 bytes, Big Endian)
 * - Magic (9 bytes) - "CXSW3DV2"
 * - Version (2 bytes, Big Endian)
 * - PrinterModel (null-terminated string with Big Endian length prefix)
 * - ResolutionX (2 bytes)
 * - ResolutionY (2 bytes)
 * - BedSizeX/Y/Z (3 floats)
 * - PrintHeight (float)
 * - LayerHeight (float)
 * - BottomLayersCount (4 bytes)
 * - PreviewSmallOffsetAddress (4 bytes)
 * - LayersDefinitionOffsetAddress (4 bytes)
 * - LayerCount (4 bytes)
 * - PreviewLargeOffsetAddress (4 bytes)
 * - PrintTime (4 bytes) - seconds
 * - ... more fields
 * 
 * PrintParameters section (at PrintParametersOffsetAddress):
 * - Various lift/speed settings
 * - VolumeMl (float) at offset 20 within the section
 */
async function parseCxdlpv4(buffer: ArrayBuffer): Promise<ResinFileData> {
  try {
    const dataView = new DataView(buffer);



    let offset = 0;

    // Read magic size (4 bytes, Big Endian)
    const magicSize = dataView.getUint32(offset, false);
    offset += 4;


    // Read magic string
    const magicBytes = new Uint8Array(buffer, offset, magicSize);
    const magic = String.fromCharCode(...magicBytes).replace(/\0/g, '');
    offset += magicSize;


    // Validate magic
    if (!magic.startsWith('CXSW3D')) {
      console.warn('Invalid magic, trying alternative parsing...');
      return parseGenericBinary(buffer);
    }

    // Skip version (2 bytes)
    offset += 2;


    // Read printer model (null-terminated string with length prefix).
    // Sanitized because it comes from an untrusted file and is rendered in the UI.
    const printerModelResult = readNullTerminatedString(dataView, offset);
    const printerModel = cleanBinaryString(printerModelResult.value);
    offset += printerModelResult.bytesRead;


    // Skip ResolutionX/Y (2 bytes each)
    offset += 4;


    // Skip BedSizeX/Y/Z (3 floats, 4 bytes each)
    offset += 12;


    // Skip PrintHeight (float)
    offset += 4;


    // Skip LayerHeight (float)
    offset += 4;


    // Skip BottomLayersCount (4 bytes)
    offset += 4;


    // Skip PreviewSmallOffsetAddress (4 bytes)
    offset += 4;

    // Skip LayersDefinitionOffsetAddress (4 bytes)
    offset += 4;

    // Read LayerCount (4 bytes)
    const layerCount = dataView.getUint32(offset, true);
    offset += 4;


    // Read PreviewLargeOffsetAddress (4 bytes)
    const previewLargeOffset = dataView.getUint32(offset, true);
    offset += 4;

    // Read PrintTime (4 bytes) - in seconds
    const printTimeSeconds = dataView.getUint32(offset, true);
    offset += 4;


    // Skip ProjectorType (4 bytes)
    offset += 4;

    // Read PrintParametersOffsetAddress (4 bytes)
    const printParamsOffset = dataView.getUint32(offset, true);
    offset += 4;


    // Read VolumeMl from PrintParameters section
    // VolumeMl is at offset 20 within PrintParameters (after 5 floats)
    let volumeMl = 0;
    if (printParamsOffset > 0 && printParamsOffset + 24 < buffer.byteLength) {
      // Skip first 5 floats (BottomLiftHeight, BottomLiftSpeed, LiftHeight, LiftSpeed, RetractSpeed)
      volumeMl = dataView.getFloat32(printParamsOffset + 20, true);

    }

    // Extract thumbnail from preview section
    let thumbnail = '';
    if (previewLargeOffset > 0 && previewLargeOffset + 12 < buffer.byteLength) {
      try {
        // Preview header: ResolutionX (4 bytes), ResolutionY (4 bytes), DataSize (4 bytes)
        const previewResX = dataView.getUint32(previewLargeOffset, true);
        const previewResY = dataView.getUint32(previewLargeOffset + 4, true);
        const previewDataSize = dataView.getUint32(previewLargeOffset + 8, true);



        // Validate preview data
        if (previewResX > 0 && previewResX <= 1024 &&
          previewResY > 0 && previewResY <= 1024 &&
          previewDataSize > 0 && previewDataSize < 500000 &&
          previewLargeOffset + 12 + previewDataSize <= buffer.byteLength) {

          // The preview is usually in RGB565 or raw RGB format
          // Try to create a simple base64 representation
          const previewData = new Uint8Array(buffer, previewLargeOffset + 12, previewDataSize);

          // Create a canvas to render the preview
          const canvas = document.createElement('canvas');
          canvas.width = previewResX;
          canvas.height = previewResY;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            const imageData = ctx.createImageData(previewResX, previewResY);

            // CXDLPV4 uses RGB565 format (2 bytes per pixel)
            const expectedSize = previewResX * previewResY * 2;

            if (previewDataSize === expectedSize || previewDataSize >= expectedSize) {
              // RGB565 decoding
              for (let i = 0, j = 0; i < previewResX * previewResY && j + 1 < previewData.length; i++, j += 2) {
                const pixel = previewData[j] | (previewData[j + 1] << 8);
                const r = ((pixel >> 11) & 0x1F) << 3;
                const g = ((pixel >> 5) & 0x3F) << 2;
                const b = (pixel & 0x1F) << 3;

                imageData.data[i * 4] = r;
                imageData.data[i * 4 + 1] = g;
                imageData.data[i * 4 + 2] = b;
                imageData.data[i * 4 + 3] = 255;
              }

              ctx.putImageData(imageData, 0, 0);
              thumbnail = canvas.toDataURL('image/png');

            } else {
              // Preview size doesn't match expected size
            }
          }
        }
      } catch (thumbError) {
        console.warn('Failed to extract thumbnail:', thumbError);
      }
    }

    // Validate and return
    const printTimeHours = printTimeSeconds > 0 && printTimeSeconds < 360000
      ? Math.round((printTimeSeconds / 3600) * 100) / 100
      : 0;

    const validVolume = volumeMl > 0 && volumeMl < 10000
      ? Math.round(volumeMl * 10) / 10
      : 0;

    const result: ResinFileData = {
      printTimeHours,
      resinVolumeMl: validVolume,
      layerCount: layerCount > 0 && layerCount < 100000 ? layerCount : undefined,
      printerModel: printerModel || undefined,
      thumbnail: thumbnail || undefined,
    };


    return result;

  } catch (error) {
    console.error('Error parsing cxdlpv4 file:', error);
    return { printTimeHours: 0, resinVolumeMl: 0 };
  }
}

/**
 * Parse CTB/CBDDLP file format (CHITUBOX)
 * Used by Elegoo, Phrozen, Anycubic printers
 * 
 * Header structure (little-endian):
 * - Magic (4 bytes): 0x12FD0019 (cbddlp), 0x12FD0086 (ctb), 0x12FD0106 (ctbv4)
 * - Version (4 bytes)
 * - BedSizeX (float)
 * - BedSizeY (float)
 * - BedSizeZ (float)
 * - Unknown1, Unknown2 (8 bytes)
 * - TotalHeightMm (float)
 * - LayerHeightMm (float)
 * - LayerExposureSeconds (float)
 * - BottomExposureSeconds (float)
 * - LightOffDelay (float)
 * - BottomLayersCount (4 bytes)
 * - ResolutionX (4 bytes)
 * - ResolutionY (4 bytes)
 * - PreviewLargeOffset (4 bytes)
 * - LayersDefinitionOffset (4 bytes)
 * - LayerCount (4 bytes)
 * - PreviewSmallOffset (4 bytes)
 * - PrintTime (4 bytes) - seconds
 * - ProjectorType (4 bytes)
 * - PrintParametersOffset (4 bytes)
 * - PrintParametersSize (4 bytes)
 */
async function parseCtbFormat(buffer: ArrayBuffer): Promise<ResinFileData> {
  try {
    const dataView = new DataView(buffer);

    // Validate magic number
    const magic = dataView.getUint32(0, true);
    const validMagics = [0x12FD0019, 0x12FD0086, 0x12FD0106, 0xFF220810];

    if (!validMagics.includes(magic)) {

      return parseGenericBinary(buffer);
    }

    // Skip version (4 bytes)
    // Skip dimensions (bed size x, y, z) - 12 bytes
    // Skip unknown fields (8 bytes)
    // Skip TotalHeightMm (float)
    // Skip LayerHeightMm (float)


    // Read counts and offsets - we only need specific ones
    // offset 48: BottomLayersCount (4 bytes)
    // offset 52: ResolutionX (4 bytes)
    // offset 56: ResolutionY (4 bytes)
    // offset 60: PreviewLargeOffset (4 bytes)
    // offset 64: LayersDefinitionOffset (4 bytes)
    // offset 68: LayerCount (4 bytes)
    // offset 72: PreviewSmallOffset (4 bytes)
    // offset 76: PrintTime (4 bytes)

    // We can read just what we need:

    // Read only the header values we actually use. (Bed size / resolution / total height were
    // read solely to feed the volume guess that has been removed.)
    const previewLargeOffset = dataView.getUint32(60, true);
    const layerCount = dataView.getUint32(68, true);
    const printTimeSeconds = dataView.getUint32(76, true);
    // Skip ProjectorType at 80
    const printParametersOffset = dataView.getUint32(84, true);



    // Try to read VolumeMl from PrintParameters section
    // PrintParameters structure:
    // Offset 0: BottomLiftHeight (float)
    // Offset 4: BottomLiftSpeed (float)
    // Offset 8: LiftHeight (float)
    // Offset 12: LiftSpeed (float)
    // Offset 16: RetractSpeed (float)
    // Offset 20: VolumeMl (float)
    // Offset 24: WeightGrams (float)
    let resinVolumeMl = 0;
    if (printParametersOffset > 0 && printParametersOffset + 28 <= buffer.byteLength) {
      const volumeFromParams = dataView.getFloat32(printParametersOffset + 20, true);

      if (Number.isFinite(volumeFromParams) && volumeFromParams > 0 && volumeFromParams < 10000) {
        resinVolumeMl = Math.round(volumeFromParams * 10) / 10;
      }
    }

    // No fallback estimate. The previous one assumed the print filled 30% of the entire bed
    // for its full height and presented that guess as an extracted volume — for a small part
    // it overstated resin use (and therefore the price) by orders of magnitude. If the file
    // does not carry a volume, the UI asks the user for it.
    if (resinVolumeMl === 0) {
      console.warn('[ResinParser] CTB file has no volume in its print parameters; leaving it for manual entry.');
    }

    // Try to extract thumbnail from preview section
    let thumbnail = '';
    if (previewLargeOffset > 0 && previewLargeOffset + 12 < buffer.byteLength) {
      try {
        // Preview header: ResolutionX (4), ResolutionY (4), TotalSize (4)
        const previewResX = dataView.getUint32(previewLargeOffset, true);
        const previewResY = dataView.getUint32(previewLargeOffset + 4, true);
        const previewDataSize = dataView.getUint32(previewLargeOffset + 8, true);



        if (previewResX > 0 && previewResX <= 800 &&
          previewResY > 0 && previewResY <= 480 &&
          previewDataSize > 0 && previewDataSize < 500000 &&
          previewLargeOffset + 12 + previewDataSize <= buffer.byteLength) {

          const previewData = new Uint8Array(buffer, previewLargeOffset + 12, previewDataSize);

          // CTB uses RLE encoded RGB565 format
          const canvas = document.createElement('canvas');
          canvas.width = previewResX;
          canvas.height = previewResY;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            const imageData = ctx.createImageData(previewResX, previewResY);
            let pixelIndex = 0;
            let dataIndex = 0;

            // Decode RLE RGB565
            while (dataIndex < previewData.length && pixelIndex < previewResX * previewResY) {
              const pixel = previewData[dataIndex] | (previewData[dataIndex + 1] << 8);
              dataIndex += 2;

              const r = ((pixel >> 11) & 0x1F) << 3;
              const g = ((pixel >> 5) & 0x3F) << 2;
              const b = (pixel & 0x1F) << 3;

              // Check for RLE marker (bit 15 set in run length byte pattern)
              let count = 1;
              if (dataIndex < previewData.length && (previewData[dataIndex] & 0x80)) {
                count = previewData[dataIndex] & 0x7F;
                dataIndex++;
              }

              for (let i = 0; i < count && pixelIndex < previewResX * previewResY; i++) {
                imageData.data[pixelIndex * 4] = r;
                imageData.data[pixelIndex * 4 + 1] = g;
                imageData.data[pixelIndex * 4 + 2] = b;
                imageData.data[pixelIndex * 4 + 3] = 255;
                pixelIndex++;
              }
            }

            ctx.putImageData(imageData, 0, 0);
            thumbnail = canvas.toDataURL('image/png');

          }
        }
      } catch (thumbError) {
        console.warn('Failed to extract CTB thumbnail:', thumbError);
      }
    }

    // Validate values
    const validPrintTime = printTimeSeconds > 0 && printTimeSeconds < 360000;
    const printTimeHours = validPrintTime ? Math.round((printTimeSeconds / 3600) * 100) / 100 : 0;

    return {
      printTimeHours,
      resinVolumeMl: resinVolumeMl > 0 && resinVolumeMl < 10000 ? resinVolumeMl : 0,
      layerCount: layerCount > 0 && layerCount < 100000 ? layerCount : undefined,
      printerModel: undefined,
      thumbnail: thumbnail || undefined,
    };

  } catch (error) {
    console.error('Error parsing CTB file:', error);
    return parseGenericBinary(buffer);
  }
}

/**
 * Parse Photon/PWS file format (Anycubic)
 * Similar structure to CTB but with different magic
 */
async function parsePhotonFormat(buffer: ArrayBuffer): Promise<ResinFileData> {
  try {
    const dataView = new DataView(buffer);
    const uint8Array = new Uint8Array(buffer);

    // Check for "ANYCUBIC" text marker
    const textDecoder = new TextDecoder('ascii');
    const headerText = textDecoder.decode(uint8Array.slice(0, 64));

    let printTimeSeconds = 0;
    let layerCount = 0;
    // Not derived from the file: see the note on the offset scan below.
    const resinVolumeMl = 0;
    let printerModel = '';

    // Photon format has different header structure
    // Try to find known patterns
    if (headerText.includes('ANYCUBIC')) {
      printerModel = 'Anycubic Photon';
    }

    // The Anycubic header layout is not published, so these offsets are heuristic. Two rules
    // keep the heuristic honest:
    //  1. A given offset may supply EITHER print time OR layer count, never both. Previously
    //     both `if`s tested against 0 independently, so one value like 1200 was reported as
    //     "1200 seconds" AND "1200 layers" simultaneously.
    //  2. Volume is not guessed at all. Scanning for "the first float that looks plausible"
    //     returned things like the bed width and presented them as a resin volume.
    const offsets = [24, 28, 32, 48, 52, 56, 60, 64, 68, 72, 76, 80];

    for (const offset of offsets) {
      if (offset + 4 > buffer.byteLength) continue;
      const val = dataView.getUint32(offset, true);

      if (printTimeSeconds === 0 && val >= 60 && val <= 360000) {
        printTimeSeconds = val;
        continue; // do not let the same field also become the layer count
      }

      if (layerCount === 0 && val >= 10 && val <= 50000) {
        layerCount = val;
      }
    }

    return {
      printTimeHours: printTimeSeconds > 0 ? Math.round((printTimeSeconds / 3600) * 100) / 100 : 0,
      // Left at 0 so the UI asks the user for it rather than showing an invented number.
      resinVolumeMl,
      layerCount: layerCount > 0 ? layerCount : undefined,
      printerModel: printerModel || undefined,
      thumbnail: undefined,
    };

  } catch (error) {
    console.error('Error parsing Photon file:', error);
    return { printTimeHours: 0, resinVolumeMl: 0 };
  }
}

/**
 * Fallback for files whose binary layout we do not know.
 *
 * This used to scan the first 1 KB and take the first integers that fell in a plausible
 * range as print time and layer count, and the first plausible float as the resin volume.
 * On an unknown (or compressed, e.g. a ZIP-based .sl1) file those bytes are effectively
 * random, so the app confidently displayed invented print times and volumes that the user
 * would then quote a customer from.
 *
 * We now only report the printer model when its name is literally present in the header,
 * and leave the priced quantities at 0 so the UI prompts for manual entry.
 */
function parseGenericBinary(buffer: ArrayBuffer): ResinFileData {
  const uint8Array = new Uint8Array(buffer);
  let printerModel = '';

  // Scan header for text patterns (printer model)
  const textDecoder = new TextDecoder('ascii');
  const headerText = textDecoder.decode(uint8Array.slice(0, Math.min(512, buffer.byteLength)));

  const printerPatterns = [
    /HALOT[- ]?(MAGE|ONE|SKY|RAY|MAX|LITE)[- ]?(\d*K?)?(\s*PRO)?/i,
    /CL-\d+[A-Z]*/i,
    /ELEGOO[- ]?(MARS|SATURN|JUPITER)[- ]?(\d+)?(\s*(ULTRA|PRO))?/i,
    /ANYCUBIC[- ]?(PHOTON|MONO)[- ]?(\w+)?/i,
    /PHROZEN[- ]?(SONIC|MEGA|MIGHTY)[- ]?(\w+)?/i,
    /PRUSA[- ]?SL\d?S?/i,
  ];

  for (const pattern of printerPatterns) {
    const match = headerText.match(pattern);
    if (match) {
      printerModel = cleanBinaryString(match[0]);
      break;
    }
  }

  console.warn('[ResinParser] Unrecognised file layout; not guessing print time or volume.');

  return {
    printTimeHours: 0,
    resinVolumeMl: 0,
    layerCount: undefined,
    printerModel: printerModel || undefined,
    thumbnail: undefined,
  };
}

/**
 * Parse Prusa SL1 / SL1S, which is a ZIP archive containing `config.ini`.
 *
 * These were previously fed to the binary scanner above, which read compressed ZIP bytes as
 * if they were header fields — guaranteed nonsense. The real values are plain key/value
 * pairs in the ini.
 */
async function parseSl1Format(file: File): Promise<ResinFileData> {
  try {
    const zip = await JSZip.loadAsync(file);
    const configEntry =
      zip.file('config.ini') ||
      zip.file(/config\.ini$/i)[0] ||
      zip.file(/prusaslicer\.ini$/i)[0];

    if (!configEntry) {
      console.warn('[ResinParser] SL1 archive has no config.ini');
      return { printTimeHours: 0, resinVolumeMl: 0 };
    }

    const config = await configEntry.async('string');

    const readValue = (key: string): number => {
      const match = config.match(new RegExp(`^\\s*${key}\\s*=\\s*([\\d.]+)`, 'im'));
      if (!match) return 0;
      const parsed = parseFloat(match[1]);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const printTimeSeconds = readValue('printTime');
    const usedMaterialMl = readValue('usedMaterial'); // millilitres
    const layerCount = readValue('numFade') > 0 ? readValue('numSlow') + readValue('numFast') : readValue('numFast');

    const printerModelMatch = config.match(/^\s*printerModel\s*=\s*(.+)$/im);
    const printerModel = printerModelMatch ? cleanBinaryString(printerModelMatch[1]) : '';

    // Prefer the embedded preview if one is present.
    let thumbnail: string | undefined;
    const thumbEntry = zip.file(/thumbnail\/thumbnail.*\.png$/i)[0];
    if (thumbEntry) {
      const base64 = await thumbEntry.async('base64');
      if (base64.length <= 1400000) {
        thumbnail = `data:image/png;base64,${base64}`;
      }
    }

    return {
      printTimeHours: printTimeSeconds > 0 ? Math.round((printTimeSeconds / 3600) * 100) / 100 : 0,
      resinVolumeMl: usedMaterialMl > 0 && usedMaterialMl < 10000 ? Math.round(usedMaterialMl * 10) / 10 : 0,
      layerCount: layerCount > 0 && layerCount < 100000 ? layerCount : undefined,
      printerModel: printerModel || undefined,
      thumbnail,
    };
  } catch (error) {
    console.error('Error parsing SL1 file:', error);
    return { printTimeHours: 0, resinVolumeMl: 0 };
  }
}

/**
 * Main parser function that routes to the appropriate parser based on file extension
 */
export async function parseResinFile(file: File): Promise<ResinFileData> {
  const fileName = file.name.toLowerCase();

  // SL1/SL1S are ZIP archives and must be handled before any binary path.
  if (fileName.endsWith('.sl1s') || fileName.endsWith('.sl1')) {
    return parseSl1Format(file);
  }

  // Everything below is a binary format whose header lives at the start of the file, so only
  // the leading slice is loaded. These files are frequently hundreds of megabytes.
  const buffer = await readHeaderBuffer(file);

  // Creality Halot series
  if (fileName.endsWith('.cxdlpv4')) {
    return parseCxdlpv4(buffer);
  }

  // CTB format (CHITUBOX) - used by Elegoo, Phrozen, Anycubic
  // FDG format - Elegoo Mars/Saturn (same layout)
  if (fileName.endsWith('.ctb') || fileName.endsWith('.fdg')) {
    return parseCtbFormat(buffer);
  }

  // GOO (Anycubic Cloud) and Photon/PWMO (Anycubic Photon series)
  if (fileName.endsWith('.goo') || fileName.endsWith('.photon') || fileName.endsWith('.pwmo')) {
    return parsePhotonFormat(buffer);
  }

  // FORM format - Formlabs (layout not documented here)
  if (fileName.endsWith('.form')) {
    return parseGenericBinary(buffer);
  }

  console.warn('Unsupported resin file format:', fileName);
  return { printTimeHours: 0, resinVolumeMl: 0 };
}