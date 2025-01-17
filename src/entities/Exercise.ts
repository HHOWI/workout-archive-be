import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

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
}
