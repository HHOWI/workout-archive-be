export class UserInfoRecordDTO {
  userInfoRecordSeq!: number;
  bodyWeight!: number | null;
  muscleMass!: number | null;
  bodyFat!: number | null;
  recordDate!: Date;

  constructor(entity: Partial<UserInfoRecordDTO>) {
    Object.assign(this, entity);
  }
}
