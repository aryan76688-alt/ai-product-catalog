import { normalizeExpiry, normalizeMrp, formatCurrency, sanitizeOCRResult } from '../lib/ai/ocr';
import { parseChatWithRules } from '../lib/ai/chatParser';
import { matchProductWithExcelRows, diceCoefficient } from '../lib/ai/productMatcher';
import { createCleanProductImage } from '../lib/image/processor';
import { createFinalMarketingImage } from '../lib/image/compositor';
import { generateProductCatalogExcel } from '../lib/excel/exporter';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING AI PRODUCT CATALOG VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(desc: string, condition: boolean, detail?: any) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
      if (detail) console.error('   Detail:', detail);
    }
  }

  // ----------------------------------------------------
  // TEST 1: Expiry Normalization
  // ----------------------------------------------------
  console.log('\n--- 1. Testing Expiry Normalization ---');
  assert('12/26 -> 12/2026', normalizeExpiry('12/26') === '12/2026');
  assert('01-2027 -> 01/2027', normalizeExpiry('01-2027') === '01/2027');
  assert('EXP 12/2026 -> 12/2026', normalizeExpiry('EXP 12/2026') === '12/2026');
  assert('Expiry: 12/2026 -> 12/2026', normalizeExpiry('Expiry: 12/2026') === '12/2026');
  assert('Dec 2026 -> 12/2026', normalizeExpiry('Dec 2026') === '12/2026');
  assert('December 2026 -> 12/2026', normalizeExpiry('December 2026') === '12/2026');
  assert('Invalid month (13/2026) -> null', normalizeExpiry('13/2026') === null);

  // ----------------------------------------------------
  // TEST 2: MRP Normalization
  // ----------------------------------------------------
  console.log('\n--- 2. Testing MRP Normalization ---');
  assert('₹85 -> 85.00', normalizeMrp('₹85') === 85.00);
  assert('85 -> 85.00', normalizeMrp('85') === 85.00);
  assert('MRP 85 -> 85.00', normalizeMrp('MRP 85') === 85.00);
  assert('MRP Rs. 85.00 -> 85.00', normalizeMrp('MRP Rs. 85.00') === 85.00);
  assert('M.R.P. Rs. 85/- -> 85.00', normalizeMrp('M.R.P. Rs. 85/-') === 85.00);
  assert('Display format: formatCurrency(85) === "₹85.00"', formatCurrency(85) === '₹85.00');

  // ----------------------------------------------------
  // TEST 3: Chat Parser
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Conversational Chat Parser ---');
  const chat1 = parseChatWithRules('MRP 85 PTR 13.50 Expiry 12/2026');
  assert('Chat shorthand 1 parses MRP, PTR, Expiry',
    chat1?.mrp === 85.00 && chat1?.ptr === 13.50 && chat1?.expiry === '12/2026', chat1);

  const chat2 = parseChatWithRules('85, 13.50, 12/2026');
  assert('Comma shorthand parses correctly',
    chat2?.mrp === 85.00 && chat2?.ptr === 13.50 && chat2?.expiry === '12/2026', chat2);

  const chat3 = parseChatWithRules('mrp 85\nptr 13.50\nexpiry 12/2026');
  assert('Multiline chat parses correctly',
    chat3?.mrp === 85.00 && chat3?.ptr === 13.50 && chat3?.expiry === '12/2026', chat3);

  const chat4 = parseChatWithRules('Change PTR to 14');
  assert('Incremental update: Change PTR to 14',
    chat4?.ptr === 14.00, chat4);

  const chat5 = parseChatWithRules('MRP is wrong, change it to 90');
  assert('Natural language: MRP is wrong, change it to 90',
    chat5?.mrp === 90.00, chat5);

  const chat6 = parseChatWithRules('Expiry December 2026');
  assert('Update expiry: Expiry December 2026',
    chat6?.expiry === '12/2026', chat6);

  // ----------------------------------------------------
  // TEST 4: Product Matching Engine
  // ----------------------------------------------------
  console.log('\n--- 4. Testing Multi-Tier Product Matcher ---');
  const candidates = [
    { id: 'row-1', rawProductName: 'Respigreat D15 Syrup', normalizedName: 'respigreat d15 syrup', ptr: 13.50, sku: 'RESP-01' },
    { id: 'row-2', rawProductName: 'Paracetamol 650mg Tab', normalizedName: 'paracetamol 650mg tab', ptr: 8.50, sku: 'PARA-02' },
  ];

  const matchExactSku = matchProductWithExcelRows(
    { productName: 'Unknown Name', sku: 'RESP-01' },
    candidates
  );
  assert('Exact SKU matching returns 1.0 confidence',
    matchExactSku.matched && matchExactSku.matchedPtr === 13.50 && matchExactSku.confidence === 1.0, matchExactSku);

  const matchFuzzy = matchProductWithExcelRows(
    { productName: 'Respigreat D15' },
    candidates
  );
  assert('Fuzzy matching matches Respigreat D15 with Respigreat D15 Syrup',
    matchFuzzy.matched && matchFuzzy.matchedPtr === 13.50 && matchFuzzy.confidence >= 0.85, matchFuzzy);

  // ----------------------------------------------------
  // TEST 5: Deterministic Image Processing (Sharp)
  // ----------------------------------------------------
  console.log('\n--- 5. Testing Deterministic Image Processing Pipeline ---');
  // Create a synthetic sample product image for testing
  const testSvg = `
    <svg width="400" height="700" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="700" fill="#f1f5f9"/>
      <!-- Medicine bottle -->
      <rect x="80" y="150" width="240" height="480" rx="30" fill="#1e293b"/>
      <!-- Bottle neck & cap -->
      <rect x="140" y="70" width="120" height="80" rx="10" fill="#0284c7"/>
      <!-- Label -->
      <rect x="100" y="260" width="200" height="300" rx="8" fill="#ffffff"/>
      <text x="200" y="320" font-family="Arial" font-size="22" font-weight="bold" fill="#0f172a" text-anchor="middle">Respigreat D15</text>
      <text x="200" y="360" font-family="Arial" font-size="16" fill="#64748b" text-anchor="middle">Syrup 60ml</text>
      <text x="200" y="420" font-family="Arial" font-size="16" font-weight="bold" fill="#dc2626" text-anchor="middle">MRP ₹85.00</text>
      <text x="200" y="460" font-family="Arial" font-size="14" fill="#059669" text-anchor="middle">Exp: 12/2026</text>
    </svg>
  `;
  const rawSampleBuffer = await sharp(Buffer.from(testSvg)).jpeg().toBuffer();

  // Test Stage A: Clean Product Image
  const cleanResult = await createCleanProductImage(rawSampleBuffer, {
    canvasSize: 1000,
    productScale: 0.80,
  });
  assert('Stage A generates 1:1 square canvas (1000x1000)',
    cleanResult.width === 1000 && cleanResult.height === 1000);
  assert('Stage A generates both JPEG and WebP buffers',
    cleanResult.cleanJpg.length > 0 && cleanResult.cleanWebp.length > 0);

  // Test Stage B: Final Marketing Image
  const finalResult = await createFinalMarketingImage(cleanResult.cleanJpg, {
    mrp: 85.00,
    ptr: 13.50,
    expiry: '12/2026',
    productName: 'Respigreat D15',
    canvasSize: 1000,
  });
  assert('Stage B generates final catalog canvas with bottom panel',
    finalResult.width === 1000 && finalResult.height === 1000 && finalResult.finalJpg.length > 0);

  // ----------------------------------------------------
  // TEST 6: Excel Export with Embedded Images
  // ----------------------------------------------------
  console.log('\n--- 6. Testing Excel Export with Real Embedded Images ---');
  // Save test clean image to temp path for exporter to read
  const testImgPath = path.join(process.cwd(), 'uploads', 'clean', 'test-sample-clean.jpg');
  fs.mkdirSync(path.dirname(testImgPath), { recursive: true });
  fs.writeFileSync(testImgPath, cleanResult.cleanJpg);

  const excelProducts = [
    {
      id: 'test-1',
      srNo: 1,
      productName: 'Respigreat D15 Syrup',
      mrp: 85.00,
      ptr: 13.50,
      expiry: '12/2026',
      cleanImageUrl: '/api/files/clean/test-sample-clean.jpg',
    },
  ];

  const excelBuffer = await generateProductCatalogExcel(excelProducts, { mode: 'clean' });
  assert('Excel catalog generated as valid non-empty buffer',
    excelBuffer.length > 5000);

  // Write sample to disk for inspection
  const outExcelPath = path.join(process.cwd(), 'uploads', 'test_catalog_output.xlsx');
  fs.writeFileSync(outExcelPath, excelBuffer);
  assert('Excel workbook written to disk successfully',
    fs.existsSync(outExcelPath));

  console.log('\n====================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} / ${total} PASSED`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
