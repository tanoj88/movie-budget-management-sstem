import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, ResultSetHeader } from '../config/db.ts';
import { authenticateToken, AuthRequest, getJwtSecret, requireAdmin } from '../middleware/auth.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';

const router = Router();

interface UserRow {
  User_ID: number;
  Name: string;
  Email: string;
  Password: string;
  Role: 'Admin' | 'User';
}

function signToken(user: { User_ID: number; Name: string; Email: string; Role: 'Admin' | 'User' }): string {
  return jwt.sign(
    {
      userId: user.User_ID,
      name: user.Name,
      email: user.Email,
      role: user.Role,
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (name.length < 2 || name.length > 100) {
      throw new AppError('Name must be between 2 and 100 characters.', 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Please provide a valid email address.', 400);
    }
    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters long.', 400);
    }

    const [existing] = await db.execute<UserRow[]>(
      'SELECT User_ID FROM Users WHERE Email = ?',
      [email]
    );
    if (existing.length > 0) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.execute<ResultSetHeader>(
      'INSERT INTO Users (Name, Email, Password, Role) VALUES (?, ?, ?, ?)',
      [name, email, hashed, 'User']
    );

    const newUser = {
      User_ID: result.insertId,
      Name: name,
      Email: email,
      Role: 'User' as const,
    };

    res.status(201).json({
      token: signToken(newUser),
      user: {
        userId: newUser.User_ID,
        name: newUser.Name,
        email: newUser.Email,
        role: newUser.Role,
      },
    });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      throw new AppError('Email and password are required.', 400);
    }

    const [rows] = await db.execute<UserRow[]>(
      'SELECT User_ID, Name, Email, Password, Role FROM Users WHERE Email = ?',
      [email]
    );

    if (rows.length === 0) {
      throw new AppError('Invalid email or password.', 401);
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.Password);
    if (!valid) {
      throw new AppError('Invalid email or password.', 401);
    }

    res.json({
      token: signToken(user),
      user: {
        userId: user.User_ID,
        name: user.Name,
        email: user.Email,
        role: user.Role,
      },
    });
  })
);

router.get(
  '/me',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const [rows] = await db.execute<UserRow[]>(
      'SELECT User_ID, Name, Email, Role FROM Users WHERE User_ID = ?',
      [req.user!.userId]
    );
    if (rows.length === 0) {
      throw new AppError('User account not found.', 404);
    }
    const u = rows[0];
    res.json({
      user: {
        userId: u.User_ID,
        name: u.Name,
        email: u.Email,
        role: u.Role,
      },
    });
  })
);

router.get(
  '/users',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const [rows] = await db.execute<any[]>(
      `SELECT u.User_ID, u.Name, u.Email, u.Role, COUNT(r.Review_ID) AS Review_Count
       FROM Users u
       LEFT JOIN Review r ON u.User_ID = r.User_ID
       GROUP BY u.User_ID, u.Name, u.Email, u.Role
       ORDER BY u.User_ID ASC`
    );
    res.json({ users: rows });
  })
);

router.put(
  '/users/:id/role',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res) => {
    const targetId = Number(req.params.id);
    const role = String(req.body.role || '');

    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new AppError('Invalid user ID.', 400);
    }
    if (role !== 'Admin' && role !== 'User') {
      throw new AppError('Role must be either Admin or User.', 400);
    }
    if (targetId === req.user!.userId && role !== 'Admin') {
      throw new AppError('You cannot downgrade your own Administrator role.', 400);
    }

    const [result] = await db.execute<ResultSetHeader>(
      'UPDATE Users SET Role = ? WHERE User_ID = ?',
      [role, targetId]
    );
    if (result.affectedRows === 0) {
      throw new AppError('User not found.', 404);
    }

    res.json({ message: 'User role updated successfully.' });
  })
);

router.delete(
  '/users/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res) => {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new AppError('Invalid user ID.', 400);
    }
    if (targetId === req.user!.userId) {
      throw new AppError('You cannot delete your own active account.', 400);
    }

    const [refs] = await db.execute<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM Review WHERE User_ID = ?',
      [targetId]
    );
    if (Number(refs[0]?.cnt || 0) > 0) {
      throw new AppError(
        `Cannot delete user: this user has ${refs[0].cnt} published review(s). Delete their reviews first.`,
        409
      );
    }

    const [result] = await db.execute<ResultSetHeader>(
      'DELETE FROM Users WHERE User_ID = ?',
      [targetId]
    );
    if (result.affectedRows === 0) {
      throw new AppError('User not found.', 404);
    }

    res.json({ message: 'User deleted successfully.' });
  })
);

export default router;
