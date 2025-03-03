import fs from "fs";
import path from "path";
import { CustomError } from "./customError";

// 이미지 삭제 유틸리티 함수
export const deleteImage = (imagePath: string): void => {
  const projectRoot = process.env.IMAGE_FILE_PATH as string;

  const fullPath = path.join(projectRoot, imagePath); // 환경변수와 결합하여 절대 경로 생성
  fs.unlink(fullPath, (err) => {
    if (err) {
      throw new CustomError(
        `이미지 삭제 실패: ${fullPath}`,
        500,
        "deleteImage"
      );
    } else {
      console.log(`이미지 삭제 성공: ${fullPath}`);
    }
  });
};
