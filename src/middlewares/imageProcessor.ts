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
    // 경로 시작 검사 제거 (미들웨어가 이미 /uploads에 등록되어 있음)

    // 쿼리 파라미터가 없으면 다음 미들웨어(express.static)로 요청 전달
    const hasQueryParams =
      req.query.width ||
      req.query.height ||
      req.query.quality ||
      req.query.format;

    if (!hasQueryParams) {
      return next();
    }

    // 요청 경로에 따라 적절한 업로드 경로 결정
    let basePath;
    let urlPath = req.path; // 전체 경로 사용

    if (req.path.startsWith("/profiles/")) {
      basePath = Paths.PROFILE_UPLOAD_PATH;
      urlPath = req.path.slice(10); // '/profiles/' 제거
    } else if (req.path.startsWith("/posts/")) {
      basePath = Paths.POST_UPLOAD_PATH;
      urlPath = req.path.slice(7); // '/posts/' 제거
    } else {
      // 기본 경로 (하위 호환성 유지 또는 다른 처리 필요)
      // 이 경우는 일반적으로 발생하지 않아야 함 (/uploads/ 하위 경로가 아니면 static 미들웨어가 처리)
      console.warn(`처리할 수 없는 이미지 경로 요청: ${req.path}`);
      return next(); // 알 수 없는 경로는 처리하지 않고 넘김
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

    try {
      // 이미지 처리 및 캐시 저장
      await pipeline.toFile(cachePath);

      // 처리된 이미지 응답
      res.setHeader("Content-Type", `image/${format}`);
      res.setHeader("X-Image-Processed", "true");
      return res.sendFile(cachePath);
    } catch (err) {
      console.error("이미지 처리 중 오류 발생:", err);
      console.error(`원본 이미지 경로: ${imagePath}, 캐시 경로: ${cachePath}`);
      console.error(
        `요청 크기: ${width}x${height}, 포맷: ${format}, 품질: ${quality}`
      );

      // 실패 시 원본 파일로 대체하여 응답
      return next();
    }
  } catch (error) {
    console.error("이미지 프로세서 전체 오류:", error);
    return next(error);
  }
};
