import fs from "fs/promises";
import { Paths } from "../config/path";

/**
 * 이미지 캐시 및 업로드 디렉터리 설정 유틸리티 (간결화, 로그 최소화 버전)
 */
export const setupImageCache = async () => {
  try {
    // 캐시 디렉터리 생성 시도 (이미 존재하면 아무 작업 안 함)
    await fs.mkdir(Paths.CACHE_DIR, { recursive: true });

    // 업로드 디렉터리 생성 시도 (이미 존재하면 아무 작업 안 함)
    for (const dirPath of [Paths.PROFILE_UPLOAD_PATH, Paths.POST_UPLOAD_PATH]) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  } catch (error) {
    console.error("이미지 디렉터리 설정 중 오류 발생:", error);
    // 오류가 발생해도 서버 시작을 막지 않도록 처리 (필요에 따라 throw 가능)
  }
};
