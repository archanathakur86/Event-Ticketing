import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;

    if (!token) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.userId) {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    // fetch user from DB
    const user = await User.findById(decoded.userId).select("role");

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    if (user.role !== "super admin") {
      return res.status(403).json({
        message: "Super admin access only",
      });
    }

    // attach user if needed later
    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};
