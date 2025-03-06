import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Exercise } from "./Exercise";
import { WorkoutOfTheDay } from "./WorkoutOfTheDay";

@Entity("WORKOUT_DETAIL")
export class WorkoutDetail {
  @PrimaryGeneratedColumn({ name: "WORKOUT_DETAIL_SEQ" })
  workoutDetailSeq!: number;

  @ManyToOne(() => WorkoutOfTheDay, (workout) => workout.workoutDetails, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "WORKOUT_OF_THE_DAY_SEQ" })
  workoutOfTheDay!: WorkoutOfTheDay;

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
