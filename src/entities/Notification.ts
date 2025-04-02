import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { WorkoutOfTheDay } from "./WorkoutOfTheDay";
import { WorkoutComment } from "./WorkoutComment";

// 알림 유형 enum
export enum NotificationType {
  COMMENT = "COMMENT", // 내 오운완에 댓글이 달림
  REPLY = "REPLY", // 내 댓글에 대댓글이 달림
  WORKOUT_LIKE = "WORKOUT_LIKE", // 내 오운완에 좋아요가 달림
  COMMENT_LIKE = "COMMENT_LIKE", // 내 댓글에 좋아요가 달림
  FOLLOW = "FOLLOW", // 새로운 팔로워가 생김
}

@Entity("NOTIFICATION")
export class Notification {
  @PrimaryGeneratedColumn({ name: "NOTIFICATION_SEQ" })
  notificationSeq!: number;

  @Column({
    name: "NOTIFICATION_TYPE",
    type: "varchar",
    length: 50,
    nullable: false,
  })
  notificationType!: NotificationType;

  @Column({
    name: "NOTIFICATION_CONTENT",
    type: "varchar",
    length: 1000,
    nullable: false,
  })
  notificationContent!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "RECEIVER_USER_SEQ" })
  receiver!: User;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "SENDER_USER_SEQ" })
  sender!: User;

  @Column({ name: "IS_READ", type: "number", default: 0 }) // 0 = false, 1 = true
  isRead!: number;

  @CreateDateColumn({
    name: "NOTIFICATION_CREATED_AT",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: false,
  })
  notificationCreatedAt!: Date;

  // 관련 오운완 (nullable)
  @ManyToOne(() => WorkoutOfTheDay, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "WORKOUT_OF_THE_DAY_SEQ" })
  workoutOfTheDay?: WorkoutOfTheDay;

  // 관련 댓글 (nullable)
  @ManyToOne(() => WorkoutComment, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "WORKOUT_COMMENT_SEQ" })
  workoutComment?: WorkoutComment;
}
