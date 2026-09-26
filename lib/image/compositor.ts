import sharp from 'sharp';
import { formatCurrency } from '../ai/ocr';

export interface FinalImageParams {
  mrp?: number | null;
  ptr?: number | null;
  expiry?: string | null;
  productName?: string;
  canvasSize?: number;
  quality?: number;
}

export interface FinalImageResult {
  finalJpg: Buffer;
  finalWebp: Buffer;
  width: number;
  height: number;
}

/**
 * Creates the bottom information panel SVG banner.
 * Strict styling:
 * MRP: red accent
 * PTR: blue accent
 * Expiry: green accent
 */
export function generateBottomPanelSvg(
  width: number,
  height: number,
  mrp: number | null | undefined,
  ptr: number | null | undefined,
  expiry: string | null | undefined
): Buffer {
  const panelHeight = Math.round(width * 0.14); // ~280px on a 2000x2000 canvas
  const mrpText = mrp ? formatCurrency(mrp) : 'N/A';
  const ptrText = ptr ? formatCurrency(ptr) : 'N/A';
  const expText = expiry ? expiry : 'N/A';

  const colWidth = Math.round(width / 3);
  const cardMargin = Math.round(width * 0.015); // ~30px
  const cardWidth = colWidth - cardMargin * 2;
  const cardHeight = panelHeight - cardMargin * 2;

  const svg = `
  <svg width="${width}" height="${panelHeight}" viewBox="0 0 ${width} ${panelHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="115%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.06"/>
      </filter>
      <linearGradient id="panelBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#f8fafc"/>
      </linearGradient>
    </defs>

    <!-- Background and top divider -->
    <rect width="${width}" height="${panelHeight}" fill="url(#panelBg)"/>
    <line x1="0" y1="0" x2="${width}" y2="0" stroke="#e2e8f0" stroke-width="3"/>

    <!-- CARD 1: MRP (Red Accent) -->
    <g transform="translate(${cardMargin}, ${cardMargin})">
      <rect width="${cardWidth}" height="${cardHeight}" rx="14" fill="#ffffff" stroke="#fecaca" stroke-width="2" filter="url(#cardShadow)"/>
      <rect x="0" y="0" width="${cardWidth}" height="10" rx="4" fill="#ef4444"/>
      <text x="${cardWidth / 2}" y="${cardHeight * 0.42}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(cardHeight * 0.22)}" font-weight="700" fill="#dc2626" text-anchor="middle" letter-spacing="2">
        MRP
      </text>
      <text x="${cardWidth / 2}" y="${cardHeight * 0.78}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(cardHeight * 0.32)}" font-weight="800" fill="#1e293b" text-anchor="middle">
        ${mrpText}
      </text>
    </g>

    <!-- CARD 2: PTR (Blue Accent) -->
    <g transform="translate(${colWidth + cardMargin}, ${cardMargin})">
      <rect width="${cardWidth}" height="${cardHeight}" rx="14" fill="#ffffff" stroke="#bfdbfe" stroke-width="2" filter="url(#cardShadow)"/>
      <rect x="0" y="0" width="${cardWidth}" height="10" rx="4" fill="#3b82f6"/>
      <text x="${cardWidth / 2}" y="${cardHeight * 0.42}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(cardHeight * 0.22)}" font-weight="700" fill="#2563eb" text-anchor="middle" letter-spacing="2">
        PTR
      </text>
      <text x="${cardWidth / 2}" y="${cardHeight * 0.78}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(cardHeight * 0.32)}" font-weight="800" fill="#1e293b" text-anchor="middle">
        ${ptrText}
      </text>
    </g>

    <!-- CARD 3: EXPIRY (Green Accent) -->
    <g transform="translate(${colWidth * 2 + cardMargin}, ${cardMargin})">
      <rect width="${cardWidth}" height="${cardHeight}" rx="14" fill="#ffffff" stroke="#a7f3d0" stroke-width="2" filter="url(#cardShadow)"/>
      <rect x="0" y="0" width="${cardWidth}" height="10" rx="4" fill="#10b981"/>
      <text x="${cardWidth / 2}" y="${cardHeight * 0.42}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(cardHeight * 0.22)}" font-weight="700" fill="#059669" text-anchor="middle" letter-spacing="2">
        EXPIRY
      </text>
      <text x="${cardWidth / 2}" y="${cardHeight * 0.78}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(cardHeight * 0.32)}" font-weight="800" fill="#1e293b" text-anchor="middle">
        ${expText}
      </text>
    </g>
  </svg>`;

  return Buffer.from(svg.trim());
}

/**
 * Creates Stage B: Final Marketing / Catalog Image.
 * Takes the Stage A Clean Product Image and composits the bottom information panel.
 */
export async function createFinalMarketingImage(
  cleanImageBuffer: Buffer,
  params: FinalImageParams
): Promise<FinalImageResult> {
  const quality = params.quality || 92;

  // Read metadata of clean image
  const meta = await sharp(cleanImageBuffer).metadata();
  const width = meta.width || params.canvasSize || 2000;
  const height = meta.height || params.canvasSize || 2000;

  // Generate SVG bottom panel
  const panelHeight = Math.round(width * 0.14);
  const panelBuffer = generateBottomPanelSvg(
    width,
    panelHeight,
    params.mrp,
    params.ptr,
    params.expiry
  );

  // Resize clean image so the bottom panel does not obscure the product
  // The product area will occupy height - panelHeight
  const productAreaHeight = height - panelHeight;
  const resizedClean = await sharp(cleanImageBuffer)
    .resize(width, productAreaHeight, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .toBuffer();

  // Create composite on white canvas
  const canvas = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  });

  const finalComposite = canvas.composite([
    {
      input: resizedClean,
      top: 0,
      left: 0,
    },
    {
      input: panelBuffer,
      top: productAreaHeight,
      left: 0,
    },
  ]);

  const [finalJpg, finalWebp] = await Promise.all([
    finalComposite
      .clone()
      .jpeg({ quality, mozjpeg: true })
      .toBuffer(),
    finalComposite
      .clone()
      .webp({ quality: Math.min(quality, 90) })
      .toBuffer(),
  ]);

  return {
    finalJpg,
    finalWebp,
    width,
    height,
  };
}
