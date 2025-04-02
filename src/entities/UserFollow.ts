import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";
import { User } from "./User";

@Entity("USER_FOLLOW")
export class UserFollow {
  @PrimaryGeneratedColumn({ name: "USER_FOLLOW_SEQ" })
  userFollowSeq!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "FOLLOWER_USER_SEQ" })
  follower!: User;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "FOLLOWING_USER_SEQ" })
  following!: User;

  @CreateDateColumn({
    name: "FOLLOW_CREATED_AT",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  followCreatedAt!: Date;
}
