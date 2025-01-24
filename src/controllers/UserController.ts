import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { CustomError } from "../utils/CustomError";

export class UserController {
  private userService = new UserService();

  // GET /users
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const users = await this.userService.findAllUser();
    res.json(users);
  });

  // 닉네임으로 찾기
  getUserByNickname = asyncHandler(async (req: Request, res: Response) => {
    const userNickname = String(req.params.userNickname);
    const user = await this.userService.findByNickname(userNickname);
    if (!user) {
      throw new CustomError(
        "User not found",
        404,
        "UserController.getUserByNickname"
      );
    }
    res.json(user);
  });

  // POST /users
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId, userPw, userEmail, userNickname } = req.body;
    const newUser = await this.userService.createUser({
      userId,
      userPw,
      userEmail,
      userNickname,
    });
    res.status(201).json(newUser);
  });

  // PUT /users/:id
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const userSEQ = Number(req.params.id);
    const dto = req.body;
    const updatedUser = await this.userService.updateUser(userSEQ, dto);
    if (!updatedUser) {
      throw new CustomError(
        "User not found or no changes",
        404,
        "UserController.updateUser"
      );
    }
    res.json(updatedUser);
  });

  // DELETE /users/:id
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const userSEQ = Number(req.params.id);
    const isDeleted = await this.userService.deleteUser(userSEQ);
    if (!isDeleted) {
      throw new CustomError("User not found", 404, "UserController.deleteUser");
    }
    res.status(204).send();
  });
}
