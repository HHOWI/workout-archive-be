import { getRepository } from "typeorm";
import { WorkoutRecord } from "../entities/workout-record.entity";

// 1. 데이터 삽입
export async function addWorkoutRecord(
  exerciseName: string,
  weight: number,
  reps: number
) {
  const workoutRepo = getRepository(WorkoutRecord);
  const record = workoutRepo.create({ exerciseName, weight, reps });
  const savedRecord = await workoutRepo.save(record);
  return savedRecord;
}

// 2. 데이터 조회
export async function getWorkoutRecords() {
  const workoutRepo = getRepository(WorkoutRecord);
  const records = await workoutRepo.find({ order: { recordDate: "DESC" } });
  return records;
}

// 3. 데이터 수정
export async function updateWorkoutRecord(
  id: number,
  weight: number,
  reps: number
) {
  const workoutRepo = getRepository(WorkoutRecord);
  const updated = await workoutRepo.update(id, { weight, reps });
  return updated.affected; // 수정된 레코드 수 반환
}

// 4. 데이터 삭제
export async function deleteWorkoutRecord(id: number) {
  const workoutRepo = getRepository(WorkoutRecord);
  const deleted = await workoutRepo.delete(id);
  return deleted.affected; // 삭제된 레코드 수 반환
}
