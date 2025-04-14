import { Exercise } from "../entities/Exercise";

/**
 * 운동 정보 DTO 인터페이스
 * 운동 종목 기본 정보를 담는 인터페이스입니다.
 */
export interface ExerciseDTO {
  exerciseSeq: number;
  exerciseType: string;
  exerciseName: string;
}

/**
 * 그룹화된 운동 목록 DTO 인터페이스
 * 운동 종류별로 그룹화된 운동 목록을 담는 인터페이스입니다.
 */
export interface GroupedExercisesDTO {
  [exerciseType: string]: ExerciseDTO[];
}

/**
 * 엔티티에서 DTO로 변환하는 헬퍼 함수
 */
export function toExerciseDTO(exercise: Exercise): ExerciseDTO {
  return {
    exerciseSeq: exercise.exerciseSeq,
    exerciseType: exercise.exerciseType,
    exerciseName: exercise.exerciseName,
  };
}

/**
 * 운동 목록을 타입별로 그룹화하는 헬퍼 함수
 */
export function groupExercisesByType(
  exercises: ExerciseDTO[]
): GroupedExercisesDTO {
  return exercises.reduce<GroupedExercisesDTO>((acc, exercise) => {
    const { exerciseType } = exercise;
    if (!acc[exerciseType]) {
      acc[exerciseType] = [];
    }
    acc[exerciseType].push(exercise);
    return acc;
  }, {});
}
