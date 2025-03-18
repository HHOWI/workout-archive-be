import { z } from "zod";
import {
  CursorPaginationSchema,
  SaveWorkoutSchema,
} from "../schema/WorkoutSchema";

export type SaveWorkoutDTO = z.infer<typeof SaveWorkoutSchema>;
export type CursorPaginationDTO = z.infer<typeof CursorPaginationSchema>;
