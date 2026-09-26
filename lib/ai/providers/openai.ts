import OpenAI from 'openai';
import { AIProvider, OCRResult, ProductCandidate, ExcelRowCandidate, MatchResult, ChatParseResult } from '../types';
import { sanitizeOCRResult } from '../ocr';
import { matchProductWithExcelRows } from '../productMatcher';
import { parseChatWithRules } from '../chatParser';

export class OpenAIProvider implements AIProvider {
  name: 'openai' = 'openai';
  private client: OpenAI | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (key) {
      this.client = new OpenAI({ apiKey: key });
    }
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const key = process.env.OPENAI_API_KEY;
      if (!key) {
        throw new Error('OPENAI_API_KEY is not configured in environment variables.');
      }
      this.client = new OpenAI({ apiKey: key });
    }
    return this.client;
  }

  async analyzeImage(imageBuffer: Buffer, mimeType: string = 'image/jpeg'): Promise<OCRResult> {
    const client = this.getClient();
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const systemPrompt = `You are a specialized pharmaceutical and product packaging data extraction engine.
Analyze this product image carefully and extract visible data.
Strictly return ONLY a valid JSON object matching this schema:
{
  "productName": "string (as printed on packaging)",
  "brand": "string (brand or marketing name)",
  "mrp": number or null (e.g. 85.00),
  "expiry": "string or null in MM/YYYY format (e.g. 12/2026)",
  "batchNumber": "string (e.g. 241549)",
  "manufacturer": "string",
  "confidence": {
    "productName": number (0.0 to 1.0),
    "mrp": number (0.0 to 1.0),
    "expiry": number (0.0 to 1.0),
    "batchNumber": number (0.0 to 1.0)
  },
  "rawText": "string containing notable text visible on pack",
  "warnings": ["array of warning strings if any field is obscured or ambiguous"]
}

STRICT RULES:
1. Never hallucinate or invent data.
2. If MRP is not visible or unclear, set "mrp": null.
3. If Expiry is not visible or unclear, set "expiry": null.
4. Normalize expiry to MM/YYYY. Never guess a day. Do not infer expiry from MFG date.
5. Do NOT guess PTR. PTR is never on packaging.
6. Preserve exact medicine name, strength (e.g. 500mg, D15, 60ml), and dosage form.`;

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract product name, MRP, expiry date, batch number and confidence scores from this packaging.' },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI Vision API');
      }

      const parsed = JSON.parse(content);
      return sanitizeOCRResult(parsed);
    } catch (err: any) {
      console.error('OpenAI OCR Error:', err);
      // Fallback with informative error
      return sanitizeOCRResult({
        productName: '',
        mrp: null,
        expiry: null,
        confidence: { productName: 0, mrp: 0, expiry: 0, batchNumber: 0 },
        warnings: [`OpenAI vision analysis failed: ${err.message || 'API error'}`],
      });
    }
  }

  async matchProducts(product: ProductCandidate, candidates: ExcelRowCandidate[]): Promise<MatchResult> {
    // 1. First run deterministic matching
    const deterministic = matchProductWithExcelRows(product, candidates);
    if (deterministic.matched && deterministic.confidence >= 0.85) {
      return deterministic;
    }

    // 2. If candidates exist but confidence was borderline, ask OpenAI for semantic disambiguation
    if (candidates.length > 0 && deterministic.confidence >= 0.40) {
      try {
        const client = this.getClient();
        const topCandidates = candidates.slice(0, 15).map(c => ({
          id: c.id,
          name: c.rawProductName,
          ptr: c.ptr,
        }));

        const prompt = `Match this product against candidate Excel items:
Target Product: "${product.productName}", Brand: "${product.brand || 'N/A'}"
Candidates:
${JSON.stringify(topCandidates, null, 2)}

Return JSON:
{
  "matched": boolean,
  "excelRowId": "id of best matching row or null",
  "confidence": number between 0 and 1,
  "reason": "explanation of match or why none match"
}`;

        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const res = JSON.parse(content);
          if (res.matched && res.excelRowId) {
            const foundRow = candidates.find(c => c.id === res.excelRowId);
            return {
              matched: true,
              excelRowId: res.excelRowId,
              matchedPtr: foundRow ? foundRow.ptr : undefined,
              confidence: res.confidence || 0.88,
              reason: res.reason || 'AI Semantic Match',
            };
          }
        }
      } catch (err) {
        console.warn('OpenAI product matching fallback failed, using deterministic result:', err);
      }
    }

    return deterministic;
  }

  async parseChat(message: string, currentData?: Partial<ProductCandidate & { ptr?: number | null }>): Promise<ChatParseResult> {
    // 1. Try deterministic rule-based parser first
    const ruleResult = parseChatWithRules(message, currentData);
    if (ruleResult && ruleResult.confidence >= 0.8) {
      return ruleResult;
    }

    // 2. Fall back to OpenAI
    try {
      const client = this.getClient();
      const prompt = `You are a product data assistant. A user wants to update product information.
Current product data: ${JSON.stringify(currentData || {})}
User message: "${message}"

Parse what fields the user wants to update:
- mrp (numeric e.g. 85.00)
- ptr (numeric e.g. 13.50)
- expiry (normalized MM/YYYY e.g. 12/2026)
- productName (string if mentioned)

Return JSON:
{
  "mrp": number or null,
  "ptr": number or null,
  "expiry": "MM/YYYY" or null,
  "productName": string or null,
  "action": "update" or "clarify" or "unknown",
  "confidence": number (0 to 1),
  "explanation": "Human-friendly summary of detected fields"
}`;

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          mrp: parsed.mrp !== undefined && parsed.mrp !== null ? Number(parsed.mrp) : undefined,
          ptr: parsed.ptr !== undefined && parsed.ptr !== null ? Number(parsed.ptr) : undefined,
          expiry: parsed.expiry || undefined,
          productName: parsed.productName || undefined,
          action: parsed.action || 'update',
          confidence: parsed.confidence || 0.85,
          explanation: parsed.explanation || 'Processed chat update',
        };
      }
    } catch (err: any) {
      console.warn('OpenAI chat parse failed:', err);
    }

    return ruleResult || {
      action: 'unknown',
      confidence: 0,
      explanation: 'Could not understand instruction. Please specify MRP, PTR or Expiry (e.g., "MRP 85 PTR 13.50 Expiry 12/2026").',
    };
  }
}
