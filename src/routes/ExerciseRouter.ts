import { Router } from "express";
import { ExerciseController } from "../controllers/ExerciseController";

const ExerciseRouter = Router();
const exerciseController = new ExerciseController();

ExerciseRouter.get("/exercises", exerciseController.getAllExercises);

export default ExerciseRouter;
