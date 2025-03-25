import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { User } from "./User";
import { WorkoutPlace } from "./WorkoutPlace";
import { WorkoutDetail } from "./WorkoutDetail";
import { WorkoutLike } from "./WorkoutLike";

@Entity("WORKOUT_OF_THE_DAY")
export class WorkoutOfTheDay {
  @PrimaryGeneratedColumn({ name: "WORKOUT_OF_THE_DAY_SEQ" })
  workoutOfTheDaySeq!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;

  @Column({
    name: "WORKOUT_DIARY",
    type: "varchar",
    length: 4000,
    nullable: true,
  })
  workoutDiary!: string | null;

  @Column({
    name: "WORKOUT_PHOTO",
    type: "varchar",
    length: 4000,
    nullable: true,
  })
  workoutPhoto!: string | null;

  @Column({
    name: "WORKOUT_LIKE_COUNT",
    type: "number",
    default: () => 0,
  })
  workoutLikeCount!: number;

  @Column({
    name: "MAIN_EXERCISE_TYPE",
    type: "varchar",
    length: 20,
    nullable: true,
  })
  mainExerciseType!: string | null;

  @CreateDateColumn({
    name: "RECORD_DATE",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: false,
  })
  recordDate!: Date;

  @Column({
    name: "IS_DELETED",
    type: "number",
    default: () => 0,
  })
  isDeleted!: number;

  @ManyToOne(() => WorkoutPlace, { onDelete: "SET NULL" })
  @JoinColumn({ name: "WORKOUT_PLACE_SEQ" })
  workoutPlace!: WorkoutPlace | null;

  @OneToMany(
    () => WorkoutDetail,
    (workoutDetail) => workoutDetail.workoutOfTheDay
  )
  workoutDetails!: WorkoutDetail[];

  @OneToMany(() => WorkoutLike, (like) => like.workoutOfTheDay)
  workoutLikes!: WorkoutLike[];
}
