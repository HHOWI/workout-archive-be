import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { ExercisePost } from "./ExercisePost";
import { WorkoutDetail } from "./WorkoutDetail";

@Entity("EXERCISE")
export class Exercise {
  @PrimaryGeneratedColumn({ name: "EXERCISE_SEQ" })
  exerciseSeq!: number;

  @Column({
    name: "EXERCISE_TYPE",
    type: "varchar",
    length: 20,
    nullable: false,
  })
  exerciseType!: string;

  @Column({
    name: "EXERCISE_NAME",
    type: "varchar",
    length: 100,
    nullable: false,
  })
  exerciseName!: string;

  @OneToMany(() => ExercisePost, (post) => post.exercise)
  posts!: ExercisePost[];

  @OneToMany(() => WorkoutDetail, (detail) => detail.exercise)
  workoutDetails!: WorkoutDetail[];
}
