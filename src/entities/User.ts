import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

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
}
