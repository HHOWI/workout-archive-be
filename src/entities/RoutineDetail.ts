import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserExerciseRoutine } from "./UserExerciseRoutine";

@Entity("ROUTINE_DETAIL")
export class RoutineDetail {
  @PrimaryGeneratedColumn({ name: "ROUTINE_DETAIL_SEQ" })
  routineDetailSeq!: number;

  @ManyToOne(() => UserExerciseRoutine, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_EXERCISE_ROUTINE_SEQ" })
  userExerciseRoutine!: UserExerciseRoutine;
}
