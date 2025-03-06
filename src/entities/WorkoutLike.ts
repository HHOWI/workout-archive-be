import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { WorkoutOfTheDay } from "./WorkoutOfTheDay";

@Entity("WORKOUT_LIKE")
export class WorkoutLike {
  @PrimaryGeneratedColumn({ name: "WORKOUT_LIKE_SEQ" })
  workoutLikeSeq!: number;

  @ManyToOne(() => WorkoutOfTheDay, { onDelete: "CASCADE" })
  @JoinColumn({ name: "WORKOUT_OF_THE_DAY_SEQ" })
  workoutOfTheDay!: WorkoutOfTheDay;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;
}
