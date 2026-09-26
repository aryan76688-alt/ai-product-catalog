import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { StorageManager } from '@/lib/storage/manager';
import { createCleanProductImage } from '@/lib/image/processor';
import { createFinalMarketingImage } from '@/lib/image/compositor';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const { canvasSize = 2000, productScale = 0.80, brightness = 1.02, contrast = 1.0, quality = 92 } = body;

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const originalBuffer = await StorageManager.getBuffer(product.originalImageUrl);

    // Stage A: Clean Product Image
    const { cleanJpg, cleanWebp } = await createCleanProductImage(originalBuffer, {
      canvasSize,
      productScale,
      brightness,
      contrast,
      quality,
    });

    const cleanUrl = await StorageManager.saveClean(product.id, cleanJpg, '.jpg');
    await StorageManager.saveClean(product.id, cleanWebp, '.webp');

    // Stage B: Final Marketing Image
    const { finalJpg, finalWebp } = await createFinalMarketingImage(cleanJpg, {
      mrp: product.mrp,
      ptr: product.ptr,
      expiry: product.expiry,
      productName: product.productName,
      canvasSize,
      quality,
    });

    const finalUrl = await StorageManager.saveFinal(product.id, finalJpg, '.jpg');
    await StorageManager.saveFinal(product.id, finalWebp, '.webp');

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        cleanImageUrl: cleanUrl,
        finalImageUrl: finalUrl,
        imageStatus: 'FINALIZED',
      },
    });

    return NextResponse.json({
      success: true,
      product: updated,
      cleanImageUrl: cleanUrl,
      finalImageUrl: finalUrl,
    });
  } catch (error: any) {
    console.error('Image processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process product images' },
      { status: 500 }
    );
  }
}
