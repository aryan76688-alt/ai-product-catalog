import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { parseExcelOrCsv, extractMappedRows, ColumnMapping } from '@/lib/excel/importer';
import { matchProductWithExcelRows } from '@/lib/ai/productMatcher';
import { createFinalMarketingImage } from '@/lib/image/compositor';
import { StorageManager } from '@/lib/storage/manager';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const action = formData.get('action') as string; // 'preview' or 'import'
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No Excel or CSV file provided.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ACTION: PREVIEW
    if (action === 'preview') {
      const preview = await parseExcelOrCsv(buffer, file.name);
      return NextResponse.json({
        success: true,
        preview,
      });
    }

    // ACTION: IMPORT
    const mappingJson = formData.get('mapping') as string;
    if (!mappingJson) {
      return NextResponse.json({ error: 'Column mapping configuration is required.' }, { status: 400 });
    }

    const mapping: ColumnMapping = JSON.parse(mappingJson);
    const validRows = await extractMappedRows(buffer, file.name, mapping);

    if (validRows.length === 0) {
      return NextResponse.json({
        error: 'No valid rows found in the uploaded file using the provided column mapping.',
      }, { status: 400 });
    }

    // Create ExcelImport record
    const excelImport = await prisma.excelImport.create({
      data: {
        filename: file.name,
        totalRows: validRows.length,
        status: 'PROCESSING',
      },
    });

    // Batch insert ExcelRows
    await prisma.excelRow.createMany({
      data: validRows.map(r => ({
        importId: excelImport.id,
        rawProductName: r.rawProductName,
        normalizedName: r.normalizedName,
        ptr: r.ptr,
        sku: r.sku,
      })),
    });

    // Run auto-matching against existing products that need PTR
    const candidateRows = await prisma.excelRow.findMany({
      where: { importId: excelImport.id },
    });

    const productsNeedingPtr = await prisma.product.findMany({
      where: {
        OR: [
          { ptr: null },
          { matchStatus: 'UNMATCHED' },
          { matchStatus: 'NEEDS_REVIEW' },
        ],
      },
    });

    let matchedCount = 0;

    for (const prod of productsNeedingPtr) {
      const matchResult = matchProductWithExcelRows(
        {
          id: prod.id,
          productName: prod.productName,
          brand: prod.brand,
          sku: prod.sku,
        },
        candidateRows.map(r => ({
          id: r.id,
          rawProductName: r.rawProductName,
          normalizedName: r.normalizedName,
          ptr: r.ptr,
          sku: r.sku,
        }))
      );

      if (matchResult.matched && matchResult.matchedPtr !== undefined && matchResult.excelRowId) {
        matchedCount++;
        await prisma.product.update({
          where: { id: prod.id },
          data: {
            ptr: matchResult.matchedPtr,
            ptrSource: 'EXCEL',
            ptrConfidence: matchResult.confidence,
            matchStatus: 'MATCHED',
          },
        });

        await prisma.excelRow.update({
          where: { id: matchResult.excelRowId },
          data: { matchedProductId: prod.id },
        });

        // If product already has a clean image, update its final image with the new PTR
        if (prod.cleanImageUrl) {
          try {
            const cleanBuf = await StorageManager.getBuffer(prod.cleanImageUrl);
            const { finalJpg } = await createFinalMarketingImage(cleanBuf, {
              mrp: prod.mrp,
              ptr: matchResult.matchedPtr,
              expiry: prod.expiry,
              productName: prod.productName,
            });
            const finalUrl = await StorageManager.saveFinal(prod.id, finalJpg, '.jpg');
            await prisma.product.update({
              where: { id: prod.id },
              data: { finalImageUrl: finalUrl, imageStatus: 'FINALIZED' },
            });
          } catch (e) {
            console.warn(`Could not update final image for product ${prod.id}:`, e);
          }
        }
      } else if (matchResult.confidence >= 0.60) {
        await prisma.product.update({
          where: { id: prod.id },
          data: { matchStatus: 'NEEDS_REVIEW' },
        });
      }
    }

    await prisma.excelImport.update({
      where: { id: excelImport.id },
      data: {
        matchedRows: matchedCount,
        status: 'COMPLETED',
      },
    });

    return NextResponse.json({
      success: true,
      importId: excelImport.id,
      totalRows: validRows.length,
      matchedCount,
    });
  } catch (error: any) {
    console.error('Excel import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import Excel' },
      { status: 500 }
    );
  }
}
