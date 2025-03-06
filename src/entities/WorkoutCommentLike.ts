import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { WorkoutComment } from "./WorkoutComment";
import { User } from "./User";

@Entity("WORKOUT_COMMENT_LIKE")
export class WorkoutCommentLike {
  @PrimaryGeneratedColumn({ name: "WORKOUT_COMMENT_LIKE_SEQ" })
  workoutCommentLikeSeq!: number;

  @ManyToOne(() => WorkoutComment, { onDelete: "CASCADE" })
  @JoinColumn({ name: "WORKOUT_COMMENT_SEQ" })
  workoutComment!: WorkoutComment;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;
}
