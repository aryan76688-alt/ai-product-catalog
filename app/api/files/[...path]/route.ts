import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePathSegments = params.path;
    const baseDir = process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'uploads');
    const safePath = path.normalize(path.join(baseDir, ...filePathSegments));

    // Security check against directory traversal
    if (!safePath.startsWith(path.resolve(baseDir))) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (!fs.existsSync(safePath)) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(safePath);
    const ext = path.extname(safePath).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.svg') contentType = 'image/svg+xml';

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
