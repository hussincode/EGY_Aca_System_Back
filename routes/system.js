import express from 'express';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { resetDatabaseExceptUsers } from '../controllers/systemController.js';

const router = express.Router();

// Only admin & manager can reset database
router.post('/reset-except-users', protect, authorizeRoles('admin', 'manager'), resetDatabaseExceptUsers);

export default router;
