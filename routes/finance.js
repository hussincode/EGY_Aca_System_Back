import express from 'express';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { getFinanceRecords, createFinanceRecord, updateFinanceRecord, deleteFinanceRecord } from '../controllers/financeController.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'manager', 'accountant'), getFinanceRecords);
router.post('/', protect, authorizeRoles('admin', 'manager', 'accountant'), createFinanceRecord);
router.put('/:id', protect, authorizeRoles('admin', 'manager', 'accountant'), updateFinanceRecord);
router.delete('/:id', protect, authorizeRoles('admin', 'manager', 'accountant'), deleteFinanceRecord);

export default router;
