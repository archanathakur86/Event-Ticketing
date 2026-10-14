import mongoose from "mongoose";
import User from "../models/User.js";

const allowedAdminRoles = ["super admin", "administration", "administrator", "admin"];

function normalizeRoleValue(role) {
  return String(role || "").toLowerCase().trim().replace(/[\s_-]+/g, "");
}

function hasAdminAccess(role) {
  const normalized = normalizeRoleValue(role);
  return allowedAdminRoles.some((entry) => normalizeRoleValue(entry) === normalized);
}

function normalizeAssignableRole(role) {
  const normalized = String(role || "").toLowerCase().trim();
  if (normalized === "admin") return "administration";
  if (normalized === "administrator") return "administration";
  return normalized;
}

// Helper to map user doc to frontend-friendly shape
function mapUser(u) {
  return {
    id: u._id,
    fullName: u.fullName || u.name || "",
    name: u.fullName || u.name || "",
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    profileImage: u.profileImage || null,
  };
}

export const getAllUsers = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // Only admin roles may list users
    if (!hasAdminAccess(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = {};
    if (normalizeRoleValue(req.user.role) !== "superadmin") query.role = { $ne: "super admin" };

    const users = await User.find(query).select("-passwordHash").sort({ createdAt: -1 });
    const mapped = users.map(mapUser);

    // Return array for frontend compatibility
    return res.status(200).json(mapped);
  } catch (error) {
    console.error("Get All Users Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user ID format" });

    const user = await User.findById(id).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Super admin can access anyone
    if (normalizeRoleValue(req.user.role) === "superadmin") return res.status(200).json(mapUser(user));

    // Administration cannot access super admin
    if (["administration", "administrator", "admin"].includes(String(req.user.role || "").toLowerCase())) {
      if (user.role === "super admin") return res.status(403).json({ message: "Access denied" });
      return res.status(200).json(mapUser(user));
    }

    // Regular users can only view themselves
    if (String(user._id) === String(req.user.id) || String(user._id) === String(req.user._id)) {
      return res.status(200).json(mapUser(user));
    }

    return res.status(403).json({ message: "Access denied" });
  } catch (error) {
    console.error("Get User By ID Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createUser = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!hasAdminAccess(req.user.role)) return res.status(403).json({ message: "Access denied" });

    let { fullName, email, phone, password, role, status } = req.body || {};
    if (!fullName || !email || !password) return res.status(400).json({ message: "Please provide all required fields" });

    role = normalizeAssignableRole(role || "student");
    status = String(status || "active").toLowerCase().trim();

    const allowedUserRoles = ["super admin", "administration", "coordinator", "student"];
    if (!allowedUserRoles.includes(role)) return res.status(400).json({ message: "Invalid role specified" });
    if (!["active", "inactive"].includes(status)) return res.status(400).json({ message: "Invalid status specified" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already registered" });

    const user = await User.create({ fullName, email, phone, passwordHash: password, role, status });

    return res.status(201).json({ message: "User created successfully", user: mapUser(user) });
  } catch (error) {
    console.error("Create User Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateUser = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user ID format" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isAdmin = hasAdminAccess(req.user.role);
    const isSelf = String(user._id) === String(req.user.id) || String(user._id) === String(req.user._id);

    if (!isAdmin && !isSelf) return res.status(403).json({ message: "Access denied" });

    if (normalizeRoleValue(req.user.role) !== "superadmin" && user.role === "super admin") {
      return res.status(403).json({ message: "Administration cannot modify super admin" });
    }

    const { fullName, name, email, phone, role, status, password, profileImage } = req.body || {};
    if (role) {
      if (!isAdmin) return res.status(403).json({ message: "Access denied" });
      if (
        (String(req.user.id) === String(user._id) || String(req.user._id) === String(user._id)) &&
        normalizeRoleValue(req.user.role) === "administration"
      ) {
        return res.status(403).json({ message: "Administrator cannot change their own role" });
      }
      let normalizedRole = normalizeAssignableRole(role);
      const allowedUserRoles = ["super admin", "administration", "coordinator", "student"];
      if (!allowedUserRoles.includes(normalizedRole)) return res.status(400).json({ message: "Invalid role value" });
      if (normalizeRoleValue(req.user.role) !== "superadmin" && normalizedRole === "super admin") {
        return res.status(403).json({ message: "Administration cannot assign super admin role" });
      }
      user.role = normalizedRole;
    }
    const resolvedName = fullName ?? name;
    if (typeof resolvedName === "string" && resolvedName.trim()) user.fullName = resolvedName.trim();
    if (typeof phone !== "undefined") user.phone = phone || null;
    if (typeof profileImage !== "undefined") user.profileImage = profileImage || null;
    if (typeof email === "string" && email.trim() && email.trim().toLowerCase() !== String(user.email || "").toLowerCase()) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existing) return res.status(409).json({ message: "Email already registered" });
      user.email = normalizedEmail;
    }
    if (status) {
      if (!isAdmin) return res.status(403).json({ message: "Access denied" });
      const normalizedStatus = String(status).toLowerCase().trim();
      if (!["active", "inactive"].includes(normalizedStatus)) return res.status(400).json({ message: "Invalid status value" });
      if (
        normalizedStatus === "inactive" &&
        (String(req.user.id) === String(user._id) || String(req.user._id) === String(user._id))
      ) {
        return res.status(403).json({ message: "You cannot disable your own account" });
      }
      user.status = normalizedStatus;
    }
    if (password && password.trim()) {
      if (!isAdmin) return res.status(403).json({ message: "Access denied" });
      user.passwordHash = password.trim();
    }

    await user.save();
    return res.status(200).json(mapUser(user));
  } catch (error) {
    console.error("Update User Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!hasAdminAccess(req.user.role)) return res.status(403).json({ message: "Access denied" });
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user ID format" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const status = String(req.body.status || "").toLowerCase().trim();
    if (!status) return res.status(400).json({ message: "Status is required" });
    if (!["active", "inactive"].includes(status)) return res.status(400).json({ message: "Invalid status value" });
    if (normalizeRoleValue(req.user.role) !== "superadmin" && user.role === "super admin") {
      return res.status(403).json({ message: "Administration cannot change super admin status" });
    }
    if (user.role === "super admin" && status === "inactive") return res.status(403).json({ message: "Cannot disable the super admin" });
    if (String(req.user.id) === String(user._id) && status === "inactive") return res.status(403).json({ message: "You cannot disable your own account" });

    user.status = status;
    await user.save();
    return res.status(200).json({ message: "User status updated successfully", user: mapUser(user) });
  } catch (error) {
    console.error("Update User Status Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!hasAdminAccess(req.user.role)) return res.status(403).json({ message: "Access denied" });
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user ID format" });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (String(req.user.id) === String(user._id)) return res.status(400).json({ message: "You cannot delete your own account" });
    if (normalizeRoleValue(req.user.role) !== "superadmin" && user.role === "super admin") {
      return res.status(403).json({ message: "Administration cannot delete super admin" });
    }
    if (user.role === "super admin") return res.status(400).json({ message: "Cannot delete the super admin" });
    await User.findByIdAndDelete(id);
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete User Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export default { getAllUsers, getUserById, createUser, updateUser, updateUserStatus, deleteUser };
