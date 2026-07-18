import express from 'express';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { getAuditLogs } from '../controllers/auditController.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'manager', 'coach', 'accountant'), getAuditLogs);

export default router;
