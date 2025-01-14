import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/UserService";
import { CustomError } from "../utils/CustomError";

const userService = new UserService();

export class UserController {
  // GET /users
  static getAllUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const users = await userService.findAll();
      res.json(users);
    } catch (err) {
      next(
        new CustomError(
          "Failed to fetch users",
          500,
          "UserController.getAllUsers"
        )
      );
    }
  };

  // GET /users/:id
  static getUserById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userSEQ = Number(req.params.id);
    try {
      const user = await userService.findById(userSEQ);
      if (!user) {
        next(
          new CustomError("User not found", 404, "UserController.getUserById")
        );
        return;
      }
      res.json(user);
    } catch (err) {
      next(
        new CustomError(
          "Failed to fetch user",
          500,
          "UserController.getUserById"
        )
      );
    }
  };

  // POST /users
  static createUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { id, pw, email, nickname } = req.body;
    try {
      const newUser = await userService.createUser({ id, pw, email, nickname });
      res.status(201).json(newUser);
    } catch (err) {
      next(
        new CustomError(
          "Failed to create user",
          500,
          "UserController.createUser"
        )
      );
    }
  };

  // PUT /users/:id
  static updateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userSEQ = Number(req.params.id);
    const dto = req.body;
    try {
      const updatedUser = await userService.updateUser(userSEQ, dto);
      if (!updatedUser) {
        next(
          new CustomError(
            "User not found or no changes",
            404,
            "UserController.updateUser"
          )
        );
        return;
      }
      res.json(updatedUser);
    } catch (err) {
      next(
        new CustomError(
          "Failed to update user",
          500,
          "UserController.updateUser"
        )
      );
    }
  };

  // DELETE /users/:id
  static deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userSEQ = Number(req.params.id);
    try {
      const isDeleted = await userService.deleteUser(userSEQ);
      if (!isDeleted) {
        next(
          new CustomError("User not found", 404, "UserController.deleteUser")
        );
        return;
      }
      res.status(204).send();
    } catch (err) {
      next(
        new CustomError(
          "Failed to delete user",
          500,
          "UserController.deleteUser"
        )
      );
    }
  };
}
