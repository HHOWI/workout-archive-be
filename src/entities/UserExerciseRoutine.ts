import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";

@Entity("USER_EXERCISE_ROUTINE")
export class UserExerciseRoutine {
  @PrimaryGeneratedColumn({ name: "USER_EXERCISE_ROUTINE_SEQ" })
  userExerciseRoutineSeq!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;

  @Column({
    name: "USER_EXERCISE_ROUTINE_NAME",
    type: "varchar",
    length: 50,
    default: null,
  })
  userExerciseRoutineName!: string;

  @CreateDateColumn({
    name: "USER_EXERCISE_ROUTINE_CREATED_AT",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: false,
  })
  userExerciseRoutineCreatedAt!: Date;
}
