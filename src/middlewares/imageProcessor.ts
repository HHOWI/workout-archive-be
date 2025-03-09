import { Request, Response, NextFunction } from "express";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { Paths } from "../config/path";

interface ImageQueryParams {
  width?: string;
  height?: string;
  quality?: string;
  format?: "jpeg" | "webp" | "png";
}

export const processImage = async (
  req: Request<{}, {}, {}, ImageQueryParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    // 이미지 경로가 /uploads/로 시작하는 경우에만 처리
    if (!req.path.startsWith("/uploads/")) {
      return next();
    }

    // 요청 경로에 따라 적절한 업로드 경로 결정
    let basePath;
    let urlPath = req.path.slice(9); // '/uploads/' 제거 후 경로

    if (req.path.startsWith("/uploads/profiles/")) {
      basePath = Paths.PROFILE_UPLOAD_PATH;
      urlPath = urlPath.slice(9); // 'profiles/' 제거
    } else if (req.path.startsWith("/uploads/posts/")) {
      basePath = Paths.POST_UPLOAD_PATH;
      urlPath = urlPath.slice(6); // 'posts/' 제거
    } else {
      // 기본 경로 (하위 호환성 유지)
      basePath = Paths.PROFILE_UPLOAD_PATH;
    }

    const imagePath = path.join(basePath, urlPath);

    // 원본 이미지 존재 여부 확인
    try {
      await fs.access(imagePath);
    } catch {
      return next();
    }

    // 쿼리 파라미터 파싱
    const width = parseInt(req.query.width || "0");
    const height = parseInt(req.query.height || "0");
    const quality = parseInt(req.query.quality || "80");
    const format = req.query.format || "jpeg";

    // 캐시 디렉토리 확인 및 생성
    try {
      await fs.access(Paths.CACHE_DIR);
    } catch {
      await fs.mkdir(Paths.CACHE_DIR, { recursive: true });
    }

    // 캐시 키 생성
    const cacheKey = `${req.path}-w${width}-h${height}-q${quality}-f${format}`;
    const cachePath = path.join(Paths.CACHE_DIR, cacheKey.replace(/\//g, "_"));

    // 캐시된 이미지가 있는지 확인
    try {
      await fs.access(cachePath);
      // 캐시된 이미지가 있으면 바로 응답
      return res.sendFile(cachePath);
    } catch {
      // 캐시된 이미지가 없으면 처리 진행
    }

    // 이미지 처리 파이프라인 구성
    let pipeline = sharp(imagePath);

    // 리사이징 필요한 경우
    if (width > 0 || height > 0) {
      pipeline = pipeline.resize(width || null, height || null, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // 포맷 변환
    switch (format) {
      case "webp":
        pipeline = pipeline.webp({ quality });
        break;
      case "png":
        pipeline = pipeline.png({ quality: quality / 100 });
        break;
      default:
        pipeline = pipeline.jpeg({ quality });
    }

    // 이미지 처리 및 캐시 저장
    await pipeline.toFile(cachePath);

    // 처리된 이미지 응답
    res.sendFile(cachePath);
  } catch (error) {
    next(error);
  }
};
