import { NextRequest, NextResponse } from 'next/server';
import { setRuntimeAIProvider, getAIProvider } from '@/lib/ai/factory';

export const dynamic = 'force-dynamic';

let runtimeProvider: 'openai' | 'gemini' = (process.env.AI_PROVIDER as any) === 'gemini' ? 'gemini' : 'openai';

export async function GET() {
  const openaiConfigured = !!process.env.OPENAI_API_KEY;
  const geminiConfigured = !!process.env.GEMINI_API_KEY;

  return NextResponse.json({
    success: true,
    settings: {
      aiProvider: runtimeProvider,
      openai: {
        configured: openaiConfigured,
        maskedKey: openaiConfigured ? `sk-...${process.env.OPENAI_API_KEY?.slice(-6)}` : null,
      },
      gemini: {
        configured: geminiConfigured,
        maskedKey: geminiConfigured ? `...${process.env.GEMINI_API_KEY?.slice(-6)}` : null,
      },
      storageProvider: process.env.STORAGE_PROVIDER || 'local',
      maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '25', 10),
      maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '500', 10),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { aiProvider } = body;

    if (aiProvider === 'openai' || aiProvider === 'gemini') {
      runtimeProvider = aiProvider;
      setRuntimeAIProvider(aiProvider);
      return NextResponse.json({
        success: true,
        aiProvider: runtimeProvider,
      });
    }

    return NextResponse.json({ error: 'Invalid provider. Must be "openai" or "gemini"' }, { status: 400 });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}
