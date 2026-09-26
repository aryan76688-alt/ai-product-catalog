import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { StorageManager } from '@/lib/storage/manager';
import { getAIProvider } from '@/lib/ai/factory';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, provider } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const originalBuffer = await StorageManager.getBuffer(product.originalImageUrl);
    const ai = getAIProvider(provider);
    const ocrResult = await ai.analyzeImage(originalBuffer);

    // Update product
    const updateData: any = {
      ocrStatus: 'COMPLETED',
      rawOcrText: ocrResult.rawText,
    };

    if (ocrResult.productName) updateData.productName = ocrResult.productName;
    if (ocrResult.brand) updateData.brand = ocrResult.brand;
    if (ocrResult.batchNumber) updateData.batchNumber = ocrResult.batchNumber;
    if (ocrResult.manufacturer) updateData.manufacturer = ocrResult.manufacturer;
    if (ocrResult.mrp !== null && ocrResult.mrp > 0) {
      updateData.mrp = ocrResult.mrp;
      updateData.mrpSource = 'OCR';
      updateData.mrpConfidence = ocrResult.confidence.mrp;
    }
    if (ocrResult.expiry) {
      updateData.expiry = ocrResult.expiry;
      updateData.expirySource = 'OCR';
      updateData.expiryConfidence = ocrResult.confidence.expiry;
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      product: updated,
      ocrResult,
    });
  } catch (error: any) {
    console.error('AI analyze error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze product image' },
      { status: 500 }
    );
  }
}
