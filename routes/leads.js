import express from 'express';
import { body } from 'express-validator';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getLeads, createLead, updateLead, deleteLead } from '../controllers/leadsController.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'manager', 'coach', 'accountant'), getLeads);
// Public endpoint for trial bookings from landing page
router.post(
  '/',
  [
    body('name').isString().notEmpty(),
    body('phone').isString().notEmpty(),
    body('interest').optional().isString(),
    body('status').optional().isString(),
    body('branch_id').optional({ nullable: true, checkFalsy: true }),
    body('notes').optional().isString(),
  ],
  validate,
  createLead,
);
router.put('/:id', protect, authorizeRoles('admin', 'manager', 'coach', 'accountant'), updateLead);
router.delete('/:id', protect, authorizeRoles('admin', 'manager', 'coach', 'accountant'), deleteLead);

export default router;
