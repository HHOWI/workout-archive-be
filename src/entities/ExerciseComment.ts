import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";
import { Exercise } from "./Exercise";

@Entity("EXERCISE_COMMENT")
export class ExerciseComment {
  @PrimaryGeneratedColumn({ name: "EXERCISE_COMMENT_SEQ" })
  exerciseCommentSeq!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;

  @ManyToOne(() => Exercise, { onDelete: "CASCADE" })
  @JoinColumn({ name: "EXERCISE_SEQ" })
  exercise!: Exercise;

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

  @Column({ name: "PARENT_COMMENT_SEQ", type: "number", default: null })
  parentCommentSeq!: number | null;
}
