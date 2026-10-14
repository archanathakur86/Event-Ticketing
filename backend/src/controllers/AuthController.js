import User from "../models/User.js";
import Log from "../models/Log.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const maxAge = 3 * 24 * 60 * 60 * 1000; // cookie maxAge in ms
const maxAgeSeconds = 3 * 24 * 60 * 60; // jwt expiresIn in seconds

const cookieOptions = {
  maxAge,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
}

const createToken = (email, userId) => {
  return jwt.sign({ email, userId }, process.env.JWT_SECRET, {
    expiresIn: maxAgeSeconds,
  });
};

const ensureDatabaseReady = (res) => {
  if (mongoose.connection.readyState === 1) return true;
  res.status(503).json({
    success: false,
    message: "Database is unavailable. Please try again in a moment.",
  });
  return false;
};

export const register = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).send("Please provide all required fields");
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });
    }

    const user = await User.create({
      fullName,
      email,
      phone,
      passwordHash: password,
    });

    const token = createToken(email, user.id);

    // Use SameSite=None so frontend dev (different port) can send cookie
    // Keep `secure` true only in production.
    res.cookie("jwt", token, cookieOptions);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.log({ error });
    return res.status(500).send("Internal Server Error");
  }
};

export const login = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send("Email and password are required");
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User with the given email not found",
      });
    }
    if (user.status === "inactive") {
      return res.status(403).json({
        message: "Account is inactive. Contact administrator.",
      });
    }
    const auth = await user.comparePassword(password);
    if (!auth) {
      return res.status(400).send("Password is incorrect.");
    }
    const token = createToken(email, user.id);
    res.cookie("jwt", token, cookieOptions);

    // Log this login event (include status)
    try {
      const entry = new Log({
        userId: user._id,
        type: 'login',
        message: 'User logged in',
        meta: { loginTime: new Date().toISOString(), status: 'Online' }
      })
      await entry.save()
    } catch (e) {
      console.warn('Failed to create login log', e)
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error during login",
    });
  }
};

export const profile = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).send("User with the given Id not found.");
    }
    const token = req.cookies?.jwt || null;
    res.status(200).json({
      success: true,
      message: "User information retrieved successfully",
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error during profile retrieval",
    });
  }
};

export const checkEmail = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const email = String(req.query.email || '').trim()
    if (!email) return res.status(400).json({ available: true })
    const user = await User.findOne({ email })
    return res.status(200).json({ available: user ? false : true })
  } catch (error) {
    console.error('checkEmail error:', error)
    return res.status(500).json({ available: true })
  }
}

export const logout = async (req, res, next) => {
  try {
    // Try to decode JWT to log logout event
    try {
      const token = req.cookies?.jwt
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const userId = decoded?.userId
        if (userId) {
          try {
            const entry = new Log({ userId, type: 'logout', message: 'User logged out', meta: { logoutTime: new Date().toISOString(), status: 'Offline' } })
            await entry.save()
          } catch (e) {
            console.warn('Failed to create logout log', e)
          }
        }
      }
    } catch (e) {
      // ignore token decode errors
    }

    res.cookie("jwt", "", {
      maxAge: 1,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    });
    return res.status(200).send("Logout successfully.");
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error during logout",
    });
  }
};
