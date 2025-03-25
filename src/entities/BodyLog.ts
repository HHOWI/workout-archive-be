import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity("BODY_LOG")
export class BodyLog {
  @PrimaryGeneratedColumn({ name: "BODY_LOG_SEQ" })
  bodyLogSeq!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "USER_SEQ" })
  user!: User;

  @Column({ name: "HEIGHT", type: "float", nullable: true })
  height!: number | null;

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
