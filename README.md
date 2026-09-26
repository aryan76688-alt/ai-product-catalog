# AI Product Catalog & Image Data Updater

A production-ready pharmaceutical and retail catalog management web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, **Sharp**, **ExcelJS**, and a swappable AI vision abstraction layer (**OpenAI** & **Google Gemini**).

---

## Key Features

1. **Multi-Image Drag & Drop Upload**: Upload 1 to 500+ raw pharmaceutical photos (JPG, PNG, WebP) with asynchronous queue processing.
2. **AI Vision Packaging OCR**:
   - Detects Product Name, MRP, Expiry date, Batch number, Brand, and Manufacturer.
   - Strict JSON validation with zero hallucination (returns `null` when values are unclear).
   - Normalized MRP (e.g. `₹85.00`) and Expiry (`MM/YYYY`).
   - Confidence scoring: High (>90%), Medium (70–90%), Low (<70%).
3. **Excel PTR Import & Auto-Matcher**:
   - Imports `.xlsx`, `.xls`, `.csv` with auto-detected columns (`Product Name`, `PTR`, `SKU`).
   - Interactive column mapping screen with live data preview.
   - Multi-tier matching engine: exact SKU, normalized product name, brand + name, strength/dosage (e.g. D15, 60ml, 500mg), and fuzzy Dice-coefficient matching.
4. **Product Data Assistant (Chat Interface)**:
   - Natural language and shorthand updates: `MRP 85 PTR 13.50 Expiry 12/2026`, `Change PTR to 14.00`, etc.
   - Confirmation action cards with `[Apply Changes]`, `[Edit]`, and `[Cancel]`.
   - Never overwrites database values without explicit user confirmation.
   - Comprehensive audit log trail tracking every field change and source.
