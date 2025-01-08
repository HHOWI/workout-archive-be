import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserExerciseRecord } from "./UserExerciseRecord";

@Entity("USER_EXERCISE_RECORD_SET")
export class UserExerciseRecordSet {
  @PrimaryGeneratedColumn({ name: "USER_EXERCISE_RECORD_SET_SEQ" })
  userExerciseRecordSetSEQ!: number;

  // 어떤 운동기록(헤더)에 소속된 세트인지
  @ManyToOne(() => UserExerciseRecord, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_EXERCISE_RECORD_SEQ" })
  userExerciseRecord!: UserExerciseRecord;

  @Column({ name: "SET_INDEX", type: "number", nullable: true })
  setIndex!: number | null;
  // 몇번째 세트인지 (1,2,3,...)

  @Column({ name: "WEIGHT", type: "float", nullable: true })
  weight!: number | null;
  // 무산소일 경우 무게 (kg)

  @Column({ name: "REPS", type: "number", nullable: true })
  reps!: number | null;
  // 무산소일 경우 횟수
}
