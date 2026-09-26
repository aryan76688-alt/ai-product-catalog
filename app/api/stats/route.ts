import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      totalProducts,
      processed,
      missingPtr,
      missingMrp,
      missingExpiry,
      failedImages,
      excelMatches,
      recentAuditLogs,
      recentProducts,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({
        where: {
          imageStatus: 'FINALIZED',
          mrp: { not: null },
          ptr: { not: null },
          expiry: { not: null },
        },
      }),
      prisma.product.count({ where: { ptr: null } }),
      prisma.product.count({ where: { mrp: null } }),
      prisma.product.count({ where: { expiry: null } }),
      prisma.product.count({ where: { imageStatus: 'FAILED' } }),
      prisma.excelRow.count({ where: { matchedProductId: { not: null } } }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              productName: true,
            },
          },
        },
      }),
      prisma.product.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          srNo: true,
          productName: true,
          mrp: true,
          ptr: true,
          expiry: true,
          cleanImageUrl: true,
          finalImageUrl: true,
          originalImageUrl: true,
          imageStatus: true,
          matchStatus: true,
        },
      }),
    ]);

    // Needs review: items with missing values, low confidence, or unverified matches
    const needsReview = await prisma.product.count({
      where: {
        OR: [
          { ptr: null },
          { mrp: null },
          { expiry: null },
          { matchStatus: 'NEEDS_REVIEW' },
          { mrpConfidence: { lt: 0.7 } },
          { expiryConfidence: { lt: 0.7 } },
        ],
      },
    });

    const completionRate = totalProducts > 0 ? Math.round((processed / totalProducts) * 100) : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts,
        processed,
        needsReview,
        missingPtr,
        missingMrp,
        missingExpiry,
        failedImages,
        excelMatches,
        completionRate,
      },
      recentAuditLogs,
      recentProducts,
    });
  } catch (error: any) {
    console.error('Fetch stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
