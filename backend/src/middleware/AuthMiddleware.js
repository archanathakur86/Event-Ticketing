import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;

    if (!token) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.userId) {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    if (user.status === "inactive") {
      return res.status(403).json({
        message: "Account is inactive. Contact administrator.",
      });
    }

    req.user = user;
    req.userId = decoded.userId;

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);

    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Session expired. Please login again.",
      });
    }

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId) {
      req.user = null;
      return next();
    }

    const user = await User.findById(decoded.userId).select("-passwordHash");
    if (!user || user.status === "inactive") {
      req.user = null;
      return next();
    }

    req.user = user;
    req.userId = decoded.userId;
    return next();
  } catch (err) {
    req.user = null;
    return next();
  }
};
