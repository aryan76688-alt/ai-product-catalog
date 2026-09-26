import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { normalizeMrp } from '../ai/ocr';
import { normalizeForMatch } from '../ai/productMatcher';

export interface ColumnMapping {
  productNameColumn: string;
  ptrColumn: string;
  skuColumn?: string;
}

export interface ExcelPreview {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  suggestedMapping: ColumnMapping;
}

export interface ImportedRowData {
  rawProductName: string;
  normalizedName: string;
  ptr: number;
  sku?: string;
}

/**
 * Automatically identifies likely columns from header names.
 */
export function detectColumns(headers: string[]): ColumnMapping {
  const normHeaders = headers.map(h => ({
    original: h,
    clean: h.toLowerCase().replace(/[^a-z0-9]/g, ''),
  }));

  // Detect Product Name
  const nameCandidates = ['productname', 'product', 'itemname', 'item', 'medicinename', 'medicine', 'description', 'particulars'];
  const foundName = normHeaders.find(h => nameCandidates.some(c => h.clean.includes(c))) || normHeaders[0];

  // Detect PTR
  const ptrCandidates = ['ptr', 'rate', 'purchaserate', 'netrate', 'cost', 'purrate', 'trade', 'prate'];
  const foundPtr = normHeaders.find(h => ptrCandidates.some(c => h.clean.includes(c))) || (normHeaders.length > 1 ? normHeaders[1] : null);

  // Detect SKU
  const skuCandidates = ['sku', 'code', 'itemcode', 'productcode', 'barcode', 'id'];
  const foundSku = normHeaders.find(h => skuCandidates.some(c => h.clean.includes(c)));

  return {
    productNameColumn: foundName ? foundName.original : '',
    ptrColumn: foundPtr ? foundPtr.original : '',
    skuColumn: foundSku ? foundSku.original : undefined,
  };
}

/**
 * Parses raw file buffer (Excel or CSV) and extracts headers and sample preview rows.
 */
export async function parseExcelOrCsv(
  fileBuffer: Buffer,
  filename: string
): Promise<ExcelPreview> {
  const ext = filename.split('.').pop()?.toLowerCase();
  let headers: string[] = [];
  let rows: Record<string, any>[] = [];

  if (ext === 'csv') {
    const text = fileBuffer.toString('utf-8');
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });
    headers = parsed.meta.fields || [];
    rows = (parsed.data as Record<string, any>[]).slice(0, 100);
  } else {
    // xlsx or xls
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Excel workbook contains no worksheets.');
    }

    const firstRow = worksheet.getRow(1);
    firstRow.eachCell((cell, colNumber) => {
      headers.push(String(cell.value || `Column ${colNumber}`).trim());
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // header
      if (rows.length >= 100) return; // preview cap
      const rowData: Record<string, any> = {};
      let hasData = false;

      headers.forEach((header, index) => {
        const cell = row.getCell(index + 1);
        let val = cell.value;
        if (val && typeof val === 'object' && 'result' in val) {
          val = (val as any).result; // formula result
        }
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          hasData = true;
        }
        rowData[header] = val ?? '';
      });

      if (hasData) {
        rows.push(rowData);
      }
    });
  }

  const suggestedMapping = detectColumns(headers);

  return {
    headers,
    rows,
    totalRows: rows.length,
    suggestedMapping,
  };
}

/**
 * Reads all rows from file using the user-approved column mapping and validates records.
 */
export async function extractMappedRows(
  fileBuffer: Buffer,
  filename: string,
  mapping: ColumnMapping
): Promise<ImportedRowData[]> {
  const ext = filename.split('.').pop()?.toLowerCase();
  const validRows: ImportedRowData[] = [];

  const processRow = (rawName: any, rawPtr: any, rawSku?: any) => {
    const name = String(rawName || '').trim();
    const ptr = normalizeMrp(rawPtr);
    if (!name || ptr === null) return;

    validRows.push({
      rawProductName: name,
      normalizedName: normalizeForMatch(name),
      ptr,
      sku: rawSku ? String(rawSku).trim() : undefined,
    });
  };

  if (ext === 'csv') {
    const text = fileBuffer.toString('utf-8');
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    for (const row of parsed.data as Record<string, any>[]) {
      processRow(row[mapping.productNameColumn], row[mapping.ptrColumn], mapping.skuColumn ? row[mapping.skuColumn] : undefined);
    }
  } else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    let nameColIndex = -1;
    let ptrColIndex = -1;
    let skuColIndex = -1;

    const firstRow = worksheet.getRow(1);
    firstRow.eachCell((cell, colNumber) => {
      const val = String(cell.value || '').trim();
      if (val === mapping.productNameColumn) nameColIndex = colNumber;
      if (val === mapping.ptrColumn) ptrColIndex = colNumber;
      if (mapping.skuColumn && val === mapping.skuColumn) skuColIndex = colNumber;
    });

    if (nameColIndex === -1 || ptrColIndex === -1) {
      throw new Error('Mapped columns could not be found in worksheet.');
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rawName = row.getCell(nameColIndex).value;
      const rawPtr = row.getCell(ptrColIndex).value;
      const rawSku = skuColIndex > 0 ? row.getCell(skuColIndex).value : undefined;
      processRow(rawName, rawPtr, rawSku);
    });
  }

  return validRows;
}
