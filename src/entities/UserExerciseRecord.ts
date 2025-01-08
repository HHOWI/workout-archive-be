import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { Exercise } from "./Exercise";

@Entity("USER_EXERCISE_RECORD")
export class UserExerciseRecord {
  @PrimaryGeneratedColumn({ name: "USER_EXERCISE_RECORD_SEQ" })
  userExerciseRecordSEQ!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;

  @ManyToOne(() => Exercise, { onDelete: "CASCADE" })
  @JoinColumn({ name: "EXERCISE_SEQ" })
  exercise!: Exercise;

  // 유산소 운동에서 주로 쓰는 필드
  @Column({ name: "DISTANCE", type: "number", nullable: true })
  distance!: number | null; // 예: km

  @Column({ name: "RECORD_TIME", type: "number", nullable: true })
  recordTime!: number | null; // 예: 분 또는 초

  // 운동 전체에 대한 일기나 사진 링크
  @Column({
    name: "WORKOUT_DIARY",
    type: "varchar",
    length: 4000,
    nullable: true,
  })
  workoutDiary!: string | null;

  @CreateDateColumn({
    name: "RECORD_DATE",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: false,
  })
  recordDate!: Date;
}
