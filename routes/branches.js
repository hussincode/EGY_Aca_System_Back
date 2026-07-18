import express from 'express';
import { body } from 'express-validator';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../controllers/branchesController.js';

const router = express.Router();

router.get('/', protect, getBranches);
router.post(
  '/',
  protect,
  authorizeRoles('admin'),
  [body('name').isString().notEmpty(), body('manager').optional().isString(), body('location').optional().isString()],
  validate,
  createBranch,
);
router.put(
  '/:id',
  protect,
  authorizeRoles('admin'),
  [body('name').isString().notEmpty(), body('manager').optional().isString(), body('location').optional().isString()],
  validate,
  updateBranch,
);
router.delete('/:id', protect, authorizeRoles('admin'), deleteBranch);

export default router;
