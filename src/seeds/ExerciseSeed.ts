import { DataSource } from "typeorm";
import { Exercise } from "../entities/Exercise";

// 원하는 운동 리스트를 배열에 넣음
const initialExercises = [
  // 유산소
  { exerciseType: "유산소", exerciseName: "러닝" },
  { exerciseType: "유산소", exerciseName: "사이클" },
  { exerciseType: "유산소", exerciseName: "스텝밀(천국의계단)" },

  // 가슴
  { exerciseType: "가슴", exerciseName: "플랫 벤치 프레스" },
  { exerciseType: "가슴", exerciseName: "플랫 벤치 프레스 머신" },
  { exerciseType: "가슴", exerciseName: "인클라인 벤치 프레스" },
  { exerciseType: "가슴", exerciseName: "인클라인 벤치 프레스 머신" },
  { exerciseType: "가슴", exerciseName: "디클라인 벤치 프레스" },
  { exerciseType: "가슴", exerciseName: "디클라인 벤치 프레스 머신" },
  { exerciseType: "가슴", exerciseName: "해머 플랫 벤치 프레스" },
  { exerciseType: "가슴", exerciseName: "해머 인클라인 벤치 프레스" },
  { exerciseType: "가슴", exerciseName: "플랫 덤벨 벤치 프레스" },
  { exerciseType: "가슴", exerciseName: "인클라인 덤벨 벤치 프레스" },
  { exerciseType: "가슴", exerciseName: "디클라인 덤벨 벤치 프레스" },
  { exerciseType: "가슴", exerciseName: "플랫 체스트 프레스 머신" },
  { exerciseType: "가슴", exerciseName: "인클라인 체스트 프레스 머신" },
  { exerciseType: "가슴", exerciseName: "디클라인 체스트 프레스 머신" },
  { exerciseType: "가슴", exerciseName: "펙 덱 플라이" },
  { exerciseType: "가슴", exerciseName: "케이블 크로스 오버" },
  { exerciseType: "가슴", exerciseName: "케이블 어퍼 플라이" },
  { exerciseType: "가슴", exerciseName: "딥스(가슴)" },
  { exerciseType: "가슴", exerciseName: "푸시업" },

  // 어깨
  { exerciseType: "어깨", exerciseName: "숄더 프레스 머신" },
  { exerciseType: "어깨", exerciseName: "덤벨 숄더 프레스" },
  { exerciseType: "어깨", exerciseName: "밀리터리 프레스" },
  { exerciseType: "어깨", exerciseName: "덤벨 사이드 래터럴 레이즈" },
  { exerciseType: "어깨", exerciseName: "케이블 사이드 래터럴 레이즈" },
  { exerciseType: "어깨", exerciseName: "스탠딩 사이드 래터럴 레이즈 머신" },
  { exerciseType: "어깨", exerciseName: "프론트 레이즈" },
  { exerciseType: "어깨", exerciseName: "바벨 업라이트 로우" },
  { exerciseType: "어깨", exerciseName: "덤벨 업라이트 로우" },
  { exerciseType: "어깨", exerciseName: "리버스 펙 덱 플라이" },

  // 삼두
  { exerciseType: "삼두", exerciseName: "바벨 라잉 트라이셉스 익스텐션" },
  { exerciseType: "삼두", exerciseName: "덤벨 라잉 트라이셉스 익스텐션" },
  { exerciseType: "삼두", exerciseName: "케이블 푸시 다운" },
  { exerciseType: "삼두", exerciseName: "딥스(삼두)" },

  // 등
  { exerciseType: "등", exerciseName: "미디엄 그립 풀업" },
  { exerciseType: "등", exerciseName: "와이드 그립 풀업" },
  { exerciseType: "등", exerciseName: "클로즈 그립 풀업" },
  { exerciseType: "등", exerciseName: "와이드 그립 랫 풀 다운" },
  { exerciseType: "등", exerciseName: "미디엄 그립 랫 풀 다운" },
  { exerciseType: "등", exerciseName: "클로즈 그립 랫 풀 다운" },
  { exerciseType: "등", exerciseName: "케이블 암 풀 다운" },
  { exerciseType: "등", exerciseName: "바벨 로우" },
  { exerciseType: "등", exerciseName: "티바 로우" },
  { exerciseType: "등", exerciseName: "원 암 덤벨 로우" },
  { exerciseType: "등", exerciseName: "시티드 케이블 로우" },
  { exerciseType: "등", exerciseName: "원 암 시티드 케이블 로우" },

  // 하체
  { exerciseType: "하체", exerciseName: "맨몸 스쿼트" },
  { exerciseType: "하체", exerciseName: "바벨 스쿼트" },
  { exerciseType: "하체", exerciseName: "데드리프트" },
  { exerciseType: "하체", exerciseName: "V스쿼트" },
  { exerciseType: "하체", exerciseName: "핵 슬라이드" },
  { exerciseType: "하체", exerciseName: "맨몸 런지" },
  { exerciseType: "하체", exerciseName: "덤벨 런지" },
  { exerciseType: "하체", exerciseName: "바벨 런지" },
  { exerciseType: "하체", exerciseName: "고블렛 스쿼트" },
  { exerciseType: "하체", exerciseName: "레그 프레스" },
  { exerciseType: "하체", exerciseName: "레그 컬" },
  { exerciseType: "하체", exerciseName: "레그 익스텐션" },
  { exerciseType: "하체", exerciseName: "이너 싸이 머신" },

  // 이두
  { exerciseType: "이두", exerciseName: "바벨 바이셉스 컬" },
  { exerciseType: "이두", exerciseName: "덤벨 바이셉스 컬" },
  { exerciseType: "이두", exerciseName: "해머 바이셉스 컬" },
  { exerciseType: "이두", exerciseName: "리버스 그립 바벨 바이셉스 컬" },
];

export const ExerciseSeed = async (dataSource: DataSource) => {
  const exerciseRepo = dataSource.getRepository(Exercise);

  for (const item of initialExercises) {
    // 중복 여부 체크 (운동명으로)
    const exist = await exerciseRepo.findOne({
      where: { exerciseName: item.exerciseName },
    });

    if (exist) {
      console.log(`Skipped (already exists): ${item.exerciseName}`);
      continue;
    }

    // 새 엔티티 생성
    const newExercise = exerciseRepo.create(item);
    await exerciseRepo.save(newExercise);
    console.log(`Inserted: ${item.exerciseName}`);
  }
};
