import express from 'express';
import { body } from 'express-validator';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getStaff, createStaff, updateStaff, deleteStaff } from '../controllers/staffController.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'manager', 'coach', 'accountant'), getStaff);
router.post(
  '/',
  protect,
  authorizeRoles('admin', 'manager'),
  [
    body('name').isString().notEmpty(),
    body('role').isString().notEmpty(),
    body('staff_serial').optional().isString(),
    body('phone').optional().isString(),
    body('pay_type').optional().isString(),
    body('rate').optional().isNumeric(),
    body('hours').optional().isNumeric(),
    body('revenue').optional().isNumeric(),
    body('branch_id').optional().isUUID(),
  ],
  validate,
  createStaff,
);
router.put('/:id', protect, authorizeRoles('admin', 'manager'), updateStaff);
router.delete('/:id', protect, authorizeRoles('admin', 'manager'), deleteStaff);

export default router;
