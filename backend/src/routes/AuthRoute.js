import { Router } from "express";
import {
  login,
  register,
  profile,
  logout,
  checkEmail,
} from "../controllers/AuthController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";

const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.get("/check-email", checkEmail);
authRoutes.get("/profile", verifyToken, profile);
authRoutes.post("/logout", logout);
export default authRoutes;
