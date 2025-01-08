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

@Entity("USER_EXERCISE_MEMO")
export class UserExerciseMemo {
  @PrimaryGeneratedColumn({ name: "USER_EXERCISE_MEMO_SEQ" })
  userExerciseMemoSEQ!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;

  @ManyToOne(() => Exercise, { onDelete: "CASCADE" })
  @JoinColumn({ name: "EXERCISE_SEQ" })
  exercise!: Exercise;

  @Column({
    name: "MEMO_CONTENT",
    type: "varchar",
    length: 4000,
    nullable: false,
  })
  memoContent!: string;

  @CreateDateColumn({
    name: "CREATED_AT",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: false,
  })
  createdAt!: Date;
}
