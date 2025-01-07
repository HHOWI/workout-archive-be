import express from "express";
import { readWorkouts } from "../controllers/workout-controller";

const router = express.Router();

// router.post("/", createWorkout); // POST /api/workouts
router.get("/", readWorkouts); // GET /api/workouts
// router.put("/:id", updateWorkout); // PUT /api/workouts/:id
// router.delete("/:id", deleteWorkout); // DELETE /api/workouts/:id

export default router;
