import { OCRResult } from './types';

/**
 * Normalizes various expiry date formats to MM/YYYY.
 * Examples:
 * 12/26 -> 12/2026
 * 12-2026 -> 12/2026
 * EXP 12/2026 -> 12/2026
 * Dec 2026 -> 12/2026
 * Does NOT infer day if only month/year is present.
 */
export function normalizeExpiry(rawExpiry: string | null | undefined): string | null {
  if (!rawExpiry) return null;
  const clean = rawExpiry.trim().toUpperCase();

  // Strip prefixes like EXP, EXPIRY, EXP., DT, etc.
  const stripped = clean.replace(/^(EXP|EXPIRY|EXP\.? DATE|EXPIRES|MFG|USE BEFORE)[:.\s]*/i, '').trim();

  // Pattern: Month name and year, e.g. Dec 2026, December 26
  const monthNames: Record<string, string> = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
  };

  const nameMatch = stripped.match(/([A-Z]{3,9})[\s\-\/\.]+(\d{2,4})/i);
  if (nameMatch) {
    const monthKey = nameMatch[1].slice(0, 3).toUpperCase();
    if (monthNames[monthKey]) {
      let year = nameMatch[2];
      if (year.length === 2) {
        year = `20${year}`;
      }
      return `${monthNames[monthKey]}/${year}`;
    }
  }

  // Pattern: MM/YYYY or MM-YYYY or MM.YYYY
  const m4Match = stripped.match(/(\d{1,2})[\/\-\.](\d{4})/);
  if (m4Match) {
    const month = m4Match[1].padStart(2, '0');
    const monthNum = parseInt(month, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${month}/${m4Match[2]}`;
    }
  }

  // Pattern: MM/YY or MM-YY or MM.YY
  const m2Match = stripped.match(/(\d{1,2})[\/\-\.](\d{2})$/);
  if (m2Match) {
    const month = m2Match[1].padStart(2, '0');
    const monthNum = parseInt(month, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${month}/20${m2Match[2]}`;
    }
  }

  // Pattern: YYYY/MM or YYYY-MM
  const y4Match = stripped.match(/(\d{4})[\/\-](\d{1,2})/);
  if (y4Match) {
    const month = y4Match[2].padStart(2, '0');
    const monthNum = parseInt(month, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${month}/${y4Match[1]}`;
    }
  }

  return null;
}

/**
 * Normalizes MRP strings to float numeric value.
 * Accepts: ₹85, 85, MRP 85, MRP Rs. 85.00, M.R.P. Rs. 85/-, Rs. 140.50
 */
export function normalizeMrp(rawMrp: string | number | null | undefined): number | null {
  if (rawMrp === null || rawMrp === undefined) return null;
  if (typeof rawMrp === 'number') {
    return isNaN(rawMrp) || rawMrp <= 0 ? null : Math.round(rawMrp * 100) / 100;
  }

  const str = String(rawMrp).trim();
  // Strip currency symbols and prefixes
  const cleaned = str
    .replace(/[₹$€£]/g, '')
    .replace(/(MRP|M\.R\.P\.?|RS\.?|INR|PRICE|RATE)[:.\s]*/gi, '')
    .replace(/\/\-$/, '')
    .replace(/,/g, '')
    .trim();

  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num * 100) / 100;
}

/**
 * Formats a numeric price for display (e.g., 85 -> "₹85.00")
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹--';
  }
  return `₹${amount.toFixed(2)}`;
}

/**
 * Validates and sanitizes raw OCR output into clean structured data.
 */
export function sanitizeOCRResult(raw: Partial<OCRResult>): OCRResult {
  const warnings: string[] = [];
  
  const productName = (raw.productName || '').trim();
  if (!productName) {
    warnings.push('Product name could not be reliably detected.');
  }

  const mrp = normalizeMrp(raw.mrp);
  if (mrp === null) {
    warnings.push('MRP could not be confidently detected.');
  }

  const expiry = normalizeExpiry(raw.expiry);
  if (expiry === null) {
    warnings.push('Expiry could not be detected or is in an invalid format.');
  }

  const conf = raw.confidence || {
    productName: productName ? 0.8 : 0,
    mrp: mrp ? 0.8 : 0,
    expiry: expiry ? 0.8 : 0,
    batchNumber: raw.batchNumber ? 0.8 : 0,
  };

  if (conf.mrp < 0.70 && mrp !== null) {
    warnings.push('MRP confidence is low; please verify packaging.');
  }
  if (conf.expiry < 0.70 && expiry !== null) {
    warnings.push('Expiry confidence is low; please verify packaging.');
  }

  return {
    productName,
    brand: (raw.brand || '').trim(),
    mrp,
    expiry,
    batchNumber: (raw.batchNumber || '').trim(),
    manufacturer: (raw.manufacturer || '').trim(),
    confidence: {
      productName: Math.max(0, Math.min(1, conf.productName || 0)),
      mrp: Math.max(0, Math.min(1, conf.mrp || 0)),
      expiry: Math.max(0, Math.min(1, conf.expiry || 0)),
      batchNumber: Math.max(0, Math.min(1, conf.batchNumber || 0)),
    },
    rawText: raw.rawText || '',
    warnings: [...(raw.warnings || []), ...warnings],
  };
}
