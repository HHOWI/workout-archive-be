import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { WorkoutRoutine } from "./WorkoutRoutine";
import { Exercise } from "./Exercise";

@Entity("ROUTINE_DETAIL")
export class RoutineDetail {
  @PrimaryGeneratedColumn({ name: "ROUTINE_DETAIL_SEQ" })
  routineDetailSeq!: number;

  @ManyToOne(() => WorkoutRoutine, (routine) => routine.routineDetails, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "WORKOUT_ROUTINE_SEQ" })
  workoutRoutine!: WorkoutRoutine;

  @ManyToOne(() => Exercise, { onDelete: "SET NULL" })
  @JoinColumn({ name: "EXERCISE_SEQ" })
  exercise!: Exercise;

  @Column({ name: "WEIGHT", type: "float", nullable: true })
  weight!: number | null;

  @Column({ name: "REPS", type: "number", nullable: true })
  reps!: number | null;

  @Column({ name: "SET_INDEX", type: "number", nullable: true })
  setIndex!: number | null;

  //미터단위
  @Column({ name: "DISTANCE", type: "number", nullable: true })
  distance!: number | null;

  //초단위
  @Column({ name: "RECORD_TIME", type: "number", nullable: true })
  recordTime!: number | null;
}
