import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { WorkoutOfTheDay } from "./WorkoutOfTheDay";
import { WorkoutComment } from "./WorkoutComment";
import { BodyLog } from "./BodyLog";
import { WorkoutCommentLike } from "./WorkoutCommentLike";
import { WorkoutLike } from "./WorkoutLike";
import { UserFollow } from "./UserFollow";
import { PlaceFollow } from "./PlaceFollow";
import { Notification } from "./Notification";

@Entity("USER")
export class User {
  @PrimaryGeneratedColumn({ name: "USER_SEQ" })
  userSeq!: number;

  @Column({ name: "USER_ID", type: "varchar", length: 50, nullable: false })
  userId!: string;

  @Column({ name: "USER_PW", type: "varchar", length: 255, nullable: false })
  userPw!: string;

  @Column({ name: "USER_EMAIL", type: "varchar", length: 100, nullable: false })
  userEmail!: string;

  @Column({
    name: "USER_NICKNAME",
    type: "varchar",
    length: 50,
    nullable: false,
  })
  userNickname!: string;

  @Column({
    name: "PROFILE_IMAGE_URL",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  profileImageUrl?: string;

  @Column({
    name: "IS_VERIFIED",
    type: "number",
    default: 0, // 0 = false, 1 = true
    nullable: false,
  })
  isVerified!: number;

  @CreateDateColumn({
    name: "USER_CREATED_AT",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: false,
  })
  userCreatedAt!: Date;

  @Column({
    name: "VERIFICATION_TOKEN",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  verificationToken!: string | null;

  @OneToMany(() => WorkoutOfTheDay, (workout) => workout.user)
  workouts!: WorkoutOfTheDay[];

  @OneToMany(() => WorkoutComment, (comment) => comment.user)
  comments!: WorkoutComment[];

  @OneToMany(() => BodyLog, (bodyLog) => bodyLog.user)
  bodyLogs!: BodyLog[];

  @OneToMany(() => WorkoutCommentLike, (like) => like.user)
  commentLikes!: WorkoutCommentLike[];

  @OneToMany(() => WorkoutLike, (like) => like.user)
  workoutLikes!: WorkoutLike[];

  @OneToMany(() => UserFollow, (follow) => follow.follower)
  following!: UserFollow[]; // 내가 팔로우하는 사람들

  @OneToMany(() => UserFollow, (follow) => follow.following)
  followers!: UserFollow[]; // 나를 팔로우하는 사람들

  @OneToMany(() => PlaceFollow, (follow) => follow.user)
  followingPlaces!: PlaceFollow[]; // 내가 팔로우하는 장소들

  // 받은 알림
  @OneToMany(() => Notification, (notification) => notification.receiver)
  receivedNotifications!: Notification[];

  // 보낸 알림
  @OneToMany(() => Notification, (notification) => notification.sender)
  sentNotifications!: Notification[];
}
