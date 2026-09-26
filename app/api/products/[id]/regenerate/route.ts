import { NextRequest, NextResponse } from 'next/server';
import { globalWorker } from '@/lib/queue/worker';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = await globalWorker.enqueue(params.id);
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Product pipeline regeneration scheduled',
    });
  } catch (error: any) {
    console.error('Regenerate error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger regeneration' },
      { status: 500 }
    );
  }
}
