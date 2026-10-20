/**
 * Lazy HEIC decoder using client-side WebAssembly / libheif.
 */

/**
 * Checks whether a given Blob or File represents a HEIC/HEIF image.
 */
export async function isHeic(blob: Blob): Promise<boolean> {
  const type = blob.type.toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') {
    return true;
  }
  if ('name' in blob && typeof (blob as File).name === 'string') {
    const name = (blob as File).name.toLowerCase();
    if (name.endsWith('.heic') || name.endsWith('.heif')) {
      return true;
    }
  }

  // Check magic bytes (ftyp) in first 16 bytes
  try {
    const slice = blob.slice(0, 16);
    const buf = await slice.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (bytes.length >= 12) {
      // Look for 'ftyp' at offset 4
      const ftyp = String.fromCharCode(...bytes.slice(4, 8));
      if (ftyp === 'ftyp') {
        const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
        if (
          brand === 'heic' ||
          brand === 'heix' ||
          brand === 'heim' ||
          brand === 'heis' ||
          brand === 'mif1' ||
          brand === 'msf1'
        ) {
          return true;
        }
      }
    }
  } catch {
    // Ignore buffer read errors
  }

  try {
    const { isHeic: libCheck } = await import('heic-to');
    if (blob instanceof File) {
      return await libCheck(blob);
    }
  } catch {
    // Optional fallback
  }

  return false;
}

/**
 * Lazy-loads the HEIC decoder and converts the given HEIC blob into a PNG blob.
 */
export async function decodeHeic(blob: Blob): Promise<Blob> {
  const { heicTo } = await import('heic-to');
  const converted = await heicTo({
    blob,
    type: 'image/png',
  });
  return converted;
}
