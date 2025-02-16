import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ExerciseComment } from "./ExerciseComment";
import { User } from "./User";

@Index("IDX_COMMENT_LIKE_COMMENT", ["exerciseComment"])
@Entity("COMMENT_LIKE")
export class CommentLike {
  @PrimaryGeneratedColumn({ name: "COMMENT_LIKE_SEQ" })
  commentLikeSeq!: number;

  @ManyToOne(() => ExerciseComment, { onDelete: "CASCADE" })
  @JoinColumn({ name: "EXERCISE_COMMENT_SEQ" })
  exerciseComment!: ExerciseComment;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;
}
