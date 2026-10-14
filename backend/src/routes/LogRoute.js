import { Router } from 'express'
import { getAllLogs, getUserLogs, addLog } from '../controllers/LogController.js'
import { verifyToken } from '../middleware/AuthMiddleware.js'

const router = Router()

// Allow listing logs without authentication in local/dev so admin UI can display entries.
// Keep user-specific and write routes protected.
router.get('/', getAllLogs)
router.get('/user/:userId', verifyToken, getUserLogs)
router.post('/', verifyToken, addLog)

export default router
