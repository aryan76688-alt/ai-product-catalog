import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { StorageManager } from '@/lib/storage/manager';
import { globalWorker } from '@/lib/queue/worker';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const autoProcess = formData.get('autoProcess') === 'true' || formData.get('autoProcess') === null;

    if (!files || files.length === 0) {
      // Also check for single 'file' or 'image' field
      const singleFile = (formData.get('file') || formData.get('image')) as File | null;
      if (singleFile) {
        files.push(singleFile);
      } else {
        return NextResponse.json({ error: 'No image files provided' }, { status: 400 });
      }
    }

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const createdProducts = [];
    const jobIds = [];

    // Find latest srNo
    const lastProduct = await prisma.product.findFirst({
      orderBy: { srNo: 'desc' },
      select: { srNo: true },
    });
    let nextSrNo = (lastProduct?.srNo || 0) + 1;

    for (const file of files) {
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        continue;
      }

      const productId = crypto.randomUUID();
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Save original file
      const originalUrl = await StorageManager.saveOriginal(productId, buffer, file.name);

      // Infer an initial product name from file name without extension
      const fallbackName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_\-+]/g, ' ')
        .trim();

      const product = await prisma.product.create({
        data: {
          id: productId,
          srNo: nextSrNo++,
          productName: fallbackName || 'Processing Product...',
          originalImageUrl: originalUrl,
          imageStatus: 'UPLOADED',
          ocrStatus: 'PENDING',
          matchStatus: 'UNMATCHED',
        },
      });

      await prisma.productImage.create({
        data: {
          productId: product.id,
          originalUrl,
          status: 'UPLOADED',
        },
      });

      createdProducts.push(product);

      if (autoProcess) {
        const jobId = await globalWorker.enqueue(product.id);
        jobIds.push(jobId);
      }
    }

    return NextResponse.json({
      success: true,
      count: createdProducts.length,
      products: createdProducts,
      jobIds,
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload images' },
      { status: 500 }
    );
  }
}
