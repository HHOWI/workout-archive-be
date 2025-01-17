import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { WorkoutOfTheDay } from "./WorkoutOfTheDay";
import { RecordDetail } from "./RecordDetail";

@Entity("EXERCISE_RECORD")
export class ExerciseRecord {
  @PrimaryGeneratedColumn({ name: "EXERCISE_RECORD_SEQ" })
  exerciseRecordSeq!: number;

  // 어떤 운동기록(헤더)에 소속된 세트인지
  @ManyToOne(() => WorkoutOfTheDay, { onDelete: "CASCADE" })
  @JoinColumn({ name: "WORKOUT_OF_THE_DAY_SEQ" })
  workoutOfTheDay!: WorkoutOfTheDay;

  // 어떤 운동들을 했는지
  @ManyToOne(() => RecordDetail, { onDelete: "CASCADE" })
  @JoinColumn({ name: "RECORD_DETAIL_SEQ" })
  recordDetail!: RecordDetail;
}
