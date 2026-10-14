import { Router } from "express";
import { verifyToken } from "../middleware/AuthMiddleware.js";
import {
  markAttendance,
  getAttendanceByEvent,
  exportAttendance,
  fetchAllAttendance,
  fetchStudentAttendance,
} from "../controllers/AttendanceController.js";

const attendanceRoutes = Router();

attendanceRoutes.post("/mark", verifyToken, markAttendance);
attendanceRoutes.get("/students", verifyToken, fetchStudentAttendance);
attendanceRoutes.get("/", verifyToken, fetchAllAttendance);
attendanceRoutes.get("/:eventId", verifyToken, getAttendanceByEvent);
attendanceRoutes.get("/export/:eventId", verifyToken, exportAttendance);

export default attendanceRoutes;
