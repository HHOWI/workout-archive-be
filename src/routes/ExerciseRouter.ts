import { Router } from "express";
import { ExerciseController } from "../controllers/ExerciseController";

const exerciseRouter = Router();
const exerciseController = new ExerciseController();

exerciseRouter.get("/exercises", exerciseController.getAllExercises);

export default exerciseRouter;
