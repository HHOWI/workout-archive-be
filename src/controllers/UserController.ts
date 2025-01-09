import { Request, Response } from "express";
import { UserService } from "../services/UserService";

const userService = new UserService();

export class UserController {
  // GET /users
  static async getAllUsers(req: Request, res: Response) {
    try {
      const users = await userService.findAll();
      return res.json(users);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /users/:id
  static async getUserById(req: Request, res: Response) {
    const userSEQ = Number(req.params.id);
    try {
      const user = await userService.findById(userSEQ);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.json(user);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /users
  static async createUser(req: Request, res: Response) {
    const { id, pw, email, nickname } = req.body;
    try {
      const newUser = await userService.createUser({ id, pw, email, nickname });
      return res.status(201).json(newUser);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT /users/:id
  static async updateUser(req: Request, res: Response) {
    const userSEQ = Number(req.params.id);
    const dto = req.body; // { pw, email, nickname } 등
    try {
      const updated = await userService.updateUser(userSEQ, dto);
      if (!updated) {
        return res
          .status(404)
          .json({ message: "User not found or no changes" });
      }
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE /users/:id
  static async deleteUser(req: Request, res: Response) {
    const userSEQ = Number(req.params.id);
    try {
      const ok = await userService.deleteUser(userSEQ);
      if (!ok) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(204).send();
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
