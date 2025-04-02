import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { FeedService } from "../services/FeedService";
import { ControllerUtil } from "../utils/controllerUtil";
import { FeedQuerySchema } from "../dtos/FeedDTO";

export class FeedController {
  private feedService = new FeedService();

  // GET /feed
  public getFeed = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const { limit, cursor } = FeedQuerySchema.parse(req.query);

      const feedResponse = await this.feedService.getFeed(
        userSeq,
        limit,
        cursor
      );

      res.status(200).json(feedResponse);
    }
  );
}
