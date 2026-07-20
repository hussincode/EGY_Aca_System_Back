import express from 'express';
import { body } from 'express-validator';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getUsers, updateUser, deleteUser } from '../controllers/usersController.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'manager', 'coach', 'accountant'), getUsers);
router.put(
  '/:id',
  protect,
  authorizeRoles('admin', 'manager'),
  [body('email').optional().isEmail(), body('password').optional().isString().isLength({ min: 6 }), body('name').optional().isString(), body('role').optional().isIn(['admin', 'manager', 'coach', 'accountant']), body('branch_id').optional().isUUID()],
  validate,
  updateUser,
);
router.delete('/:id', protect, authorizeRoles('admin', 'manager'), deleteUser);

export default router;
