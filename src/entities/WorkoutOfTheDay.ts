import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { WorkoutPlace } from "./WorkoutPlace";

@Entity("WORKOUT_OF_THE_DAY")
export class WorkoutOfTheDay {
  @PrimaryGeneratedColumn({ name: "WORKOUT_OF_THE_DAY_SEQ" })
  workoutOfTheDaySeq!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;

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

  @ManyToOne(() => WorkoutPlace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "WORKOUT_PLACE_SEQ" })
  workoutPlace!: WorkoutPlace;
}
