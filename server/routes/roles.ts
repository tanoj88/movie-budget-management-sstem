import { Router } from 'express';
import { db, ResultSetHeader } from '../config/db.ts';
import { authenticateToken, requireAdmin } from '../middleware/auth.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const movieId = req.query.movieId ? Number(req.query.movieId) : null;
    const params: any[] = [];
    let where = '';
    if (movieId) {
      where = 'WHERE mr.Movie_ID = ?';
      params.push(movieId);
    }

    const [rows] = await db.execute<any[]>(
      `SELECT mr.Role_ID, mr.Movie_ID, mr.Cast_ID, mr.Role_Name,
              m.Title AS Movie_Title, c.Name AS Cast_Name, c.Photo_URL AS Cast_Photo_URL
       FROM Movie_Role mr
       INNER JOIN Movie m ON mr.Movie_ID = m.Movie_ID
       INNER JOIN Movie_Cast c ON mr.Cast_ID = c.Cast_ID
       ${where}
       ORDER BY m.Title ASC, mr.Role_ID ASC`,
      params
    );
    res.json({ roles: rows });
  })
);

router.get(
  '/movie/:movieId',
  asyncHandler(async (req, res) => {
    const movieId = Number(req.params.movieId);
    if (!Number.isInteger(movieId) || movieId <= 0) {
      throw new AppError('Invalid movie ID.', 400);
    }

    const [rows] = await db.execute<any[]>(
      `SELECT mr.Role_ID, mr.Movie_ID, mr.Cast_ID, mr.Role_Name,
              c.Name AS Cast_Name, c.Gender, c.Photo_URL AS Cast_Photo_URL
       FROM Movie_Role mr
       INNER JOIN Movie_Cast c ON mr.Cast_ID = c.Cast_ID
       WHERE mr.Movie_ID = ?
       ORDER BY mr.Role_ID ASC`,
      [movieId]
    );
    res.json({ roles: rows });
  })
);

router.post(
  '/',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const movieId = Number(req.body.Movie_ID);
    const castId = Number(req.body.Cast_ID);
    const roleName = String(req.body.Role_Name || '').trim();

    if (!Number.isInteger(movieId) || movieId <= 0) {
      throw new AppError('Valid Movie_ID is required.', 400);
    }
    if (!Number.isInteger(castId) || castId <= 0) {
      throw new AppError('Valid Cast_ID is required.', 400);
    }
    if (!roleName || roleName.length > 100) {
      throw new AppError('Role name is required (max 100 characters).', 400);
    }

    const [movies] = await db.execute<any[]>('SELECT Movie_ID FROM Movie WHERE Movie_ID = ?', [movieId]);
    if (movies.length === 0) throw new AppError('Selected movie does not exist.', 404);

    const [cast] = await db.execute<any[]>('SELECT Cast_ID FROM Movie_Cast WHERE Cast_ID = ?', [castId]);
    if (cast.length === 0) throw new AppError('Selected cast member does not exist.', 404);

    const [result] = await db.execute<ResultSetHeader>(
      'INSERT INTO Movie_Role (Movie_ID, Cast_ID, Role_Name) VALUES (?, ?, ?)',
      [movieId, castId, roleName]
    );

    const [rows] = await db.execute<any[]>(
      `SELECT mr.Role_ID, mr.Movie_ID, mr.Cast_ID, mr.Role_Name,
              m.Title AS Movie_Title, c.Name AS Cast_Name, c.Photo_URL AS Cast_Photo_URL
       FROM Movie_Role mr
       INNER JOIN Movie m ON mr.Movie_ID = m.Movie_ID
       INNER JOIN Movie_Cast c ON mr.Cast_ID = c.Cast_ID
       WHERE mr.Role_ID = ?`,
      [result.insertId]
    );

    res.status(201).json({ role: rows[0] });
  })
);

router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid role assignment ID.', 400);
    }

    const [result] = await db.execute<ResultSetHeader>(
      'DELETE FROM Movie_Role WHERE Role_ID = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      throw new AppError('Role assignment not found.', 404);
    }

    res.json({ message: 'Cast role removed successfully.' });
  })
);

export default router;
