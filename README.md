# 오운완 (Workout Archive)

![GitHub language count](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![GitHub language count](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![GitHub language count](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![GitHub language count](https://img.shields.io/badge/TypeORM-FF0000?style=for-the-badge)
![GitHub language count](https://img.shields.io/badge/Oracle-F80000?style=for-the-badge&logo=oracle&logoColor=white)
![GitHub language count](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![GitHub language count](https://img.shields.io/badge/Redux-593D88?style=for-the-badge&logo=redux&logoColor=white)
![GitHub language count](https://img.shields.io/badge/MUI-0081CB?style=for-the-badge&logo=mui&logoColor=white)
![GitHub language count](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![GitHub language count](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chart.js&logoColor=white)
![GitHub language count](https://img.shields.io/badge/bcrypt-6278FF?style=for-the-badge&logo=bcrypt&logoColor=white)

## 📝 프로젝트 개요

**오운완**은 운동 기록을 저장하고 공유할 수 있는 풀스택 웹 애플리케이션입니다. 사용자들은 자신의 운동 기록을 세트, 무게, 횟수별로 상세하게 기록하고, 다른 사용자들과 공유하며 소통할 수 있습니다.

본 프로젝트는 기존 운동 기록 앱들의 장점을 통합하면서, 사용자 친화적인 UI/UX와 함께 소셜 네트워킹 요소를 강화한 웹 서비스를 구현했습니다.

## 🚀 주요 기능

### 사용자 관리

- **회원가입/로그인**: JWT 기반 사용자 인증 구현
  - 아이디와 비밀번호를 통한 로그인 시스템
  - 비밀번호 암호화 (bcrypt 사용)
  - 회원가입 시 이메일 인증 절차 구현
  - 아이디, 닉네임 중복 확인 및 사용자 정보 유효성 검사
  - HTTP-Only 쿠키 기반 토큰 관리 및 자동 로그인 지원
  - 토큰 만료 및 갱신 메커니즘 구현
- **프로필 관리**: 사용자 정보 및 프로필 이미지 설정
  - 사용자 프로필 페이지 제공: 프로필 사진, 닉네임, 운동 기록 수, 팔로워/팔로잉 수 표시
  - 프로필 이미지 업로드 및 관리
  - 프로필 소유권 확인 기능 (예: 본인 프로필 수정 버튼 노출)
  - 다른 사용자 프로필 조회 시 팔로우/언팔로우 버튼 제공
- **팔로우 시스템**: 다른 사용자 팔로우 기능
  - 팔로워/팔로잉 카운트 제공
  - 팔로워/팔로잉 목록 조회

### 운동 기록

- **상세 운동 기록**: 운동 종류, 세트, 무게, 반복 횟수, 시간, 거리 등 기록
  - 드래그 앤 드롭으로 운동 순서 조정 가능
- **운동 일지**: 텍스트 기반 운동 일지 작성 (최대 4000자)
- **사진 첨부**: 운동 인증 사진 업로드 및 미리보기
- **최근 운동 기록**: 이전 운동 기록 불러와서 재사용 가능
- **프로필 캘린더 뷰 (날짜별 기록)**:
  - 프로필 페이지 내 캘린더 탭을 통해 운동 기록을 월별로 시각적으로 확인 (사용자 경험 중심 설계)
  - 운동한 날짜 강조 표시 및 해당 월의 운동 요약 정보 제공:
    - 월간 총 운동 일수 및 운동률
    - 현재 및 최장 연속 운동일 스트릭(Streak)
  - 간편한 월별 이동 기능
- **운동 기록 상세 조회 (모달)**:
  - 피드 또는 프로필에서 운동 기록 카드 클릭 시 상세 모달 표시
  - 모달 상단: 작성자 정보(프로필 사진, 닉네임), 운동 날짜, 장소, 운동 일지(메모), 좋아요 버튼/카운트 표시
  - 운동 정보 섹션: 수행한 운동 목록을 아코디언 형태로 제공 (운동명, 주동근 태그, 총 세트 수 표시), 각 항목 확장 시 세트별 상세 정보(무게, 횟수, 거리, 시간 등) 확인 가능
- **운동 기록 소프트 삭제**: 사용자 실수 방지 및 데이터 복구 가능성 고려

### 소셜 기능

- **피드 시스템**: 팔로우한 사용자 및 장소의 운동 기록 표시
  - 무한 스크롤을 통한 페이지네이션 구현
- **댓글 & 대댓글**:
  - 운동 기록 상세 모달 내에서 댓글 작성 및 조회
  - 댓글에 대한 좋아요 기능 및 답글(대댓글) 기능
  - 작성자 기준 댓글 관리 및 삭제 기능
- **좋아요**: 운동 기록 및 댓글에 좋아요 기능
  - 실시간 좋아요 카운트 업데이트
- **알림 시스템**: Socket.IO 기반 실시간 알림 기능 (좋아요, 댓글, 팔로우 등)
  - 읽음/읽지 않음 상태 관리
  - 알림 목록 페이지를 통한 모든 알림 확인
  - 사용자별 웹소켓 연결 관리

### 운동 장소

- **운동 장소 선택 및 조회**:
  - 카카오맵 API 연동 장소 검색 및 선택, 기록과 함께 저장
  - 장소 상세 정보 및 해당 장소의 다른 사용자 운동 기록 수 확인
  - **장소별 기록 모아보기**: 특정 장소를 중심으로 관련 운동 기록들을 모아 제공 (사용자 경험 일관성을 위해 프로필 페이지와 유사한 UI 구조 적용). 해당 장소 사용자 간의 로컬 소셜 효과 기대
  - **최근 사용 장소**: 기록 시 최근 사용 장소 3개 목록 제공 및 빠른 선택
- **장소 팔로우**: 특정 운동 장소 팔로우 및 피드에서 관련 기록 확인
- **운동 장소 페이지**: 특정 장소 선택 시 해당 장소의 상세 페이지 제공
  - 상단: 카카오맵 지도, 장소명, 주소, 해당 장소의 운동 기록 수, 팔로워 수 통계 표시
  - 기능 버튼: 길찾기 (클릭 시 카카오맵 길찾기 페이지 이동), 지도 확대 (클릭 시 카카오맵 해당 위치 페이지 이동), 팔로우/언팔로우 기능 제공
  - 하단: 해당 장소에서 기록된 운동 기록들을 프로필 페이지 '오운완' 탭과 유사한 카드 그리드 형태로 표시

### 통계 및 시각화

- **데이터 기반 통계 제공**: 저장된 운동 기록과 바디로그 데이터를 기반으로 다양한 통계 정보 생성
- **시각화 대시보드**: Chart.js와 React Chart.js를 활용하여 통계 데이터를 그래프로 시각화
  - **바디로그 변화 추이**: 체중, 근육량, 체지방률 등의 변화를 기간별 라인 차트로 제공
  - **웨이트 기록 변화**: 특정 운동에 대한 중량 변화(1RM, 5RM, 본세트)를 라인 차트로 시각화. 실제 1RM/5RM 기록이 있는 경우 해당 값을, 없는 경우 본세트 기록을 기반으로 추정치를 계산하여 표시.
  - **유산소 기록 변화**: 특정 유산소 운동의 거리, 시간, 평균 속도 등의 변화를 라인 또는 바 차트로 제공
  - **운동 볼륨 분석**: 선택한 기간 동안의 운동 부위별 총 볼륨 분포를 파이 차트 또는 바 차트로 시각화
- **기간 필터링**: 사용자가 원하는 기간을 설정하여 해당 기간의 통계 조회 가능
- **데이터 필터링 및 인터랙션**:
  - 사용자가 원하는 기간 및 주기(전체, 1주, 2주, 4주, 3개월)를 설정하여 통계 조회 및 그래프 간격 조절 가능
  - 그래프 영역 드래그를 통한 확대/축소 기능으로 상세 데이터 탐색 지원

### 검색 기능

- **접두사 기반 검색**:
  - `@닉네임`: 사용자 검색 및 해당 프로필 페이지로 이동
  - `#장소명`: 장소 검색 및 해당 장소 페이지로 이동 (단, 해당 장소로 저장된 운동 기록이 1건 이상 있어야 검색 결과에 포함됨)

### 시스템 관리

- **데이터 정리**: 소프트 삭제된 데이터 자동 정리 (스케줄러)
  - node-cron을 활용한 배치 작업 스케줄링
  - 미인증 사용자 데이터 자동 정리
- **이미지 최적화**: 온디맨드 이미지 처리 및 캐싱
  - Sharp 라이브러리를 활용한 이미지 리사이징
  - 쿼리 파라미터 기반 이미지 변환 (크기, 품질, 포맷)
  - 파일 시스템 기반 이미지 캐싱
- **보안 강화**: 인증 및 권한 관리 체계적 구현
- **에러 핸들링**: 중앙 집중식 에러 처리 시스템 (`globalErrorHandler.ts`)

## 🛠️ 기술 스택

### 백엔드

- **언어 및 런타임**: TypeScript, Node.js
- **프레임워크**: Express.js
- **데이터베이스**: Oracle
- **ORM**: TypeORM
- **인증**: JWT (JSON Web Token), 쿠키 기반 인증
- **비밀번호 해싱**: bcrypt
- **스케줄러**: node-cron
- **이미지 처리**: Sharp (리사이징, 포맷 변환)
- **유효성 검증**: Zod
- **비동기 처리**: Express Async Handler
- **웹소켓**: Socket.IO
- **캐싱**: 파일 시스템 기반 캐싱

### 프론트엔드

- **언어**: TypeScript
- **프레임워크**: React
- **상태 관리**: Redux
- **라우팅**: React Router
- **스타일링**: Emotion, Material-UI (커스텀 테마 적용)
- **HTTP 클라이언트**: Axios
- **캘린더**: React Calendar
- **그래프**: Chart.js, React Chart.js
- **지도**: Kakao Maps API
- **UUID 생성**: uuid
- **실시간 통신**: Socket.IO 클라이언트

### 개발 도구

- **버전 관리**: Git, GitHub
- **환경 변수 관리**: dotenv
- **API 문서화**: Swagger (예정)
- **코드 품질**: ESLint, Prettier

## 📋 구현 세부 사항

### 백엔드 아키텍처

- **RESTful API 설계**: HTTP 메서드(GET, POST, PUT, DELETE 등)와 URI를 통해 자원(Resource)을 명시하고 상태를 주고받는 REST 원칙을 준수하여 API를 설계했습니다.
- **Controller-Service-Repository 패턴** 적용:
  - **Controller**: 요청 처리 및 응답 관리
    - WorkoutController: 운동 기록 CRUD 작업 처리
    - UserController: 사용자 인증(로그인, 로그아웃, 토큰 검증) 및 프로필 관리
    - RegisterController: 회원가입 처리
    - CommentController: 댓글 및 대댓글 처리
    - FollowController: 사용자 및 장소 팔로우 관리
    - BodyLogController: 체중 및 신체 측정 기록 관리
    - NotificationController: 알림 시스템 관리
    - StatisticsController: 운동 통계 데이터 제공 및 필터링 처리
    - SearchController: 통합 검색 기능 구현
    - ExerciseController: 운동 종류 데이터 관리 (예: 목록 조회)
    - FeedController: 소셜 피드 생성 및 조회
    - WorkoutLikeController: 운동 기록 좋아요 처리
    - WorkoutPlaceController: 운동 장소 정보 조회 (예: 최근 장소, 상세 정보)
  - **Service**: 비즈니스 로직 처리
    - 컨트롤러와 레포지토리 사이의 중간 계층
    - 복잡한 비즈니스 로직 캡슐화 (운동 기록, 사용자 생성 및 인증, 통계 계산 등)
    - **인증 로직**: 비밀번호 해싱(bcrypt) 및 비교 로직 포함
    - 의존성 주입 패턴 적용
    - **통계 서비스**: `BodyLogStatsService`, `WeightStatsService`, `CardioStatsService`, `VolumeStatsService` 등 통계 유형별 로직 분리
  - **Repository (TypeORM)**: 데이터 액세스 레이어
    - TypeORM을 활용한 엔티티 관리
    - 복잡한 쿼리 최적화 (통계 계산을 위한 집계 쿼리 등)
  - **Entity**: 데이터 모델 정의
    - User: 사용자 정보 관리 (암호화된 비밀번호 저장)
    - WorkoutOfTheDay: 일일 운동 기록
    - WorkoutDetail: 상세 운동 세트 정보
    - BodyLog: 체중 및 신체 측정 데이터
    - WorkoutPlace: 운동 장소 정보
    - Exercise: 운동 종류 정보
    - Notification: 알림 시스템 데이터
- **에러 처리**: 중앙 집중식 에러 핸들링 미들웨어 (`globalErrorHandler.ts`)
  - 모든 컨트롤러 및 서비스에서 발생하는 에러를 일관되게 처리
  - CustomError 클래스를 통한 표준화된 에러 응답 형식
  - 운영 환경과 개발 환경에 따른 에러 로깅 및 응답 차별화
- **검증**: Zod를 활용한 요청 데이터 검증
  - 스키마 기반 검증으로 타입 안전성 확보
  - 컨트롤러 레벨에서의 데이터 유효성 검사
- **미들웨어**:
  - 인증 미들웨어 (필수/선택적 인증 처리)
  - 파일 업로드 미들웨어 (Multer)
  - 이미지 처리 미들웨어 (Sharp)
  - 로깅 미들웨어
  - 전역 에러 핸들러
- **배치 처리**: 미사용 데이터 정리 스케줄러
  - 소프트 삭제된 데이터 정리
  - 임시 파일 정리
  - 캐시 만료 처리
  - 미인증 사용자 자동 삭제

### 이미지 처리 및 최적화 시스템

- **온디맨드 이미지 처리**:
  - 요청 시점에 이미지 변환 (리사이징, 품질 조정, 포맷 변환)
  - URL 쿼리 파라미터를 통한 이미지 변환 제어 (width, height, quality, format)
  - 지원 포맷: JPEG, PNG, WebP
- **이미지 캐싱 전략**:
  - 처리된 이미지 파일 시스템 캐싱
  - 캐시 키: 파일명-width-height-quality-format
  - 캐시 적중 시 빠른 응답 제공
  - 정기적인 캐시 정리 (오래된 캐시 삭제)
- **이미지 저장소 구조**:
  - 프로필 이미지: uploads/profiles/
  - 게시물 이미지: uploads/posts/
  - 캐시 디렉토리: cache/

### 인증 및 보안 시스템

- **JWT 기반 인증**:
  - HTTP-Only 쿠키를 통한 토큰 저장
  - 보안 강화를 위한 Secure, SameSite 속성 설정
  - 토큰 만료 시 자동 쿠키 삭제
- **비밀번호 보안**: bcrypt를 사용한 강력한 해싱 알고리즘 적용
- **인증 미들웨어**:
  - 필수 인증: 인증이 필요한 API 엔드포인트 보호
  - 선택적 인증: 인증 여부에 따라 다른 데이터 제공 (좋아요 상태 등)
- **권한 검증**:
  - 리소스 소유자 확인
  - 작업 권한 검증

### 실시간 통신 시스템

- **Socket.IO 기반 웹소켓 통신**:
  - 실시간 알림 전송
  - 사용자별 소켓 연결 관리
  - 인증 토큰 검증을 통한 보안 강화
- **알림 처리 흐름**:
  1. 알림 생성 이벤트 발생 (좋아요, 댓글, 팔로우 등)
  2. 데이터베이스에 알림 저장
  3. 웹소켓을 통해 실시간 알림 전송
  4. 클라이언트에서 알림 표시

### 프론트엔드 설계

- **컴포넌트 기반 아키텍처**:
  - 재사용 가능한 UI 컴포넌트 설계
    - 댓글, 좋아요, 팔로우 등 공통 컴포넌트
    - 모달 (운동 기록 상세 모달, 팔로우 목록 모달 등), 폼, 카드 등 재사용 가능한 UI 요소
    - 차트 컴포넌트 (`BodyLogTab`, `ExerciseWeightTab` 등)
  - 관심사 분리를 통한 유지보수성 강화
    - 페이지 컴포넌트와 UI 컴포넌트 분리
    - 비즈니스 로직과 프레젠테이션 로직 분리
- **상태 관리**:
  - Redux를 활용한 전역 상태 관리
    - 사용자 인증 정보
    - 테마 및 UI 설정
  - React Context API 활용
    - 컴포넌트 트리 내 지역적 상태 관리
- **라우팅 및 접근 제어**:
  - React Router를 사용한 페이지 라우팅 관리
  - `ProtectedRoute`: **로그인한 사용자 전용** 페이지 접근 제어 (예: 운동 기록 작성, 알림 페이지 등)
  - `LoginGuard`: **비로그인 사용자 전용** 페이지 접근 제어 (예: 로그인, 회원가입 페이지 등)
  - **공용 경로 설계**: 로그인하지 않은 사용자도 프로필 페이지, 장소 페이지, 운동 기록 상세 모달 등 일부 콘텐츠는 조회 가능하도록 구현. 단, 댓글, 좋아요 등 상호작용 기능 사용 시에는 로그인 필요.
- **스타일링**: Material-UI 컴포넌트와 Emotion을 활용한 스타일링
  - 커스텀 테마를 정의하여 일관된 디자인 시스템 적용
- **커스텀 훅**:
  - 재사용 가능한 로직 분리
    - useWorkoutForm: 운동 기록 폼 상태 관리
    - useAuth: 인증 관련 로직
    - usePagination: 페이지네이션 로직
    - 통계 데이터 fetching 및 처리 훅
- **반응형 디자인**: 다양한 화면 크기 지원
  - 모바일 우선 설계
  - 브레이크포인트 기반 레이아웃 조정
- **최적화**:
  - React.memo 활용한 렌더링 최적화
  - 이미지 레이지 로딩 및 최적화
  - 불필요한 리렌더링 방지
  - 차트 데이터 로딩 및 렌더링 최적화
- **주요 페이지**:
  - LoginPage: 사용자 로그인
  - RegisterPage: 회원가입 및 인증
  - ProfilePage: 사용자 프로필 표시. 상단에 프로필 사진, 닉네임, 운동/팔로워/팔로잉 수 요약 정보를 보여주고, 탭 인터페이스('오운완', '캘린더')를 통해 콘텐츠 선택 표시.
    - '오운완' 탭: 사용자의 운동 기록들을 **카드 형태의 그리드 레이아웃**으로 표시 (각 카드에는 대표 이미지, 날짜, 장소 등 요약 정보 포함). **무한 스크롤(또는 페이지네이션)**을 통해 과거 기록 로드.
    - '캘린더' 탭: 운동 기록 캘린더 표시.
  - WorkoutRecordPage: 운동 기록 작성
  - WorkoutPlacePage: 특정 장소 상세 페이지. 상단(카카오맵, 장소 정보, 통계, 기능 버튼), 하단(해당 장소 운동 기록 카드 그리드 - 프로필 '오운완' 탭과 유사).
  - FeedPage: 팔로우한 사용자/장소 운동 기록
  - BodyLogPage: 체중 및 신체 변화 기록
  - StatisticsPage: 통계 대시보드 (탭 기반 차트 뷰)
  - NotificationsPage: 알림 관리

### 성능 최적화

- **이미지 캐싱**: 서버 측 이미지 처리 및 캐싱
  - Sharp 라이브러리를 활용한 이미지 최적화
  - 리사이징 및 포맷 변환을 통한 용량 최적화
  - 캐시 히트율 모니터링 및 최적화
- **페이지네이션**: 무한 스크롤 구현으로 데이터 로딩 최적화
  - 날짜 기반 커서 페이지네이션 구현
  - 초기 로딩 속도 개선
- **쿼리 최적화**: TypeORM 쿼리 최적화 적용
  - 관계 모델 조인 최적화
  - 필요한 데이터만 선택적 로딩
  - 통계 쿼리 인덱싱 및 최적화
- **메모이제이션**: 불필요한 재연산 방지
  - Redux의 reselect 활용
  - useMemo, useCallback 적절한 활용
- **리소스 관리**:
  - 서버 측 정적 자산 캐싱
  - 클라이언트 측 로컬 스토리지 활용
  - 코드 스플리팅을 통한 초기 로딩 속도 개선

### 보안

- **인증/인가**: JWT 기반 사용자 인증 및 권한 관리
  - httpOnly 쿠키를 통한 토큰 보안
  - 토큰 만료 및 갱신 처리
- **비밀번호 보안**: bcrypt를 사용한 강력한 해싱 알고리즘 적용
- **입력 검증**: 모든 사용자 입력에 대한 서버 측 검증
  - Zod 스키마를 통한 검증
  - XSS 방지를 위한 입력 처리
- **보안 헤더**: 적절한 HTTP 보안 헤더 설정 (예: `helmet` 미들웨어 사용 고려)
  - CORS 정책 설정
  - Content-Security-Policy 적용
- **권한 제어**: 리소스 접근 권한 체계화
  - 소유자 확인 로직
  - 관리자 권한 분리
- **데이터 보호**:
  - 데이터 암호화
  - 접근 제한 및 로깅

## 📈 개발 과정 및 배운 점

### 프로젝트 기획 및 설계

- 사용자 요구사항 분석 및 기능 명세 작성
- 데이터베이스 스키마 설계 (ERD 작성)
- API 엔드포인트 설계 및 문서화
- 컴포넌트 계층 구조 설계
- 통계 지표 정의 및 시각화 방안 설계

### 개발 프로세스

- 기능별 개발 및 테스트 진행
- 코드 리뷰를 통한 품질 관리
- 지속적인 리팩토링으로 코드 품질 향상
- 반복적인 사용자 피드백 수집 및 개선

### 배운 점

- **TypeScript**의 타입 시스템을 활용한 안정적인 코드 작성
  - 인터페이스와 타입 정의를 통한 명확한 계약
  - 컴파일 타임 오류 감지를 통한 안전성 확보
- **TypeORM**을 통한 효율적인 데이터베이스 관리
  - 객체 지향적 데이터 접근 방식
  - 관계형 데이터베이스 스키마 설계 및 최적화
  - 복잡한 집계 쿼리 작성 및 성능 개선
- **React**와 **Redux**를 활용한 상태 관리 패턴
  - 단방향 데이터 흐름의 이해
  - 불변성 기반 상태 관리의 장점
- **사용자 경험**을 고려한 UI/UX 설계
  - 로딩 상태 관리 및 피드백 제공
  - 에러 처리 및 사용자 안내 메시지
  - 데이터 시각화를 통한 정보 전달력 향상
- **보안 고려사항**을 반영한 웹 애플리케이션 개발
  - 인증 및 권한 관리 패턴
  - 안전한 비밀번호 저장 (해싱)
  - 입력 검증 및 보안 취약점 방지
- **비동기 처리**와 **에러 핸들링** 패턴
  - Promise와 async/await 활용
  - 중앙 집중식 에러 처리 방식의 장점
- **실시간 웹 기술**의 이해와 구현
  - 웹소켓을 활용한 실시간 통신
  - 상태 동기화 및 이벤트 기반 아키텍처
- **이미지 처리 및 최적화** 기법
  - 온디맨드 이미지 처리
  - 효율적인 캐싱 전략
- **데이터 시각화** 기술
  - Chart.js 라이브러리 활용
  - 사용자 친화적인 그래프 설계

### 도전 과제 및 해결책

- **복잡한 데이터 관계**: TypeORM의 관계 매핑을 활용하여 효율적인 데이터 모델링
- **실시간 상호작용**: 좋아요, 댓글 등의 실시간 업데이트를 위한 최적화된 상태 관리
- **성능 최적화**: 데이터 페이지네이션, 이미지 최적화, 메모이제이션, 쿼리 최적화를 통한 성능 향상
- **사용자 인증**: 안전하고 사용자 친화적인 인증 시스템 구현 (JWT, HttpOnly 쿠키, bcrypt 해싱)
- **이미지 처리**: 다양한 디바이스에 최적화된 이미지 제공을 위한 온디맨드 처리 시스템
- **효율적인 통계 계산**: 대량의 데이터를 처리하고 의미 있는 통계를 빠르게 생성하기 위한 쿼리 최적화 및 서비스 로직 설계

## 🔍 프로젝트 스크린샷

(스크린샷 추가 예정)

## 🔮 향후 개발 방향 (Potential Future Enhancements)

현재 프로젝트는 완성된 상태이지만, 만약 추가 개발을 진행한다면 다음과 같은 방향으로 기능을 확장하거나 개선하는 것을 고려해볼 수 있습니다:

- **테스트 코드 강화**: 단위 테스트, 통합 테스트, E2E 테스트 커버리지를 높여 코드 안정성 확보
- **CI/CD 파이프라인 구축**: 빌드, 테스트, 배포 자동화를 통한 개발 생산성 향상
- **고급 통계 및 AI 기반 분석/추천**:
  - 운동 성과 예측 모델 구현 (예: 1RM 예측 정확도 향상)
  - 장기간 데이터 기반의 트렌드 분석 심화
  - 사용자 간 운동 성과 비교 및 랭킹 시스템 도입
  - **AI를 활용한 사용자 맞춤 운동 루틴 추천 기능**
  - **AI 기반 데이터 분석을 통한 개인별 운동 성과 인사이트 제공**
- **소셜 로그인 지원**: 카카오, 네이버, 구글 등 다양한 소셜 플랫폼을 통한 간편 로그인 기능 추가
- **다국어 지원**: i18n 라이브러리를 활용하여 다국어 인터페이스 제공
- **모바일 앱 버전 개발**: React Native 등을 활용한 크로스플랫폼 모바일 앱 개발
- **성능 모니터링 시스템 도입**: 서버 및 클라이언트 성능 지표 측정 및 분석을 통한 병목 현상 개선
- **클라우드 인프라 활용**:
  - 이미지 저장소를 클라우드 스토리지(예: AWS S3)로 마이그레이션
  - CDN(Content Delivery Network) 활용을 통한 정적 콘텐츠 전송 속도 개선

## 💡 설치 및 실행 방법

### 요구사항

- Node.js v14 이상
- Oracle Database
- npm 또는 yarn

### 백엔드 설정

```bash
# 저장소 클론
git clone https://github.com/yourusername/workout-archive.git
cd workout-archive/workout-archive-be

# 의존성 설치
npm install

# .env 파일 설정 (예시)
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=1521
DB_SID=xe
JWT_SECRET=your_jwt_secret
PORT=3001
COOKIE_SECRET=your_cookie_secret
UPLOAD_DIR=./uploads
CACHE_DIR=./cache
MAX_CACHE_AGE=604800000 # 캐시 유지 기간 (ms), 예: 7일
PROFILE_UPLOAD_PATH=uploads/profiles
POST_UPLOAD_PATH=uploads/posts
FRONTEND_URL=http://localhost:3000
BCRYPT_SALT_ROUNDS=10 # bcrypt 솔트 라운드

# 데이터베이스 생성 및 초기 설정
# npm run db:setup # (데이터베이스 설정 스크립트가 있다면 실행)

# 데이터베이스 시딩 (초기 데이터 입력)
npm run seed

# 서버 실행
npm run dev
```

### 프론트엔드 설정

```bash
# 프론트엔드 디렉토리로 이동
cd ../workout-archive-fe

# 의존성 설치
npm install

# .env 파일 설정 (예시)
REACT_APP_API_URL=http://localhost:3001
REACT_APP_KAKAO_MAP_API_KEY=your_kakao_api_key
REACT_APP_SOCKET_URL=http://localhost:3001

# 개발 서버 실행
npm run dev
```

## 📫 연락처

- **이메일**: youremail@example.com
- **GitHub 프로필**: [github.com/yourusername](https://github.com/yourusername)
- **백엔드 리포지토리**: [https://github.com/HHOWI/workout-archive-be](https://github.com/HHOWI/workout-archive-be)
- **프론트엔드 리포지토리**: [https://github.com/HHOWI/workout-archive-fe](https://github.com/HHOWI/workout-archive-fe)
- **포트폴리오**: [yourportfolio.com](https://yourportfolio.com)

## 🙏 감사의 말

이 프로젝트를 진행하는 동안 도움을 주신 모든 분들께 감사드립니다. 특히 코드 리뷰와 피드백을 통해 프로젝트 품질 향상에 기여해주신 동료 개발자분들께 깊은 감사의 말씀을 전합니다.

---

이 프로젝트는 취업 포트폴리오 목적으로 개발되었으며, 실제 서비스 목적이 아님을 밝힙니다.
