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
  [
    body('player_id').isString().notEmpty(),
    body('status').isString().notEmpty(),
    body('date').optional().isString(),
    body('subscription_id').optional().isString(),
    body('player_name').optional().isString(),
  ],
  validate,
  createAttendance,
);
router.put('/:id', protect, authorizeRoles('admin', 'manager', 'coach', 'accountant'), updateAttendance);
router.delete('/:id', protect, authorizeRoles('admin', 'manager', 'coach', 'accountant'), deleteAttendance);

export default router;
