import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";
import { WorkoutOfTheDay } from "./WorkoutOfTheDay";
import { WorkoutCommentLike } from "./WorkoutCommentLike";

@Entity("WORKOUT_COMMENT")
export class WorkoutComment {
  @PrimaryGeneratedColumn({ name: "WORKOUT_COMMENT_SEQ" })
  workoutCommentSeq!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;

  @ManyToOne(() => WorkoutOfTheDay, { onDelete: "CASCADE" })
  @JoinColumn({ name: "WORKOUT_OF_THE_DAY_SEQ" })
  workoutOfTheDay!: WorkoutOfTheDay;

  @Column({
    name: "COMMENT_CONTENT",
    type: "varchar",
    length: 4000,
    nullable: false,
  })
  commentContent!: string;

  @Column({ name: "COMMENT_LIKES", type: "number", default: () => 0 })
  commentLikes!: number;

  @CreateDateColumn({
    name: "COMMENT_CREATED_AT",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: false,
  })
  commentCreatedAt!: Date;

  @ManyToOne(() => WorkoutComment, (comment) => comment.childComments, {
    onDelete: "CASCADE", // 부모 삭제 시 자식도 삭제
    nullable: true,
  })
  @JoinColumn({ name: "PARENT_COMMENT_SEQ" })
  parentComment!: WorkoutComment | null;

  // 자식 댓글 목록
  @OneToMany(() => WorkoutComment, (comment) => comment.parentComment)
  childComments!: WorkoutComment[];

  @OneToMany(() => WorkoutCommentLike, (like) => like.workoutComment)
  likes!: WorkoutCommentLike[];
}
