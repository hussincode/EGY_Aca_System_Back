import express from 'express';
import { body } from 'express-validator';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getFinanceRecords, createFinanceRecord, updateFinanceRecord, deleteFinanceRecord } from '../controllers/financeController.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'manager', 'accountant'), getFinanceRecords);
router.post(
  '/',
  protect,
  authorizeRoles('admin', 'manager', 'accountant'),
  [
    body('type').isString().notEmpty(),
    body('category').isString().notEmpty(),
    body('amount').isNumeric(),
    body('date').isISO8601(),
    body('branch_id').optional().isUUID(),
    body('related_to').optional().isString(),
    body('description').optional().isString(),
    body('source').optional().isString(),
    body('source_id').optional().isUUID(),
    body('created_by_id').optional().isUUID(),
  ],
  validate,
  createFinanceRecord,
);
router.put(
  '/:id',
  protect,
  authorizeRoles('admin', 'manager', 'accountant'),
  [
    body('type').isString().notEmpty(),
    body('category').isString().notEmpty(),
    body('amount').isNumeric(),
    body('date').isISO8601(),
    body('branch_id').optional().isUUID(),
    body('related_to').optional().isString(),
    body('description').optional().isString(),
    body('source').optional().isString(),
    body('source_id').optional().isUUID(),
  ],
  validate,
  updateFinanceRecord,
);
router.delete('/:id', protect, authorizeRoles('admin', 'manager', 'accountant'), deleteFinanceRecord);

export default router;
