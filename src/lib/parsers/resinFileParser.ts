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
 * Read a null-terminated string with a Big Endian length prefix
 */
function readNullTerminatedString(dataView: DataView, offset: number): { value: string; bytesRead: number } {
  // Read the length (4 bytes, Big Endian)
  const length = dataView.getUint32(offset, false);

  if (length === 0 || length > 256) {
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
export async function parseCxdlpv4(file: File): Promise<ResinFileData> {
  try {
    const buffer = await file.arrayBuffer();
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


    // Read printer model (null-terminated string with length prefix)
    const printerModelResult = readNullTerminatedString(dataView, offset);
    const printerModel = printerModelResult.value;
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
    const previewSmallOffset = dataView.getUint32(offset, true); // Kept in case needed later, but marked unused
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
    // const version = dataView.getUint32(4, true);

    // Skip dimensions (bed size x, y, z) - 12 bytes
    // const bedSizeX = dataView.getFloat32(8, true);
    // const bedSizeY = dataView.getFloat32(12, true);
    // const bedSizeZ = dataView.getFloat32(16, true);

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

    // Read necessary header values
    const bedSizeX = dataView.getFloat32(12, true);
    // const bedSizeY = dataView.getFloat32(16, true); // Unused for now but kept for reference
    // const bedSizeZ = dataView.getFloat32(20, true); // Unused
    const layerHeight = dataView.getFloat32(24, true);

    // Skip...

    const resolutionX = dataView.getUint32(52, true);
    const resolutionY = dataView.getUint32(56, true);

    const previewLargeOffset = dataView.getUint32(60, true);
    const layerCount = dataView.getUint32(68, true);
    const printTimeSeconds = dataView.getUint32(76, true);
    // Skip ProjectorType at 80
    const printParametersOffset = dataView.getUint32(84, true);

    const totalHeightMm = layerHeight * layerCount;



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

    // Fallback: estimate volume from bed dimensions if not found
    if (resinVolumeMl === 0) {
      const pixelSizeMm = bedSizeX / resolutionX;
      const printAreaMm2 = (resolutionX * resolutionY) * (pixelSizeMm * pixelSizeMm) * 0.3;
      const estimatedVolumeMm3 = printAreaMm2 * totalHeightMm;
      resinVolumeMl = Math.round((estimatedVolumeMm3 / 1000) * 10) / 10;

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
    let resinVolumeMl = 0;
    let printerModel = '';

    // Photon format has different header structure
    // Try to find known patterns
    if (headerText.includes('ANYCUBIC')) {
      printerModel = 'Anycubic Photon';
    }

    // Scan for print parameters at common offsets
    // Photon format typically has:
    // - Header info at start
    // - Print time as uint32 at various possible offsets
    const offsets = [24, 28, 32, 48, 52, 56, 60, 64, 68, 72, 76, 80];

    for (const offset of offsets) {
      if (offset + 4 <= buffer.byteLength) {
        const val = dataView.getUint32(offset, true);

        // Check if this could be print time (1 minute to 100 hours)
        if (printTimeSeconds === 0 && val >= 60 && val <= 360000) {
          printTimeSeconds = val;
        }

        // Check if this could be layer count (10 to 50000)
        if (layerCount === 0 && val >= 10 && val <= 50000) {
          layerCount = val;
        }
      }
    }

    // Try to find floats that could be volume
    for (let i = 0; i < Math.min(buffer.byteLength - 4, 200); i += 4) {
      const floatVal = dataView.getFloat32(i, true);
      if (resinVolumeMl === 0 && Number.isFinite(floatVal) && floatVal >= 0.1 && floatVal <= 2000) {
        resinVolumeMl = floatVal;
        break;
      }
    }

    return {
      printTimeHours: printTimeSeconds > 0 ? Math.round((printTimeSeconds / 3600) * 100) / 100 : 0,
      resinVolumeMl: Math.round(resinVolumeMl * 10) / 10,
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
 * Fallback parser for files that don't match expected format
 */
function parseGenericBinary(buffer: ArrayBuffer): ResinFileData {
  const dataView = new DataView(buffer);
  const uint8Array = new Uint8Array(buffer);

  let printTimeSeconds = 0;
  let resinVolumeMl = 0;
  let layerCount = 0;
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
      printerModel = match[0].replace(/\0/g, '').trim();
      break;
    }
  }

  // Scan for reasonable numeric values
  for (let i = 0; i < Math.min(buffer.byteLength - 4, 1024); i += 4) {
    const uint32Val = dataView.getUint32(i, true);
    const floatVal = dataView.getFloat32(i, true);

    // Look for print time (60 seconds to 100 hours)
    if (printTimeSeconds === 0 && uint32Val >= 60 && uint32Val <= 360000) {
      printTimeSeconds = uint32Val;
    }

    // Look for layer count (10 to 50000)
    if (layerCount === 0 && uint32Val >= 10 && uint32Val <= 50000) {
      layerCount = uint32Val;
    }

    // Look for volume (0.1ml to 5000ml as float)
    if (resinVolumeMl === 0 && Number.isFinite(floatVal) && floatVal >= 0.1 && floatVal <= 5000) {
      resinVolumeMl = floatVal;
    }
  }

  return {
    printTimeHours: Math.round((printTimeSeconds / 3600) * 100) / 100,
    resinVolumeMl: Math.round(resinVolumeMl * 10) / 10,
    layerCount: layerCount > 0 ? layerCount : undefined,
    printerModel: printerModel || undefined,
    thumbnail: undefined,
  };
}

/**
 * Main parser function that routes to the appropriate parser based on file extension
 */
export async function parseResinFile(file: File): Promise<ResinFileData> {
  const fileName = file.name.toLowerCase();

  // Creality Halot series
  if (fileName.endsWith('.cxdlpv4')) {
    return parseCxdlpv4(file);
  }

  // CTB format (CHITUBOX) - used by Elegoo, Phrozen, Anycubic
  if (fileName.endsWith('.ctb')) {

    const buffer = await file.arrayBuffer();
    return parseCtbFormat(buffer);
  }

  // FDG format - Elegoo Mars/Saturn (similar to CTB)
  if (fileName.endsWith('.fdg')) {

    const buffer = await file.arrayBuffer();
    return parseCtbFormat(buffer);
  }

  // GOO format - Anycubic Cloud printers
  if (fileName.endsWith('.goo')) {

    const buffer = await file.arrayBuffer();
    return parsePhotonFormat(buffer);
  }

  // Photon/PWMO format - Anycubic Photon series
  if (fileName.endsWith('.photon') || fileName.endsWith('.pwmo')) {

    const buffer = await file.arrayBuffer();
    return parsePhotonFormat(buffer);
  }

  // SL1S format - Prusa SL1/SL1S Speed (ZIP archive with config)
  if (fileName.endsWith('.sl1s') || fileName.endsWith('.sl1')) {

    const buffer = await file.arrayBuffer();
    return parseGenericBinary(buffer);
  }

  // FORM format - Formlabs
  if (fileName.endsWith('.form')) {

    const buffer = await file.arrayBuffer();
    return parseGenericBinary(buffer);
  }

  console.warn('Unsupported resin file format:', fileName);
  return { printTimeHours: 0, resinVolumeMl: 0 };
}