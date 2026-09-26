import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getAIProvider } from '@/lib/ai/factory';
import { parseChatWithRules } from '@/lib/ai/chatParser';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, productId, provider } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let currentData = undefined;
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          productName: true,
          brand: true,
          mrp: true,
          ptr: true,
          expiry: true,
        },
      });
      if (product) {
        currentData = product;
      }
    }

    // Try fast rule parser first
    const ruleResult = parseChatWithRules(message, currentData);
    if (ruleResult && ruleResult.confidence >= 0.85) {
      return NextResponse.json({
        success: true,
        result: ruleResult,
        source: 'rules',
      });
    }

    // Fall back to AI provider
    const ai = getAIProvider(provider);
    const aiResult = await ai.parseChat(message, currentData);

    return NextResponse.json({
      success: true,
      result: aiResult,
      source: ai.name,
    });
  } catch (error: any) {
    console.error('Chat parse error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse chat message' },
      { status: 500 }
    );
  }
}