5. **Deterministic Image Studio (No Generative Hallucination)**:
   - Compliance-safe: medicine labels, packaging text, colors, and logos are physically preserved without generative regeneration.
   - **Stage A (Clean Product Image)**: EXIF auto-rotation, object isolation on pure white (#FFFFFF) 1:1 canvas, product centered at 75–85% canvas height, lighting and sharpness tuning.
   - **Stage B (Final Marketing Image)**: Composites professional bottom information panel with red MRP (`₹85.00`), blue PTR (`₹13.50`), and green Expiry (`12/2026`).
6. **Excel Catalog Exporter**:
   - Real product images embedded directly into **Column F** using ExcelJS.
   - Strict column order:
     `Sr No.` | `Product Name` | `MRP` | `PTR` | `Expiry` | `Products Images`
   - Two export modes:
     - **Export Mode A**: Clean Product Image (default, clean canvas without text overlay).
     - **Export Mode B**: Final Marketing Image (with bottom info panel).
7. **Quality Control & Review Queue**:
   - "Review All Before Export" table preventing incomplete rows from exporting unless explicitly overridden.

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Next.js Web Browser                  │
│       Dashboard, Upload, Review Queue, Image Studio    │
└───────────────────────────┬────────────────────────────┘
                            │ REST API / Server Actions
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Node.js / Next.js Server              │
│       - AI Provider Layer (OpenAI & Gemini)            │
│       - Deterministic Sharp Image Studio               │
│       - ExcelJS Importer & Image Embedder Exporter     │
│       - Background Concurrency Worker Queue            │
└──────────────┬────────────────────────────┬────────────┘
               │                            │
               ▼                            ▼
┌────────────────────────────┐ ┌─────────────────────────┐
│     PostgreSQL / SQLite    │ │  Persistent Storage     │
│   Products, Audit Logs,    │ │  original/, clean/,     │
│   Excel Rows, Jobs         │ │  final/                 │
└────────────────────────────┘ └─────────────────────────┘
```

---

## 1. Installation

### Prerequisites
- **Node.js**: v18.17.0 or later (v20+ recommended)
- **npm** or **pnpm** or **yarn**

```bash
# Clone the repository
git clone <your-repo-url>
cd excel

# Install dependencies
npm install
```

---

## 2. Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your credentials:

```ini
# AI Provider Selection: 'openai' or 'gemini'
AI_PROVIDER=openai

# OpenAI API Key
OPENAI_API_KEY=sk-proj-...

# Google Gemini API Key
GEMINI_API_KEY=your-gemini-api-key

# Database URL:
# For local zero-config development:
DATABASE_URL="file:./dev.db"

# For production / Railway PostgreSQL:
# DATABASE_URL="postgresql://postgres:password@host:port/database"

# Image Storage:
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=./uploads

MAX_UPLOAD_SIZE_MB=25
MAX_BATCH_SIZE=500
NODE_ENV=development
```

---

## 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Push database schema
npm run prisma:push
```

For production PostgreSQL databases on Railway or Supabase:
```bash
npx prisma db push --schema=./prisma/schema.postgresql.prisma
```

---

## 4. Local Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. AI API Configuration

The application features a pluggable AI provider architecture:

- `lib/ai/providers/openai.ts`: Uses OpenAI GPT-4o / GPT-4o-mini with structured JSON output.
- `lib/ai/providers/gemini.ts`: Uses Gemini 2.5 Flash via `@google/genai` with multimodal inputs.

Switch providers at any time either in `.env`:
```ini
AI_PROVIDER=openai
# or
AI_PROVIDER=gemini
```
Or dynamically toggle the provider inside the web UI at **Settings** (`/settings`).

---

## 6. Excel Import & Export

### Importing PTR Data
1. Navigate to **Import Excel** (`/import`).
2. Upload any `.xlsx`, `.xls`, or `.csv` price list.
3. Review the auto-detected columns (`Product Name`, `PTR`, `SKU`) and preview table.
4. Click **Confirm & Match with Products**. The system matches PTR pricing with existing product photos.

### Exporting Final Catalog
1. Navigate to **Export** (`/export`).
2. Quality Control verifies that all products have Name, MRP, PTR, Expiry, and Clean Image.
3. Choose your export format:
   - **Export Mode A (Default)**: Clean Product Image without text overlays.
   - **Export Mode B**: Marketing Image with bottom info bar.
4. Click **Download Excel Catalog**.
5. The downloaded `.xlsx` workbook will have the real images embedded directly into **Column F**, with automatic row heights and centered cell alignments.

---

## 7. Railway Deployment

This project is pre-configured for one-click deployment on **Railway**.

### Files included:
- `railway.toml`: Build and deployment configurations with health checks.
- `Dockerfile`: Multi-stage Docker build with native `vips` libraries for Sharp.
- `prisma/schema.postgresql.prisma`: PostgreSQL production schema.

### Deploy Steps:
1. Connect your GitHub repository to Railway.
2. In Railway, add a **PostgreSQL** database service.
3. Connect the PostgreSQL service to your app service (`DATABASE_URL` will be automatically provided).
4. Add your environment variables in the Railway Dashboard:
   - `OPENAI_API_KEY`
   - `GEMINI_API_KEY`
   - `AI_PROVIDER`
5. Railway will automatically build the Dockerfile and launch the application.

---

## 8. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `Sharp missing vips` | Platform-specific native binary | The included `Dockerfile` installs `vips` via Alpine packages. On local machines, run `npm install sharp`. |
| `Excel images overlap` | Cell dimension mismatch | Ensure row height is set to `115pt` and column width to `28` (handled automatically by `lib/excel/exporter.ts`). |
| `Low OCR confidence` | Packaging photo blurred or glare | Open **Review Queue**, click **Chat Assistant**, and type `MRP <val> Expiry <MM/YYYY>` to correct. |
| `PTR not found` | Product name variant | Check **Review Queue**; the system flags partial matches (>60%) for one-click confirmation. |

---

## 9. Production Security

- **Zero Secret Leakage**: `OPENAI_API_KEY`, `GEMINI_API_KEY`, and `DATABASE_URL` are strictly server-side environment variables. No client-exposed `NEXT_PUBLIC_*` prefixes are used for secret keys.
- **Path Traversal Protection**: The image file serving route (`/api/files/[...path]`) validates paths against base directory roots to prevent directory traversal.
- **Deterministic Product Integrity**: No generative hallucinations. Product labels and dosages cannot be altered by image generation models.
