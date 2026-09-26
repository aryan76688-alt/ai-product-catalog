import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { generateProductCatalogExcel, ExportMode } from '@/lib/excel/exporter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode: ExportMode = body.mode === 'marketing' ? 'marketing' : 'clean';
    const includeIncomplete = body.includeIncomplete === true;
    const productIds: string[] | undefined = Array.isArray(body.productIds) ? body.productIds : undefined;

    const where: any = {};
    if (productIds && productIds.length > 0) {
      where.id = { in: productIds };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ srNo: 'asc' }, { createdAt: 'desc' }],
    });

    if (products.length === 0) {
      return NextResponse.json({ error: 'No products available for export' }, { status: 400 });
    }

    // Quality control check
    const incompleteProducts = products.filter(
      p => !p.productName || p.mrp === null || p.ptr === null || !p.expiry
    );

    if (incompleteProducts.length > 0 && !includeIncomplete && body.checkOnly) {
      return NextResponse.json({
        canExport: false,
        incompleteCount: incompleteProducts.length,
        totalCount: products.length,
        message: `${incompleteProducts.length} products require review before export. Check "Export incomplete products" to proceed anyway.`,
      });
    }

    const excelBuffer = await generateProductCatalogExcel(
      products.map(p => ({
        id: p.id,
        srNo: p.srNo,
        productName: p.productName,
        mrp: p.mrp,
        ptr: p.ptr,
        expiry: p.expiry,
        cleanImageUrl: p.cleanImageUrl,
        finalImageUrl: p.finalImageUrl,
        originalImageUrl: p.originalImageUrl,
      })),
      {
        mode,
        includeIncomplete,
      }
    );

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Product_Catalog_${mode === 'marketing' ? 'Marketing' : 'Clean'}_${timestamp}.xlsx`;

    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Excel export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export Excel catalog' },
      { status: 500 }
    );
  }
}
