import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { globalWorker } from '@/lib/queue/worker';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [recentJobs, pendingCount, processingCount, completedCount, failedCount, totalProducts] = await Promise.all([
      prisma.processingJob.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              productName: true,
              originalImageUrl: true,
            },
          },
        },
      }),
      prisma.processingJob.count({ where: { status: 'PENDING' } }),
      prisma.processingJob.count({ where: { status: 'PROCESSING' } }),
      prisma.processingJob.count({ where: { status: 'COMPLETED' } }),
      prisma.processingJob.count({ where: { status: 'FAILED' } }),
      prisma.product.count(),
    ]);

    const activeCount = pendingCount + processingCount;
    const totalJobs = pendingCount + processingCount + completedCount + failedCount;
    const percentage = totalJobs > 0 ? Math.round((completedCount / totalJobs) * 100) : 100;

    return NextResponse.json({
      success: true,
      activeCount,
      pendingCount,
      processingCount,
      completedCount,
      failedCount,
      totalProducts,
      percentage,
      isBusy: activeCount > 0,
      recentJobs,
    });
  } catch (error: any) {
    console.error('Fetch jobs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { productIds, all } = body;

    let targetIds: string[] = [];

    if (all) {
      // Find all products that haven't been finalized
      const products = await prisma.product.findMany({
        where: {
          OR: [
            { imageStatus: { not: 'FINALIZED' } },
            { ocrStatus: { not: 'COMPLETED' } },
          ],
        },
        select: { id: true },
      });
      targetIds = products.map(p => p.id);
    } else if (Array.isArray(productIds) && productIds.length > 0) {
      targetIds = productIds;
    } else {
      return NextResponse.json({ error: 'No product IDs provided' }, { status: 400 });
    }

    const jobIds = await globalWorker.enqueueBatch(targetIds);

    return NextResponse.json({
      success: true,
      enqueuedCount: targetIds.length,
      jobIds,
    });
  } catch (error: any) {
    console.error('Enqueue batch jobs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start batch jobs' },
      { status: 500 }
    );
  }
}
