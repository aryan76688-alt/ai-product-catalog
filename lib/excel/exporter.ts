import ExcelJS from 'exceljs';
import { StorageManager } from '../storage/manager';
import fs from 'fs';

export interface ExportProductItem {
  id: string;
  srNo?: number | null;
  productName: string;
  mrp?: number | null;
  ptr?: number | null;
  expiry?: string | null;
  cleanImageUrl?: string | null;
  finalImageUrl?: string | null;
  originalImageUrl?: string | null;
}

export type ExportMode = 'clean' | 'marketing';

export interface ExportOptions {
  mode: ExportMode; // 'clean' (default) or 'marketing'
  includeIncomplete?: boolean;
}

export async function generateProductCatalogExcel(
  products: ExportProductItem[],
  options: ExportOptions = { mode: 'clean' }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI Product Catalog';
  workbook.lastModifiedBy = 'AI Product Catalog';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Product Catalog', {
    views: [{ showGridLines: true }],
  });

  // Strict Column Order as specified:
  // 1. Sr No.
  // 2. Product Name
  // 3. MRP
  // 4. PTR
  // 5. Expiry
  // 6. Products Images
  worksheet.columns = [
    { header: 'Sr No.', key: 'srNo', width: 10 },
    { header: 'Product Name', key: 'productName', width: 36 },
    { header: 'MRP', key: 'mrp', width: 16 },
    { header: 'PTR', key: 'ptr', width: 16 },
    { header: 'Expiry', key: 'expiry', width: 16 },
    { header: 'Products Images', key: 'image', width: 28 },
  ];

  // Header row styling
  const headerRow = worksheet.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // Professional Navy
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  // Filter products if not including incomplete
  const filteredProducts = options.includeIncomplete
    ? products
    : products.filter(p => p.productName && p.mrp && p.ptr && p.expiry);

  // Process rows
  for (let i = 0; i < filteredProducts.length; i++) {
    const item = filteredProducts[i];
    const rowNumber = i + 2; // Row 1 is header
    const row = worksheet.getRow(rowNumber);
    row.height = 115; // Set row height to ~150px equivalent for high-res thumbnail

    // Values
    row.getCell(1).value = item.srNo || i + 1;
    row.getCell(2).value = item.productName || 'Unnamed Product';
    row.getCell(3).value = item.mrp !== null && item.mrp !== undefined ? Number(item.mrp) : '';
    row.getCell(4).value = item.ptr !== null && item.ptr !== undefined ? Number(item.ptr) : '';
    row.getCell(5).value = item.expiry || '';
    row.getCell(6).value = ''; // Cell for image

    // Alignments and styles
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

    // Format numbers
    if (item.mrp) {
      row.getCell(3).numFmt = '₹#,##0.00;[Red]₹#,##0.00';
    }
    if (item.ptr) {
      row.getCell(4).numFmt = '₹#,##0.00;[Red]₹#,##0.00';
    }

    // Border styling for each data cell
    for (let c = 1; c <= 6; c++) {
      row.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      row.getCell(c).font = { name: 'Arial', size: 10 };
    }

    // Embed real product image in Column F (Index 5 in 0-based col index)
    // Select image URL based on export mode:
    // Export A (clean, default): Clean image (no text overlay)
    // Export B (marketing): Final image (with bottom panel)
    const targetImageUrl = options.mode === 'marketing'
      ? (item.finalImageUrl || item.cleanImageUrl || item.originalImageUrl)
      : (item.cleanImageUrl || item.originalImageUrl);

    if (targetImageUrl) {
      try {
        let imgBuffer: Buffer | null = null;
        if (StorageManager.exists(targetImageUrl)) {
          imgBuffer = await StorageManager.getBuffer(targetImageUrl);
        } else if (targetImageUrl.startsWith('http://') || targetImageUrl.startsWith('https://')) {
          // If remote url
          const res = await fetch(targetImageUrl);
          if (res.ok) {
            const arrBuffer = await res.arrayBuffer();
            imgBuffer = Buffer.from(arrBuffer);
          }
        }

        if (imgBuffer && imgBuffer.length > 0) {
          const imageId = workbook.addImage({
            buffer: imgBuffer as any,
            extension: 'jpeg',
          });

          // Embed in Column F (col 5 in zero-based indexing)
          // Width: ~140px, Height: ~140px, perfectly centered in row
          worksheet.addImage(imageId, {
            tl: { col: 5.12, row: rowNumber - 1 + 0.08 },
            ext: { width: 135, height: 135 },
            editAs: 'oneCell',
          });
        }
      } catch (imgErr) {
        console.warn(`Failed to embed image for product ${item.id}:`, imgErr);
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
