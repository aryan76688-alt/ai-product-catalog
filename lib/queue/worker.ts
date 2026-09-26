import { prisma } from '../db/client';
import { StorageManager } from '../storage/manager';
import { getAIProvider } from '../ai/factory';
import { matchProductWithExcelRows } from '../ai/productMatcher';
import { createCleanProductImage } from '../image/processor';
import { createFinalMarketingImage } from '../image/compositor';

interface QueueItem {
  jobId: string;
  productId: string;
}

class QueueWorker {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private activeConcurrency = 0;
  private maxConcurrency = 2; // Prevents API rate limits

  public async enqueue(productId: string): Promise<string> {
    const job = await prisma.processingJob.create({
      data: {
        productId,
        jobType: 'BATCH_FULL',
        status: 'PENDING',
        progress: 0,
      },
    });

    this.queue.push({ jobId: job.id, productId });
    this.processNext();
    return job.id;
  }

  public async enqueueBatch(productIds: string[]): Promise<string[]> {
    const jobIds: string[] = [];
    for (const pid of productIds) {
      const jobId = await this.enqueue(pid);
      jobIds.push(jobId);
    }
    return jobIds;
  }

  private async processNext() {
    if (this.activeConcurrency >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeConcurrency++;
    this.runJob(item)
      .catch((err) => {
        console.error(`Error processing job ${item.jobId}:`, err);
      })
      .finally(() => {
        this.activeConcurrency--;
        this.processNext();
      });
  }

  private async runJob(item: QueueItem) {
    const { jobId, productId } = item;

    try {
      await prisma.processingJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING', progress: 10 },
      });

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Step 1: Read Original Image Buffer
      const originalBuffer = await StorageManager.getBuffer(product.originalImageUrl);

      // Step 2: AI OCR / Vision Analysis
      await prisma.processingJob.update({
        where: { id: jobId },
        data: { progress: 30, metadata: 'Running AI Vision OCR...' },
      });

      const ai = getAIProvider();
      const ocrResult = await ai.analyzeImage(originalBuffer);

      // Update product with OCR values
      const ocrUpdates: any = {
        ocrStatus: 'COMPLETED',
        rawOcrText: ocrResult.rawText,
      };

      if (ocrResult.productName) {
        ocrUpdates.productName = ocrResult.productName;
      }
      if (ocrResult.brand) {
        ocrUpdates.brand = ocrResult.brand;
      }
      if (ocrResult.batchNumber) {
        ocrUpdates.batchNumber = ocrResult.batchNumber;
      }
      if (ocrResult.manufacturer) {
        ocrUpdates.manufacturer = ocrResult.manufacturer;
      }
      if (ocrResult.mrp !== null && ocrResult.mrp > 0) {
        ocrUpdates.mrp = ocrResult.mrp;
        ocrUpdates.mrpSource = 'OCR';
        ocrUpdates.mrpConfidence = ocrResult.confidence.mrp;
      }
      if (ocrResult.expiry) {
        ocrUpdates.expiry = ocrResult.expiry;
        ocrUpdates.expirySource = 'OCR';
        ocrUpdates.expiryConfidence = ocrResult.confidence.expiry;
      }

      await prisma.product.update({
        where: { id: productId },
        data: ocrUpdates,
      });

      // Step 3: Match PTR from Excel
      await prisma.processingJob.update({
        where: { id: jobId },
        data: { progress: 55, metadata: 'Matching PTR from Excel data...' },
      });

      const excelRows = await prisma.excelRow.findMany({
        where: { matchedProductId: null },
      });

      if (excelRows.length > 0) {
        const matchResult = matchProductWithExcelRows(
          {
            id: productId,
            productName: ocrUpdates.productName || product.productName,
            brand: ocrUpdates.brand || product.brand,
            sku: product.sku,
          },
          excelRows.map(r => ({
            id: r.id,
            rawProductName: r.rawProductName,
            normalizedName: r.normalizedName,
            ptr: r.ptr,
            sku: r.sku,
          }))
        );

        if (matchResult.matched && matchResult.matchedPtr !== undefined && matchResult.excelRowId) {
          await prisma.product.update({
            where: { id: productId },
            data: {
              ptr: matchResult.matchedPtr,
              ptrSource: 'EXCEL',
              ptrConfidence: matchResult.confidence,
              matchStatus: 'MATCHED',
            },
          });

          await prisma.excelRow.update({
            where: { id: matchResult.excelRowId },
            data: { matchedProductId: productId },
          });
        } else if (matchResult.confidence >= 0.60) {
          await prisma.product.update({
            where: { id: productId },
            data: { matchStatus: 'NEEDS_REVIEW' },
          });
        }
      }

      // Step 4: Deterministic Image Processing (Stage A: Clean Image)
      await prisma.processingJob.update({
        where: { id: jobId },
        data: { progress: 75, metadata: 'Generating clean 1:1 image...' },
      });

      const { cleanJpg } = await createCleanProductImage(originalBuffer, {
        canvasSize: 2000,
        productScale: 0.80,
      });

      const cleanUrl = await StorageManager.saveClean(productId, cleanJpg, '.jpg');

      // Step 5: Stage B: Final Marketing Image
      await prisma.processingJob.update({
        where: { id: jobId },
        data: { progress: 90, metadata: 'Compositing final marketing image...' },
      });

      const updatedProduct = await prisma.product.findUnique({ where: { id: productId } });
      const { finalJpg } = await createFinalMarketingImage(cleanJpg, {
        mrp: updatedProduct?.mrp,
        ptr: updatedProduct?.ptr,
        expiry: updatedProduct?.expiry,
        productName: updatedProduct?.productName,
      });

      const finalUrl = await StorageManager.saveFinal(productId, finalJpg, '.jpg');

      await prisma.product.update({
        where: { id: productId },
        data: {
          cleanImageUrl: cleanUrl,
          finalImageUrl: finalUrl,
          imageStatus: 'FINALIZED',
        },
      });

      // Update Job Completed
      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          completedAt: new Date(),
          metadata: 'Completed successfully',
        },
      });
    } catch (err: any) {
      console.error(`Failed job ${jobId} for product ${productId}:`, err);
      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: err.message || 'Unknown processing error',
        },
      });
      await prisma.product.update({
        where: { id: productId },
        data: { imageStatus: 'FAILED' },
      });
    }
  }
}

export const globalWorker = new QueueWorker();
