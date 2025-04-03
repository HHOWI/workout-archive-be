import { Request, Response } from "express";
import { WorkoutLikeService } from "../services/WorkoutLikeService";
import { CustomError } from "../utils/customError";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { SeqSchema } from "../schema/BaseSchema";

export class WorkoutLikeController {
  private workoutLikeService = new WorkoutLikeService();

  @ErrorDecorator("WorkoutLikeController.toggleWorkoutLike")
  public async toggleWorkoutLike(req: Request, res: Response): Promise<void> {
    const userSeq = req.user?.userSeq;
    const workoutOfTheDaySeq = SeqSchema.parse(req.params.workoutOfTheDaySeq);

    if (!userSeq) {
      throw new CustomError(
        "인증되지 않은 사용자입니다.",
        401,
        "WorkoutLikeController.toggleWorkoutLike"
      );
    }

    const result = await this.workoutLikeService.toggleWorkoutLike(
      userSeq,
      workoutOfTheDaySeq
    );

    res.status(200).json(result);
  }

  @ErrorDecorator("WorkoutLikeController.getWorkoutLikeStatus")
  public async getWorkoutLikeStatus(
    req: Request,
    res: Response
  ): Promise<void> {
    const userSeq = req.user?.userSeq;
    const workoutOfTheDaySeq = SeqSchema.parse(req.params.workoutOfTheDaySeq);

    const isLiked = await this.workoutLikeService.getWorkoutLikeStatus(
      userSeq,
      workoutOfTheDaySeq
    );

    res.status(200).json({ isLiked });
  }

  @ErrorDecorator("WorkoutLikeController.getWorkoutLikeCount")
  public async getWorkoutLikeCount(req: Request, res: Response): Promise<void> {
    const workoutOfTheDaySeq = SeqSchema.parse(req.params.workoutOfTheDaySeq);

    const likeCount = await this.workoutLikeService.getWorkoutLikeCount(
      workoutOfTheDaySeq
    );

    res.status(200).json({ likeCount });
  }
}
