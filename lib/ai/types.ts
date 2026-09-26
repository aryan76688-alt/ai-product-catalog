export interface ConfidenceScores {
  productName: number;
  mrp: number;
  expiry: number;
  batchNumber: number;
}

export interface OCRResult {
  productName: string;
  brand: string;
  mrp: number | null;
  expiry: string | null; // Strict MM/YYYY format
  batchNumber: string;
  manufacturer: string;
  confidence: ConfidenceScores;
  rawText: string;
  warnings: string[];
}

export interface ProductCandidate {
  id?: string;
  productName: string;
  brand?: string | null;
  sku?: string | null;
  mrp?: number | null;
  expiry?: string | null;
}

export interface ExcelRowCandidate {
  id: string;
  rawProductName: string;
  normalizedName: string;
  ptr: number;
  sku?: string | null;
}

export interface MatchResult {
  matched: boolean;
  excelRowId?: string;
  confidence: number;
  matchedPtr?: number;
  reason: string;
}

export interface ChatParseResult {
  mrp?: number | null;
  ptr?: number | null;
  expiry?: string | null;
  productName?: string;
  action: 'update' | 'clarify' | 'unknown';
  confidence: number;
  explanation: string;
  rawDetected?: {
    mrp?: string;
    ptr?: string;
    expiry?: string;
  };
}

export interface AIProvider {
  name: 'openai' | 'gemini';
  analyzeImage(imageBuffer: Buffer, mimeType?: string): Promise<OCRResult>;
  matchProducts(product: ProductCandidate, candidates: ExcelRowCandidate[]): Promise<MatchResult>;
  parseChat(message: string, currentData?: Partial<ProductCandidate & { ptr?: number | null }>): Promise<ChatParseResult>;
}
