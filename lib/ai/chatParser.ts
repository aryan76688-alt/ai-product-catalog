import { ChatParseResult, ProductCandidate } from './types';
import { normalizeMrp, normalizeExpiry, formatCurrency } from './ocr';

/**
 * Deterministically parses common chat inputs for product data updates.
 * Supports:
 * - "MRP 85 PTR 13.50 Expiry 12/2026"
 * - "mrp 85\nptr 13.50\nexpiry 12/2026"
 * - "85, 13.50, 12/2026"
 * - "MRP is 85, PTR is 13.50 and expiry is 12/2026"
 * - "Change PTR to 14"
 * - "MRP is wrong, change it to 90"
 * - "Expiry December 2026"
 */
export function parseChatWithRules(
  message: string,
  currentData?: Partial<ProductCandidate & { ptr?: number | null }>
): ChatParseResult | null {
  const text = message.trim();
  if (!text) return null;

  let detectedMrp: number | null | undefined = undefined;
  let detectedPtr: number | null | undefined = undefined;
  let detectedExpiry: string | null | undefined = undefined;
  let confidence = 0.95;

  // 1. Shorthand comma format: "85, 13.50, 12/2026" or "85, 13.50, 12/26"
  const commaPattern = /^\s*(\d+(\.\d{1,2})?)\s*,\s*(\d+(\.\d{1,2})?)\s*,\s*([A-Za-z0-9\/\-\.]+)\s*$/;
  const commaMatch = text.match(commaPattern);
  if (commaMatch) {
    const rawMrp = parseFloat(commaMatch[1]);
    const rawPtr = parseFloat(commaMatch[3]);
    const normExp = normalizeExpiry(commaMatch[5]);
    if (!isNaN(rawMrp) && !isNaN(rawPtr) && normExp) {
      return {
        mrp: rawMrp,
        ptr: rawPtr,
        expiry: normExp,
        action: 'update',
        confidence: 0.98,
        explanation: `Detected MRP ${formatCurrency(rawMrp)}, PTR ${formatCurrency(rawPtr)}, Expiry ${normExp}`,
      };
    }
  }

  // 2. Explicit MRP regex patterns:
  // "MRP 85", "mrp: 85.00", "MRP is 85", "change mrp to 90", "mrp is wrong, change it to 90"
  const mrpRegex = /(?:mrp|m\.r\.p\.?|price)(?:\s+is\s+wrong,?\s+change\s+it\s+to|\s+to|\s+is|\s*[:=])?\s*[₹$]?\s*(\d+(\.\d{1,2})?)/i;
  const mrpMatch = text.match(mrpRegex);
  if (mrpMatch) {
    detectedMrp = normalizeMrp(mrpMatch[1]);
  }

  // 3. Explicit PTR regex patterns:
  // "PTR 13.50", "ptr: 13.50", "PTR is 13.50", "change ptr to 14", "ptr to 14"
  const ptrRegex = /(?:ptr|p\.t\.r\.?|rate|purchase\s+rate)(?:\s+is\s+wrong,?\s+change\s+it\s+to|\s+to|\s+is|\s*[:=])?\s*[₹$]?\s*(\d+(\.\d{1,2})?)/i;
  const ptrMatch = text.match(ptrRegex);
  if (ptrMatch) {
    detectedPtr = normalizeMrp(ptrMatch[1]);
  }

  // 4. Explicit Expiry regex patterns:
  // "Expiry 12/2026", "exp: 12/26", "expiry is 12/2026", "change expiry to December 2026"
  const expRegex = /(?:expiry|exp\.?\s*date|exp)(?:\s+to|\s+is|\s*[:=])?\s*([A-Za-z0-9\/\-\.]+(?:\s+\d{2,4})?)/i;
  const expMatch = text.match(expRegex);
  if (expMatch) {
    detectedExpiry = normalizeExpiry(expMatch[1]);
  } else {
    // Check if whole message is just an expiry date: "12/2026", "December 2026", "12/26"
    const standaloneExp = normalizeExpiry(text);
    if (standaloneExp) {
      detectedExpiry = standaloneExp;
    }
  }

  // If nothing was parsed yet, check for lone updates like "change to 90" when context might imply
  if (detectedMrp === undefined && detectedPtr === undefined && detectedExpiry === undefined) {
    // e.g. "change to 90" or "it is 85"
    const loneNumMatch = text.match(/^(?:change\s+(?:it\s+)?to|is)\s*[₹$]?\s*(\d+(\.\d{1,2})?)$/i);
    if (loneNumMatch) {
      const val = parseFloat(loneNumMatch[1]);
      return {
        action: 'clarify',
        confidence: 0.5,
        explanation: `Did you want to update MRP or PTR to ${formatCurrency(val)}? Please specify (e.g. "MRP ${val}" or "PTR ${val}").`,
      };
    }
    return null;
  }

  const parts: string[] = [];
  if (detectedMrp !== undefined) parts.push(`MRP: ${formatCurrency(detectedMrp)}`);
  if (detectedPtr !== undefined) parts.push(`PTR: ${formatCurrency(detectedPtr)}`);
  if (detectedExpiry !== undefined) parts.push(`Expiry: ${detectedExpiry || 'invalid'}`);

  return {
    mrp: detectedMrp,
    ptr: detectedPtr,
    expiry: detectedExpiry,
    action: 'update',
    confidence,
    explanation: `Detected: ${parts.join(' | ')}`,
  };
}
