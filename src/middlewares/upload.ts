import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { Paths } from "../config/path";

// 업로드 디렉토리 생성 함수
const createUploadDir = async () => {
  try {
    await fs.access(Paths.PROFILE_UPLOAD_PATH);
  } catch {
    await fs.mkdir(Paths.PROFILE_UPLOAD_PATH, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await createUploadDir();
    cb(null, Paths.PROFILE_UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("이미지 파일만 업로드 가능합니다."));
    }
  },
});
