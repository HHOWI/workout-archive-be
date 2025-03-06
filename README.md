# Workout Archive Backend

## 오류 처리 패턴

이 프로젝트는 다음과 같은 일관된 오류 처리 패턴을 사용합니다:

### 1. CustomError

모든 비즈니스 로직 오류는 `CustomError` 클래스를 통해 발생시킵니다:

```typescript
throw new CustomError(
  "오류 메시지", // 사용자에게 전달될 메시지
  statusCode, // HTTP 상태 코드 (기본값: 500)
  "오류 위치" // 로깅을 위한 오류 위치 정보
);
```

### 2. ErrorDecorator

서비스 메서드에는 `@ErrorDecorator` 데코레이터를 사용하여 오류 처리를 표준화합니다:

```typescript
@ErrorDecorator("ServiceName.methodName")
async methodName() {
  // 메서드 구현
}
```

이 데코레이터는 다음과 같은 기능을 제공합니다:

- 일반 에러를 CustomError로 변환
- 에러 위치 정보 추가
- try-catch 자동화

### 3. asyncHandler

컨트롤러에서는 `asyncHandler`를 사용하여 비동기 오류를 중앙 처리기로 전달합니다:

```typescript
public methodName = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // 컨트롤러 로직 구현
    // 오류 발생 시 throw new CustomError() 사용
  }
);
```

### 4. 중앙 오류 처리 (GlobalErrorHandler)

애플리케이션의 모든 오류는 `GlobalErrorHandler`에서 일괄 처리됩니다:

- CustomError의 경우 메시지와 상태 코드를 클라이언트에 반환
- 개발 환경에서는 추가 디버깅 정보 포함
- 모든 오류는 서버 로그에 기록

## 오류 처리 흐름

1. 서비스 레이어: `CustomError` 발생 및 `ErrorDecorator`로 처리
2. 컨트롤러 레이어: `asyncHandler`로 컨트롤러 래핑, 오류 발생 시 중앙 처리기로 전달
3. 전역 처리: `GlobalErrorHandler`가 모든 오류를 포착하여 클라이언트에 적절한 응답 반환
