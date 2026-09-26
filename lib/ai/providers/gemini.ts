import { GoogleGenAI, Type } from '@google/genai';
import { AIProvider, OCRResult, ProductCandidate, ExcelRowCandidate, MatchResult, ChatParseResult } from '../types';
import { sanitizeOCRResult } from '../ocr';
import { matchProductWithExcelRows } from '../productMatcher';
import { parseChatWithRules } from '../chatParser';

export class GeminiProvider implements AIProvider {
  name: 'gemini' = 'gemini';
  private aiClient: GoogleGenAI | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: key });
      } catch (e) {
        console.warn('Could not initialize GoogleGenAI client:', e);
      }
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.aiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error('GEMINI_API_KEY is not configured in environment variables.');
      }
      this.aiClient = new GoogleGenAI({ apiKey: key });
    }
    return this.aiClient;
  }

  async analyzeImage(imageBuffer: Buffer, mimeType: string = 'image/jpeg'): Promise<OCRResult> {
    const base64Data = imageBuffer.toString('base64');
    const prompt = `You are a pharmaceutical and product packaging data extraction engine.
Analyze this product image carefully and extract visible text.
Never invent or hallucinate data. If MRP or Expiry is not visible or clear, set them to null.
Normalize expiry to MM/YYYY.
Do NOT guess PTR (PTR is never on packaging).
Preserve exact medicine name, strength (e.g., 500mg, D15, 60ml), and dosage form.`;

    try {
      const client = this.getClient();
      // Use gemini-2.5-flash or gemini-1.5-flash
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              brand: { type: Type.STRING },
              mrp: { type: Type.NUMBER },
              expiry: { type: Type.STRING },
              batchNumber: { type: Type.STRING },
              manufacturer: { type: Type.STRING },
              confidence: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.NUMBER },
                  mrp: { type: Type.NUMBER },
                  expiry: { type: Type.NUMBER },
                  batchNumber: { type: Type.NUMBER },
                },
              },
              rawText: { type: Type.STRING },
              warnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from Gemini Vision API');
      }

      const parsed = JSON.parse(responseText);
      return sanitizeOCRResult(parsed);
    } catch (err: any) {
      console.error('Gemini OCR Error:', err);
      // Fallback with informative error
      return sanitizeOCRResult({
        productName: '',
        mrp: null,
        expiry: null,
        confidence: { productName: 0, mrp: 0, expiry: 0, batchNumber: 0 },
        warnings: [`Gemini vision analysis failed: ${err.message || 'API error'}`],
      });
    }
  }

  async matchProducts(product: ProductCandidate, candidates: ExcelRowCandidate[]): Promise<MatchResult> {
    // 1. Run deterministic matching
    const deterministic = matchProductWithExcelRows(product, candidates);
    if (deterministic.matched && deterministic.confidence >= 0.85) {
      return deterministic;
    }

    // 2. If borderline, ask Gemini
    if (candidates.length > 0 && deterministic.confidence >= 0.40) {
      try {
        const client = this.getClient();
        const topCandidates = candidates.slice(0, 15).map(c => ({
          id: c.id,
          name: c.rawProductName,
          ptr: c.ptr,
        }));

        const prompt = `Match this uploaded product against candidate Excel items:
Target Product: "${product.productName}", Brand: "${product.brand || 'N/A'}"
Candidates:
${JSON.stringify(topCandidates, null, 2)}`;

        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                matched: { type: Type.BOOLEAN },
                excelRowId: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                reason: { type: Type.STRING },
              },
            },
          },
        });

        if (response.text) {
          const res = JSON.parse(response.text);
          if (res.matched && res.excelRowId) {
            const found = candidates.find(c => c.id === res.excelRowId);
            return {
              matched: true,
              excelRowId: res.excelRowId,
              matchedPtr: found ? found.ptr : undefined,
              confidence: res.confidence || 0.88,
              reason: res.reason || 'Gemini Semantic Match',
            };
          }
        }
      } catch (err) {
        console.warn('Gemini product matching fallback failed:', err);
      }
    }

    return deterministic;
  }

  async parseChat(message: string, currentData?: Partial<ProductCandidate & { ptr?: number | null }>): Promise<ChatParseResult> {
    // 1. Try deterministic rules
    const ruleResult = parseChatWithRules(message, currentData);
    if (ruleResult && ruleResult.confidence >= 0.8) {
      return ruleResult;
    }

    // 2. Fall back to Gemini
    try {
      const client = this.getClient();
      const prompt = `Parse what fields the user wants to update for this product:
Current: ${JSON.stringify(currentData || {})}
Message: "${message}"`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mrp: { type: Type.NUMBER },
              ptr: { type: Type.NUMBER },
              expiry: { type: Type.STRING },
              productName: { type: Type.STRING },
              action: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              explanation: { type: Type.STRING },
            },
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return {
          mrp: parsed.mrp !== undefined && parsed.mrp !== null ? Number(parsed.mrp) : undefined,
          ptr: parsed.ptr !== undefined && parsed.ptr !== null ? Number(parsed.ptr) : undefined,
          expiry: parsed.expiry || undefined,
          productName: parsed.productName || undefined,
          action: (parsed.action as any) || 'update',
          confidence: parsed.confidence || 0.85,
          explanation: parsed.explanation || 'Processed chat update',
        };
      }
    } catch (err) {
      console.warn('Gemini chat parse failed:', err);
    }

    return ruleResult || {
      action: 'unknown',
      confidence: 0,
      explanation: 'Could not understand instruction. Please specify MRP, PTR or Expiry (e.g., "MRP 85 PTR 13.50 Expiry 12/2026").',
    };
  }
}
