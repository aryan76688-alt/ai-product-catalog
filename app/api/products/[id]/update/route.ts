import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { normalizeMrp, normalizeExpiry } from '@/lib/ai/ocr';
import { StorageManager } from '@/lib/storage/manager';
import { createFinalMarketingImage } from '@/lib/image/compositor';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { productName, mrp, ptr, expiry, batchNumber, brand, source = 'MANUAL' } = body;

    const existing = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updates: any = {};
    const auditEntries: any[] = [];

    // Helper to track field change
    const checkChange = (field: string, oldVal: any, newVal: any) => {
      if (newVal !== undefined && newVal !== oldVal) {
        updates[field] = newVal;
        auditEntries.push({
          productId: params.id,
          fieldName: field,
          oldValue: oldVal !== null && oldVal !== undefined ? String(oldVal) : null,
          newValue: newVal !== null && newVal !== undefined ? String(newVal) : null,
          source: source.toUpperCase(),
        });
      }
    };

    if (productName !== undefined && productName.trim() !== '') {
      checkChange('productName', existing.productName, productName.trim());
    }

    if (mrp !== undefined) {
      const normMrp = normalizeMrp(mrp);
      checkChange('mrp', existing.mrp, normMrp);
      if (normMrp !== null) {
        updates.mrpSource = source.toUpperCase();
        updates.mrpConfidence = 1.0;
      }
    }

    if (ptr !== undefined) {
      const normPtr = normalizeMrp(ptr);
      checkChange('ptr', existing.ptr, normPtr);
      if (normPtr !== null) {
        updates.ptrSource = source.toUpperCase();
        updates.ptrConfidence = 1.0;
        updates.matchStatus = 'MANUAL';
      }
    }

    if (expiry !== undefined) {
      const normExp = normalizeExpiry(expiry);
      checkChange('expiry', existing.expiry, normExp);
      if (normExp !== null) {
        updates.expirySource = source.toUpperCase();
        updates.expiryConfidence = 1.0;
      }
    }

    if (batchNumber !== undefined) {
      checkChange('batchNumber', existing.batchNumber, batchNumber.trim());
    }

    if (brand !== undefined) {
      checkChange('brand', existing.brand, brand.trim());
    }

    // Save audit logs
    if (auditEntries.length > 0) {
      await prisma.auditLog.createMany({
        data: auditEntries,
      });
    }

    // Update product record
    const updated = await prisma.product.update({
      where: { id: params.id },
      data: updates,
    });

    // If clean image exists, update final marketing image with new data
    if (updated.cleanImageUrl) {
      try {
        const cleanBuffer = await StorageManager.getBuffer(updated.cleanImageUrl);
        const { finalJpg } = await createFinalMarketingImage(cleanBuffer, {
          mrp: updated.mrp,
          ptr: updated.ptr,
          expiry: updated.expiry,
          productName: updated.productName,
        });
        const finalUrl = await StorageManager.saveFinal(updated.id, finalJpg, '.jpg');
        await prisma.product.update({
          where: { id: updated.id },
          data: { finalImageUrl: finalUrl, imageStatus: 'FINALIZED' },
        });
        updated.finalImageUrl = finalUrl;
      } catch (err) {
        console.warn('Could not re-composite final image after update:', err);
      }
    }

    return NextResponse.json({
      success: true,
      product: updated,
      changedFields: auditEntries.map(a => a.fieldName),
    });
  } catch (error: any) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}
