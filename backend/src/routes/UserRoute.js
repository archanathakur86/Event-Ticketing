import { Router } from 'express'
import { getAllUsers, getUserById, createUser, updateUser, updateUserStatus, deleteUser } from '../controllers/UserController.js'
import { verifyToken } from '../middleware/AuthMiddleware.js'
import { requireRole } from '../middleware/RoleMiddleware.js'

const router = Router()

// List/create/update/delete users: restricted to admin roles
router.get('/', verifyToken, requireRole(['super admin', 'administration', 'administrator', 'admin']), getAllUsers)
router.post('/', verifyToken, requireRole(['super admin', 'administration', 'administrator', 'admin']), createUser)

// Retrieve a single user: allow authenticated users (controller enforces access rules)
router.get('/:id', verifyToken, getUserById)

// Update user (partial): authenticated users can update themselves, controller enforces access rules
router.patch('/:id', verifyToken, updateUser)
router.patch('/:id/status', verifyToken, requireRole(['super admin', 'administration', 'administrator', 'admin']), updateUserStatus)

// Delete
router.delete('/:id', verifyToken, requireRole(['super admin', 'administration', 'administrator', 'admin']), deleteUser)

export default router
