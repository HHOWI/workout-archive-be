import { z } from "zod";
import { CommonCursorPaginationSchema } from "./BaseSchema";

/**
 * 피드 조회 쿼리 스키마
 *
 * 피드 목록을 조회할 때 사용하는 쿼리 파라미터 검증 스키마입니다.
 * CommonCursorPaginationSchema를 상속받아 커서 기반 페이지네이션을 지원합니다.
 */
export const FeedQuerySchema = CommonCursorPaginationSchema;
