import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("WORKOUT_PLACE")
export class WorkoutPlace {
  @PrimaryGeneratedColumn({ name: "WORKOUT_PLACE_SEQ" })
  workoutPlaceSeq!: number;

  @Column({
    name: "PLACE_NAME",
    type: "varchar",
    length: 100,
    nullable: false,
  })
  placeName!: string;

  @Column({
    name: "PLACE_ADDRESS",
    type: "varchar",
    length: 200,
    nullable: false,
  })
  placeAddress!: string;
}
