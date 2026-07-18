import express from 'express';
import { body } from 'express-validator';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getAmbassadors, createAmbassador, updateAmbassador, deleteAmbassador } from '../controllers/ambassadorsController.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'manager', 'coach', 'accountant'), getAmbassadors);
router.post(
  '/',
  protect,
  authorizeRoles('admin', 'manager'),
  [body('name').isString().notEmpty(), body('phone').optional().isString(), body('branch_id').optional().isUUID(), body('notes').optional().isString()],
  validate,
  createAmbassador,
);
router.put('/:id', protect, authorizeRoles('admin', 'manager'), updateAmbassador);
router.delete('/:id', protect, authorizeRoles('admin', 'manager'), deleteAmbassador);

export default router;
