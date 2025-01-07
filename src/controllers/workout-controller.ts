import { Request, Response } from "express";
import {
  addWorkoutRecord,
  getWorkoutRecords,
  updateWorkoutRecord,
  deleteWorkoutRecord,
} from "../services/workout-service";

// // 운동 기록 생성
// export async function createWorkout(req: Request, res: Response) {
//   try {
//     const { exerciseName, weight, reps } = req.body;
//     const record = await addWorkoutRecord(exerciseName, weight, reps);
//     res.status(201).json(record);
//   } catch (err) {
//     res.status(500).json({ error: "Failed to create workout record." });
//   }
// }

// 운동 기록 조회
export async function readWorkouts(req: Request, res: Response) {
  try {
    const records = await getWorkoutRecords();
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch workout records." });
  }
}

// // 운동 기록 수정
// export async function updateWorkout(req: Request, res: Response) {
//   try {
//     const { id } = req.params;
//     const { weight, reps } = req.body;
//     const affected = await updateWorkoutRecord(Number(id), weight, reps);
//     if (affected) {
//       res.status(200).json({ message: "Workout record updated successfully." });
//     } else {
//       res.status(404).json({ error: "Workout record not found." });
//     }
//   } catch (err) {
//     res.status(500).json({ error: "Failed to update workout record." });
//   }
// }

// // 운동 기록 삭제
// export async function deleteWorkout(req: Request, res: Response) {
//   try {
//     const { id } = req.params;
//     const affected = await deleteWorkoutRecord(Number(id));
//     if (affected) {
//       res.status(200).json({ message: "Workout record deleted successfully." });
//     } else {
//       res.status(404).json({ error: "Workout record not found." });
//     }
//   } catch (err) {
//     res.status(500).json({ error: "Failed to delete workout record." });
//   }
// }
