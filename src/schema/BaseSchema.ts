import { z } from "zod";

export const SeqSchema = z.coerce
  .number()
  .int({ message: "SEQ는 정수여야 합니다." })
  .min(1, { message: "SEQ는 1 이상이어야 합니다." });
