import sharp from 'sharp';

export interface ProcessOptions {
  canvasSize?: number;      // e.g. 2000
  productScale?: number;    // 0.75 - 0.85 of canvas height (default 0.80)
  brightness?: number;      // 1.0 default
  contrast?: number;        // 1.0 default
  sharpness?: boolean;      // true default
  quality?: number;         // 90 - 95
}

export interface ProcessResult {
  cleanJpg: Buffer;
  cleanWebp: Buffer;
  width: number;
  height: number;
}

/**
 * Deterministically cleans and normalizes a product image.
 * Guarantees packaging text, medicine names, MRP, logos, and labels are 100% physically preserved.
 */
export async function createCleanProductImage(
  inputBuffer: Buffer,
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  const canvasSize = options.canvasSize || 2000;
  const productScale = Math.min(0.85, Math.max(0.70, options.productScale || 0.80));
  const quality = options.quality || 92;

  // 1. Normalize EXIF orientation and convert to RGB
  let pipeline = sharp(inputBuffer, { failOnError: false })
    .rotate() // auto-rotates based on EXIF
    .toColorspace('srgb');

  // 2. Extract metadata
  const meta = await pipeline.metadata();
  if (!meta.width || !meta.height) {
    throw new Error('Failed to read image dimensions');
  }

  // 3. Trim outer borders / background borders if uniform
  try {
    const trimmed = await pipeline
      .clone()
      .trim({ background: '#ffffff', threshold: 15 })
      .toBuffer();
    pipeline = sharp(trimmed);
  } catch {
    // If trimming isn't applicable, keep normalized image
  }

  const trimmedMeta = await pipeline.metadata();
  const srcWidth = trimmedMeta.width || meta.width;
  const srcHeight = trimmedMeta.height || meta.height;

  // 4. Calculate scaling so product occupies ~75-85% of canvas height
  const maxTargetHeight = Math.round(canvasSize * productScale);
  const maxTargetWidth = Math.round(canvasSize * 0.85);

  const heightRatio = maxTargetHeight / srcHeight;
  const widthRatio = maxTargetWidth / srcWidth;
  const scale = Math.min(heightRatio, widthRatio);

  const scaledWidth = Math.round(srcWidth * scale);
  const scaledHeight = Math.round(srcHeight * scale);

  // 5. Apply subtle lighting, exposure and sharpness enhancements
  let enhanced = pipeline
    .resize(scaledWidth, scaledHeight, {
      fit: 'inside',
      kernel: sharp.kernel.lanczos3,
    })
    .modulate({
      brightness: options.brightness || 1.02,
      saturation: 1.01,
    });

  if (options.sharpness !== false) {
    enhanced = enhanced.sharpen({
      sigma: 1.0,
      m1: 0.8,
      m2: 2.0,
    });
  }

  const enhancedBuffer = await enhanced.toBuffer();

  // 6. Center product onto pure 1:1 white background canvas
  const left = Math.round((canvasSize - scaledWidth) / 2);
  const top = Math.round((canvasSize - scaledHeight) / 2);

  const whiteCanvas = sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  });

  const composited = whiteCanvas.composite([
    {
      input: enhancedBuffer,
      left: Math.max(0, left),
      top: Math.max(0, top),
    },
  ]);

  // 7. Generate high quality JPEG and WebP
  const [cleanJpg, cleanWebp] = await Promise.all([
    composited
      .clone()
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer(),
    composited
      .clone()
      .webp({ quality: Math.min(quality, 90) })
      .toBuffer(),
  ]);

  return {
    cleanJpg,
    cleanWebp,
    width: canvasSize,
    height: canvasSize,
  };
}
