import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";
import { User } from "./User";
import { WorkoutPlace } from "./WorkoutPlace";

@Entity("PLACE_FOLLOW")
export class PlaceFollow {
  @PrimaryGeneratedColumn({ name: "PLACE_FOLLOW_SEQ" })
  placeFollowSeq!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;

  @ManyToOne(() => WorkoutPlace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "WORKOUT_PLACE_SEQ" })
  workoutPlace!: WorkoutPlace;

  @CreateDateColumn({
    name: "FOLLOW_CREATED_AT",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  followCreatedAt!: Date;
}
