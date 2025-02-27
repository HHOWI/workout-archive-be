import fs from "fs/promises";
import { Paths } from "../config/path";

export const setupImageCache = async () => {
  try {
    await fs.access(Paths.CACHE_DIR);
  } catch {
    await fs.mkdir(Paths.CACHE_DIR, { recursive: true });
  }
};
