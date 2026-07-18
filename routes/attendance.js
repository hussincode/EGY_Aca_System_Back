import express from 'express';
import { body } from 'express-validator';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getAttendance, createAttendance, updateAttendance, deleteAttendance } from '../controllers/attendanceController.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'manager', 'coach', 'accountant'), getAttendance);
router.post(
  '/',
  protect,
  authorizeRoles('admin', 'manager', 'coach', 'accountant'),
  [body('player_id').isUUID(), body('status').isString().notEmpty(), body('date').optional().isISO8601(), body('subscription_id').optional().isUUID()],
  validate,
  createAttendance,
);
router.put('/:id', protect, authorizeRoles('admin', 'manager', 'coach', 'accountant'), updateAttendance);
router.delete('/:id', protect, authorizeRoles('admin', 'manager', 'coach', 'accountant'), deleteAttendance);

export default router;
