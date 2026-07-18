import express from 'express';
import { body } from 'express-validator';

import { register, login, me } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.post(
  '/register',
  [
    body('name').isString().notEmpty(),
    body('email').isEmail(),
    body('password').isString().isLength({ min: 6 }),
    body('role').isString().isIn(['admin', 'manager', 'coach', 'accountant']),
    body('branch_id').optional().isUUID(),
  ],
  validate,
  register,
);

router.post(
  '/login',
  [body('email').isEmail(), body('password').isString().notEmpty()],
  validate,
  login,
);

router.get('/me', protect, me);

export default router;


