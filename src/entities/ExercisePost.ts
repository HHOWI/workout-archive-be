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

@Entity("EXERCISE_POST")
export class ExercisePost {
  @PrimaryGeneratedColumn({ name: "EXERCISE_POST_SEQ" })
  exercisePostSeq!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;

  @ManyToOne(() => Exercise, { onDelete: "CASCADE" })
  @JoinColumn({ name: "EXERCISE_SEQ" })
  exercise!: Exercise;

  @Column({
    name: "POST_CONTENT",
    type: "varchar",
    length: 4000,
    nullable: false,
  })
  postContent!: string;

  @CreateDateColumn({
    name: "CREATED_AT",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: false,
  })
  createdAt!: Date;
}
