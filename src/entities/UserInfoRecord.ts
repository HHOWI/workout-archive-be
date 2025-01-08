import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity("USER_INFO_RECORD")
export class UserInfoRecord {
  @PrimaryGeneratedColumn({ name: "USER_INFO_RECORD_SEQ" })
  userInfoRecordSEQ!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;

  @Column({ name: "BODY_WEIGHT", type: "float", nullable: true })
  bodyWeight!: number | null;

  @Column({ name: "MUSCLE_MASS", type: "float", nullable: true })
  muscleMass!: number | null;

  @Column({ name: "BODY_FAT", type: "float", nullable: true })
  bodyFat!: number | null;

  @CreateDateColumn({
    name: "RECORD_DATE",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: false,
  })
  recordDate!: Date;
}
