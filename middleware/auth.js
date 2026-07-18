import jwt from 'jsonwebtoken';

import { getPool, sql } from '../config/db.js';

function extractToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const parts = String(auth).split(' ');
  if (parts.length !== 2) return null;
  if (parts[0] !== 'Bearer') return null;
  return parts[1];
}

export function protect(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, email, name }
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function authorizeRoles(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole) return res.status(403).json({ message: 'Forbidden' });
    if (!roles.includes(userRole)) return res.status(403).json({ message: 'Forbidden' });
    return next();
  };
}

