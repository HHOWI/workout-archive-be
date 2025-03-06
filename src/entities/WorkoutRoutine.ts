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
import { RoutineDetail } from "./RoutineDetail";

@Entity("WORKOUT_ROUTINE")
export class WorkoutRoutine {
  @PrimaryGeneratedColumn({ name: "WORKOUT_ROUTINE_SEQ" })
  workoutRoutineSeq!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;

  @Column({
    name: "WORKOUT_ROUTINE_NAME",
    type: "varchar",
    length: 50,
    default: null,
  })
  workoutRoutineName!: string;

  @CreateDateColumn({
    name: "WORKOUT_ROUTINE_CREATED_AT",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: false,
  })
  workoutRoutineCreatedAt!: Date;

  @OneToMany(() => RoutineDetail, (detail) => detail.workoutRoutine, {
    eager: true,
  })
  routineDetails!: RoutineDetail[];
}
