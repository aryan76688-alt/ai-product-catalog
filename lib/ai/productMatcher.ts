import { ProductCandidate, ExcelRowCandidate, MatchResult } from './types';

/**
 * Normalizes strings for matching: lowercase, strip punctuation, unify whitespace.
 */
export function normalizeForMatch(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Dice's Coefficient (Bigram similarity) between two strings.
 * Returns score between 0.0 and 1.0.
 */
export function diceCoefficient(a: string, b: string): number {
  const normA = normalizeForMatch(a);
  const normB = normalizeForMatch(b);
  if (normA === normB) return 1.0;
  if (normA.length < 2 || normB.length < 2) return 0.0;

  const getBigrams = (s: string) => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bigram = s.substring(i, i + 2);
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }
    return bigrams;
  };

  const bigramsA = getBigrams(normA);
  const bigramsB = getBigrams(normB);

  let intersection = 0;
  for (const [bigram, countA] of bigramsA.entries()) {
    if (bigramsB.has(bigram)) {
      intersection += Math.min(countA, bigramsB.get(bigram)!);
    }
  }

  const total = (normA.length - 1) + (normB.length - 1);
  return (2.0 * intersection) / total;
}

/**
 * Extracts strength, pack size, dosage forms from product name.
 * e.g. "D15", "60ml", "500mg", "100 mg", "Syrup", "Tablet"
 */
export function extractAttributes(name: string): { strengths: string[]; forms: string[] } {
  const clean = name.toLowerCase();
  const strengthMatches = clean.match(/\b([a-z]?\d+(\.\d+)?\s*(?:mg|ml|gm|g|mcg|iu|%|d\d*))\b/gi) || [];
  const formKeywords = ['syrup', 'suspension', 'tablet', 'tab', 'capsule', 'cap', 'injection', 'inj', 'gel', 'cream', 'drops', 'ointment'];
  const foundForms = formKeywords.filter(form => clean.includes(form));

  return {
    strengths: strengthMatches.map(s => s.replace(/\s+/g, '')),
    forms: foundForms,
  };
}

/**
 * Executes multi-tier product matching against Excel rows.
 */
export function matchProductWithExcelRows(
  product: ProductCandidate,
  excelRows: ExcelRowCandidate[]
): MatchResult {
  if (!excelRows || excelRows.length === 0) {
    return {
      matched: false,
      confidence: 0,
      reason: 'No Excel PTR records available to match.',
    };
  }

  const prodName = product.productName || '';
  const normProdName = normalizeForMatch(prodName);
  const prodAttr = extractAttributes(prodName);

  let bestMatch: {
    row: ExcelRowCandidate;
    confidence: number;
    reason: string;
  } | null = null;

  for (const row of excelRows) {
    const rawRowName = row.rawProductName || '';
    const normRowName = row.normalizedName || normalizeForMatch(rawRowName);

    // 1. Exact SKU / Code Match
    if (product.sku && row.sku && product.sku.trim().toLowerCase() === row.sku.trim().toLowerCase()) {
      return {
        matched: true,
        excelRowId: row.id,
        matchedPtr: row.ptr,
        confidence: 1.0,
        reason: `Exact SKU Match: ${row.sku}`,
      };
    }

    // 2. Exact Normalized Name Match
    if (normProdName === normRowName) {
      return {
        matched: true,
        excelRowId: row.id,
        matchedPtr: row.ptr,
        confidence: 0.99,
        reason: `Exact Product Name Match: "${row.rawProductName}"`,
      };
    }

    // 3. Brand + Product Name check
    if (product.brand) {
      const normBrand = normalizeForMatch(product.brand);
      if (normRowName.includes(normBrand) && normRowName.includes(normProdName)) {
        if (!bestMatch || 0.95 > bestMatch.confidence) {
          bestMatch = {
            row,
            confidence: 0.95,
            reason: `Brand & Product Name Match: "${row.rawProductName}"`,
          };
        }
      }
    }

    // 4. Strength + Product Name check
    const rowAttr = extractAttributes(rawRowName);
    const hasMatchingStrength = prodAttr.strengths.length > 0 && prodAttr.strengths.some(s => rowAttr.strengths.includes(s));
    const hasConflictingStrength = prodAttr.strengths.length > 0 && rowAttr.strengths.length > 0 && !hasMatchingStrength;

    // Token & Bigram similarity
    const dice = diceCoefficient(prodName, rawRowName);
    let confidence = dice;

    // Check token subset (e.g. "Respigreat D15" in "Respigreat D15 Syrup")
    const prodWords = normProdName.split(' ').filter(w => w.length > 1);
    const rowWords = normRowName.split(' ').filter(w => w.length > 1);
    const allProdWordsInRow = prodWords.length > 0 && prodWords.every(w => rowWords.includes(w));
    const allRowWordsInProd = rowWords.length > 0 && rowWords.every(w => prodWords.includes(w));

    if (allProdWordsInRow || allRowWordsInProd) {
      confidence = Math.max(confidence, 0.90);
    }

    // Boost confidence if strength matches
    if (hasMatchingStrength) {
      confidence = Math.min(0.98, confidence + 0.15);
    } else if (hasConflictingStrength) {
      // Penalize heavily if dosage/strength conflicts (e.g. 500mg vs 250mg)
      confidence = Math.max(0.1, confidence - 0.40);
    }

    if (!bestMatch || confidence > bestMatch.confidence) {
      bestMatch = {
        row,
        confidence: Math.round(confidence * 100) / 100,
        reason: hasMatchingStrength
          ? `High similarity with matching strength (${prodAttr.strengths.join(', ')}): "${row.rawProductName}"`
          : `Fuzzy Name Match: "${row.rawProductName}" (${Math.round(confidence * 100)}% match)`,
      };
    }
  }

  // Match decision threshold
  if (bestMatch && bestMatch.confidence >= 0.85) {
    return {
      matched: true,
      excelRowId: bestMatch.row.id,
      matchedPtr: bestMatch.row.ptr,
      confidence: bestMatch.confidence,
      reason: bestMatch.reason,
    };
  } else if (bestMatch && bestMatch.confidence >= 0.60) {
    return {
      matched: false, // Requires user review
      excelRowId: bestMatch.row.id,
      matchedPtr: bestMatch.row.ptr,
      confidence: bestMatch.confidence,
      reason: `Possible Match (${Math.round(bestMatch.confidence * 100)}%): "${bestMatch.row.rawProductName}". Please confirm.`,
    };
  }

  return {
    matched: false,
    confidence: bestMatch ? bestMatch.confidence : 0,
    reason: 'PTR not found. No sufficiently matching product in imported Excel data.',
  };
}
