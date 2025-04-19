import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { Paths } from "../config/path";

// 업로드 디렉토리 생성 함수
const createUploadDir = async (uploadPath: string) => {
  await fs.mkdir(uploadPath, { recursive: true });
};

// 공통 multer 설정
const createStorage = (uploadPath: string) =>
  multer.diskStorage({
    destination: async (req, file, cb) => {
      await createUploadDir(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `file-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });

const multerOptions = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (
    req: any,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("이미지 파일만 업로드 가능합니다."));
    }
  },
};

// 프로필 업로드용
export const uploadProfile = multer({
  storage: createStorage(Paths.PROFILE_UPLOAD_PATH),
  ...multerOptions,
});

// 게시물 업로드용
export const uploadPost = multer({
  storage: createStorage(Paths.POST_UPLOAD_PATH),
  ...multerOptions,
});
