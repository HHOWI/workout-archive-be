import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("WORKOUT_RECORDS") // 테이블 이름
export class WorkoutRecord {
  @PrimaryGeneratedColumn() // 기본 키 자동 증가
  id!: number;

  @Column({ length: 100, nullable: false }) // VARCHAR(100), NOT NULL
  exerciseName!: string;

  @Column({ type: "number", nullable: true }) // NUMBER, NULL 허용
  weight!: number;

  @Column({ type: "number", nullable: false }) // NUMBER, NOT NULL
  reps!: number;

  @Column({ type: "date", default: () => "SYSDATE" }) // DATE, 기본값 SYSDATE
  recordDate!: Date;
}
