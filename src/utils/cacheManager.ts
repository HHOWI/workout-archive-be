import fs from "fs/promises";
import path from "path";
import { Paths } from "../config/path";

export class CacheManager {
  private static readonly CACHE_DIR = Paths.CACHE_DIR;
  private static readonly MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7일

  static async cleanOldCache() {
    try {
      const files = await fs.readdir(this.CACHE_DIR);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.CACHE_DIR, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > this.MAX_CACHE_AGE) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error("Cache cleanup error:", error);
    }
  }

  static async clearCache() {
    try {
      const files = await fs.readdir(this.CACHE_DIR);
      await Promise.all(
        files.map((file) => fs.unlink(path.join(this.CACHE_DIR, file)))
      );
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  }
}
