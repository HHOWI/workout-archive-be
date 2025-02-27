import path from "path";
import dotenv from "dotenv";

dotenv.config();

export const Paths = {
  PROFILE_UPLOAD_PATH: path.resolve(
    __dirname,
    "..",
    "..",
    process.env.PROFILE_UPLOAD_PATH || "uploads/profiles"
  ),
  POST_UPLOAD_PATH: path.resolve(
    __dirname,
    "..",
    "..",
    process.env.POST_UPLOAD_PATH || "uploads/posts"
  ),
  CACHE_DIR: path.resolve(__dirname, "..", "..", "cache"),
} as const;
