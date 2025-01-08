import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("USER")
export class User {
  @PrimaryGeneratedColumn({ name: "USER_SEQ" })
  userSEQ!: number;

  @Column({ name: "ID", type: "varchar", length: 50, nullable: false })
  id!: string;

  @Column({ name: "PW", type: "varchar", length: 255, nullable: false })
  pw!: string;

  @Column({ name: "EMAIL", type: "varchar", length: 100, nullable: false })
  email!: string;

  @Column({ name: "NICKNAME", type: "varchar", length: 50, nullable: false })
  nickname!: string;

  @CreateDateColumn({
    name: "CREATED_AT",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: false,
  })
  createdAt!: Date;
}
