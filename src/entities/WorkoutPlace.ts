import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { WorkoutOfTheDay } from "./WorkoutOfTheDay";
import { PlaceFollow } from "./PlaceFollow";

@Entity("WORKOUT_PLACE")
export class WorkoutPlace {
  @PrimaryGeneratedColumn({ name: "WORKOUT_PLACE_SEQ" })
  workoutPlaceSeq!: number;

  @Column({
    name: "KAKAO_PLACE_ID",
    type: "varchar",
    length: 100,
    unique: true,
    nullable: false,
  })
  kakaoPlaceId!: string;

  @Column({
    name: "PLACE_NAME",
    type: "varchar",
    length: 100,
    nullable: false,
  })
  placeName!: string;

  @Column({
    name: "ADDRESS_NAME",
    type: "varchar",
    length: 200,
    nullable: true,
  })
  addressName!: string;

  @Column({
    name: "ROAD_ADDRESS_NAME",
    type: "varchar",
    length: 200,
    nullable: true,
  })
  roadAddressName!: string;

  @Column({
    name: "X",
    type: "decimal",
    precision: 15,
    scale: 10,
    nullable: false,
  })
  x!: number;

  @Column({
    name: "Y",
    type: "decimal",
    precision: 15,
    scale: 10,
    nullable: false,
  })
  y!: number;

  @OneToMany(() => WorkoutOfTheDay, (workout) => workout.workoutPlace)
  workouts!: WorkoutOfTheDay[];

  @OneToMany(() => PlaceFollow, (follow) => follow.workoutPlace)
  followers!: PlaceFollow[];
}
