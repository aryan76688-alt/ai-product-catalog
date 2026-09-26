import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { createCleanProductImage } from '../lib/image/processor';
import { createFinalMarketingImage } from '../lib/image/compositor';
import { StorageManager } from '../lib/storage/manager';

const prisma = new PrismaClient();

async function createSyntheticMedicineBottle(
  name: string,
  sub: string,
  mrp: string,
  exp: string,
  bottleColor: string,
  capColor: string
): Promise<Buffer> {
  const svg = `
    <svg width="600" height="900" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bottleGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${bottleColor}"/>
          <stop offset="50%" stop-color="#ffffff" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="${bottleColor}"/>
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="10" stdDeviation="15" flood-opacity="0.15"/>
        </filter>
      </defs>
      <rect width="600" height="900" fill="#f8fafc"/>
      <!-- Shadow and Bottle Body -->
      <rect x="120" y="240" width="360" height="600" rx="40" fill="${bottleColor}" filter="url(#shadow)"/>
      <rect x="120" y="240" width="360" height="600" rx="40" fill="url(#bottleGrad)"/>
      <!-- Bottle Neck -->
      <rect x="220" y="150" width="160" height="90" rx="10" fill="${bottleColor}"/>
      <!-- Bottle Cap -->
      <rect x="200" y="90" width="200" height="80" rx="16" fill="${capColor}" stroke="#e2e8f0" stroke-width="2"/>
      <!-- Label -->
      <rect x="150" y="380" width="300" height="380" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="150" y="380" width="300" height="16" rx="4" fill="${capColor}"/>
      <text x="300" y="460" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#0f172a" text-anchor="middle">${name}</text>
      <text x="300" y="505" font-family="Arial, sans-serif" font-size="18" fill="#64748b" text-anchor="middle">${sub}</text>
      <line x1="180" y1="540" x2="420" y2="540" stroke="#e2e8f0" stroke-width="1.5"/>
      <text x="300" y="590" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#dc2626" text-anchor="middle">${mrp}</text>
      <text x="300" y="635" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="#059669" text-anchor="middle">${exp}</text>
      <text x="300" y="700" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Rx Only • For Pediatric Use</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();
}

async function main() {
  console.log('Seeding initial pharmaceutical products and images...');

  // Clear existing
  await prisma.auditLog.deleteMany();
  await prisma.processingJob.deleteMany();
  await prisma.excelRow.deleteMany();
  await prisma.excelImport.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();

  const seedProducts = [
    {
      srNo: 1,
      name: 'Respigreat D15 Syrup',
      brand: 'Respigreat',
      sku: 'RESP-D15',
      sub: '60 ml Suspension',
      mrp: 85.00,
      ptr: 13.50,
      expiry: '12/2026',
      batch: '241549',
      mrpConf: 0.98,
      expConf: 0.97,
      bottleColor: '#0f172a',
      capColor: '#0284c7',
      status: 'FINALIZED',
      matchStatus: 'MATCHED',
    },
    {
      srNo: 2,
      name: 'Amoxicillin 500mg Capsules',
      brand: 'Amoxil',
      sku: 'AMOX-500',
      sub: 'Pack of 10 Capsules',
      mrp: 120.00,
      ptr: 35.00,
      expiry: '06/2027',
      batch: 'AM9921',
      mrpConf: 0.96,
      expConf: 0.94,
      bottleColor: '#7c2d12',
      capColor: '#ea580c',
      status: 'FINALIZED',
      matchStatus: 'MATCHED',
    },
    {
      srNo: 3,
      name: 'Paracetamol 650mg Tablets',
      brand: 'DoloCare',
      sku: 'PARA-650',
      sub: 'Blister Pack 15 Tablets',
      mrp: 75.00,
      ptr: 22.50,
      expiry: '01/2028',
      batch: 'DL8812',
      mrpConf: 0.99,
      expConf: 0.98,
      bottleColor: '#1e3a8a',
      capColor: '#3b82f6',
      status: 'FINALIZED',
      matchStatus: 'MATCHED',
    },
    {
      srNo: 4,
      name: 'Azithromycin 500mg Tab',
      brand: 'AziSafe',
      sku: 'AZI-500',
      sub: '3 Tablets Strip',
      mrp: 140.00,
      ptr: 42.00,
      expiry: '09/2027',
      batch: 'AZ4430',
      mrpConf: 0.95,
      expConf: 0.93,
      bottleColor: '#14532d',
      capColor: '#10b981',
      status: 'FINALIZED',
      matchStatus: 'MATCHED',
    },
    {
      srNo: 5,
      name: 'Cetirizine 10mg Tablets',
      brand: 'Cetzine',
      sku: 'CET-10',
      sub: '10 Tablets Strip',
      mrp: 45.00,
      ptr: null, // Needs review!
      expiry: '03/2027',
      batch: 'CT1024',
      mrpConf: 0.92,
      expConf: 0.88,
      bottleColor: '#4c1d95',
      capColor: '#8b5cf6',
      status: 'NEEDS_REVIEW',
      matchStatus: 'UNMATCHED',
    },
    {
      srNo: 6,
      name: 'CoughNil DX Syrup',
      brand: 'CoughNil',
      sku: 'CN-DX',
      sub: '100 ml Bottle',
      mrp: null, // Missing MRP for review demonstration!
      ptr: 18.00,
      expiry: '11/2026',
      batch: 'CN9012',
      mrpConf: 0.45,
      expConf: 0.89,
      bottleColor: '#831843',
      capColor: '#ec4899',
      status: 'NEEDS_REVIEW',
      matchStatus: 'MATCHED',
    },
  ];

  for (const item of seedProducts) {
    const rawBuffer = await createSyntheticMedicineBottle(
      item.name,
      item.sub,
      item.mrp ? `MRP ₹${item.mrp.toFixed(2)}` : 'MRP [Unclear]',
      item.expiry ? `Exp: ${item.expiry}` : 'Exp: [Unclear]',
      item.bottleColor,
      item.capColor
    );

    const productId = `prod-${item.srNo}`;
    const origUrl = await StorageManager.saveOriginal(productId, rawBuffer, `${item.name}.jpg`);

    const { cleanJpg, cleanWebp } = await createCleanProductImage(rawBuffer, {
      canvasSize: 2000,
      productScale: 0.80,
    });
    const cleanUrl = await StorageManager.saveClean(productId, cleanJpg, '.jpg');
    await StorageManager.saveClean(productId, cleanWebp, '.webp');

    const { finalJpg, finalWebp } = await createFinalMarketingImage(cleanJpg, {
      mrp: item.mrp,
      ptr: item.ptr,
      expiry: item.expiry,
      productName: item.name,
      canvasSize: 2000,
    });
    const finalUrl = await StorageManager.saveFinal(productId, finalJpg, '.jpg');
    await StorageManager.saveFinal(productId, finalWebp, '.webp');

    const prod = await prisma.product.create({
      data: {
        id: productId,
        srNo: item.srNo,
        productName: item.name,
        brand: item.brand,
        sku: item.sku,
        mrp: item.mrp,
        ptr: item.ptr,
        expiry: item.expiry,
        batchNumber: item.batch,
        originalImageUrl: origUrl,
        cleanImageUrl: cleanUrl,
        finalImageUrl: finalUrl,
        imageStatus: item.status,
        ocrStatus: 'COMPLETED',
        matchStatus: item.matchStatus,
        mrpSource: item.mrp ? 'OCR' : null,
        ptrSource: item.ptr ? 'EXCEL' : null,
        expirySource: item.expiry ? 'OCR' : null,
        mrpConfidence: item.mrpConf,
        ptrConfidence: item.ptr ? 0.98 : null,
        expiryConfidence: item.expConf,
      },
    });

    await prisma.productImage.create({
      data: {
        productId: prod.id,
        originalUrl: origUrl,
        cleanUrl,
        finalUrl,
        status: item.status,
      },
    });

    // Create an initial audit log
    await prisma.auditLog.create({
      data: {
        productId: prod.id,
        fieldName: 'INITIAL_IMPORT',
        oldValue: null,
        newValue: 'Product catalog initialization',
        source: 'OCR',
      },
    });
  }

  // Also create a sample Excel Import record
  const excelImport = await prisma.excelImport.create({
    data: {
      filename: 'PTR_Master_Price_List_2026.xlsx',
      totalRows: 6,
      matchedRows: 5,
      status: 'COMPLETED',
    },
  });

  await prisma.excelRow.createMany({
    data: [
      { importId: excelImport.id, rawProductName: 'Respigreat D15 Syrup', normalizedName: 'respigreat d15 syrup', ptr: 13.50, sku: 'RESP-D15', matchedProductId: 'prod-1' },
      { importId: excelImport.id, rawProductName: 'Amoxicillin 500mg Capsules', normalizedName: 'amoxicillin 500mg capsules', ptr: 35.00, sku: 'AMOX-500', matchedProductId: 'prod-2' },
      { importId: excelImport.id, rawProductName: 'Paracetamol 650mg Tablets', normalizedName: 'paracetamol 650mg tablets', ptr: 22.50, sku: 'PARA-650', matchedProductId: 'prod-3' },
      { importId: excelImport.id, rawProductName: 'Azithromycin 500mg Tab', normalizedName: 'azithromycin 500mg tab', ptr: 42.00, sku: 'AZI-500', matchedProductId: 'prod-4' },
      { importId: excelImport.id, rawProductName: 'CoughNil DX Syrup', normalizedName: 'coughnil dx syrup', ptr: 18.00, sku: 'CN-DX', matchedProductId: 'prod-6' },
      { importId: excelImport.id, rawProductName: 'Cetirizine 10mg Tab', normalizedName: 'cetirizine 10mg tab', ptr: 4.50, sku: 'CET-10' },
    ],
  });

  console.log('✅ Seeding completed successfully with 6 realistic products and image assets!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
