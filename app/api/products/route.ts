import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const filter = searchParams.get('filter') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Search query
    if (search) {
      where.OR = [
        { productName: { contains: search } },
        { brand: { contains: search } },
        { sku: { contains: search } },
        { batchNumber: { contains: search } },
      ];
    }

    // Filter categories
    switch (filter) {
      case 'ready':
        where.AND = [
          { mrp: { not: null } },
          { ptr: { not: null } },
          { expiry: { not: null } },
          { cleanImageUrl: { not: null } },
        ];
        break;
      case 'needs_review':
        where.OR = [
          { matchStatus: 'NEEDS_REVIEW' },
          { mrpConfidence: { lt: 0.7 } },
          { expiryConfidence: { lt: 0.7 } },
          { mrp: null },
          { ptr: null },
          { expiry: null },
        ];
        break;
      case 'missing_ptr':
        where.ptr = null;
        break;
      case 'missing_mrp':
        where.mrp = null;
        break;
      case 'missing_expiry':
        where.expiry = null;
        break;
      case 'failed':
        where.OR = [
          { imageStatus: 'FAILED' },
          { ocrStatus: 'FAILED' },
        ];
        break;
      case 'all':
      default:
        break;
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: [{ srNo: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (error: any) {
    console.error('Fetch products error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
