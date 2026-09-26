import fs from 'fs';
import path from 'path';

const BASE_STORAGE_DIR = process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'uploads');
const DIRS = {
  original: path.join(BASE_STORAGE_DIR, 'original'),
  clean: path.join(BASE_STORAGE_DIR, 'clean'),
  final: path.join(BASE_STORAGE_DIR, 'final'),
  temp: path.join(BASE_STORAGE_DIR, 'temp'),
};

// Ensure storage directories exist
Object.values(DIRS).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export class StorageManager {
  static getDir(type: 'original' | 'clean' | 'final' | 'temp'): string {
    return DIRS[type];
  }

  static getAbsolutePath(relativePath: string): string {
    const cleanPath = relativePath.replace(/^\/api\/files\//, '').replace(/^\/+/, '');
    return path.join(BASE_STORAGE_DIR, cleanPath);
  }

  static async saveOriginal(productId: string, buffer: Buffer, originalFilename: string): Promise<string> {
    const ext = path.extname(originalFilename).toLowerCase() || '.jpg';
    const filename = `${productId}-original${ext}`;
    const targetPath = path.join(DIRS.original, filename);

    // Never overwrite original
    if (fs.existsSync(targetPath)) {
      const timestamp = Date.now();
      const uniqueFilename = `${productId}-original-${timestamp}${ext}`;
      const uniquePath = path.join(DIRS.original, uniqueFilename);
      await fs.promises.writeFile(uniquePath, buffer);
      return `/api/files/original/${uniqueFilename}`;
    }

    await fs.promises.writeFile(targetPath, buffer);
    return `/api/files/original/${filename}`;
  }

  static async saveClean(productId: string, buffer: Buffer, ext: string = '.jpg'): Promise<string> {
    const filename = `${productId}-clean${ext}`;
    const targetPath = path.join(DIRS.clean, filename);
    await fs.promises.writeFile(targetPath, buffer);
    return `/api/files/clean/${filename}`;
  }

  static async saveFinal(productId: string, buffer: Buffer, ext: string = '.jpg'): Promise<string> {
    const filename = `${productId}-final${ext}`;
    const targetPath = path.join(DIRS.final, filename);
    await fs.promises.writeFile(targetPath, buffer);
    return `/api/files/final/${filename}`;
  }

  static async getBuffer(fileUrlOrRelativePath: string): Promise<Buffer> {
    const absPath = this.getAbsolutePath(fileUrlOrRelativePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found at path: ${absPath}`);
    }
    return fs.promises.readFile(absPath);
  }

  static exists(fileUrlOrRelativePath: string): boolean {
    const absPath = this.getAbsolutePath(fileUrlOrRelativePath);
    return fs.existsSync(absPath);
  }
}
