import { Router } from 'express';
import { db, ResultSetHeader } from '../config/db.ts';
import { authenticateToken, requireAdmin } from '../middleware/auth.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const params: any[] = [];
    let where = '';
    if (q) {
      where = 'WHERE c.Name LIKE ?';
      params.push(`%${q}%`);
    }

    const [rows] = await db.execute<any[]>(
      `SELECT c.Cast_ID, c.Name, c.Gender, c.Date_of_Birth, c.Bio, c.Photo_URL,
              COUNT(mr.Role_ID) AS Role_Count
       FROM Movie_Cast c
       LEFT JOIN Movie_Role mr ON c.Cast_ID = mr.Cast_ID
       ${where}
       GROUP BY c.Cast_ID, c.Name, c.Gender, c.Date_of_Birth, c.Bio, c.Photo_URL
       ORDER BY c.Name ASC`,
      params
    );
    res.json({ cast: rows });
  })
);

router.post(
  '/',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const name = String(req.body.Name || '').trim();
    const gender = req.body.Gender ? String(req.body.Gender).trim() : null;
    const dob = req.body.Date_of_Birth ? String(req.body.Date_of_Birth).trim() : null;
    const bio = req.body.Bio ? String(req.body.Bio).trim() : null;
    const photoUrl = req.body.Photo_URL ? String(req.body.Photo_URL).trim() : null;

    if (!name || name.length > 100) {
      throw new AppError('Cast member name is required (max 100 characters).', 400);
    }

    const [result] = await db.execute<ResultSetHeader>(
      'INSERT INTO Movie_Cast (Name, Gender, Date_of_Birth, Bio, Photo_URL) VALUES (?, ?, ?, ?, ?)',
      [name, gender, dob, bio, photoUrl]
    );

    const [rows] = await db.execute<any[]>(
      'SELECT * FROM Movie_Cast WHERE Cast_ID = ?',
      [result.insertId]
    );

    res.status(201).json({ castMember: { ...rows[0], Role_Count: 0 } });
  })
);

router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid cast ID.', 400);
    }

    const name = String(req.body.Name || '').trim();
    const gender = req.body.Gender ? String(req.body.Gender).trim() : null;
    const dob = req.body.Date_of_Birth ? String(req.body.Date_of_Birth).trim() : null;
    const bio = req.body.Bio ? String(req.body.Bio).trim() : null;
    const photoUrl = req.body.Photo_URL ? String(req.body.Photo_URL).trim() : null;

    if (!name || name.length > 100) {
      throw new AppError('Cast member name is required (max 100 characters).', 400);
    }

    const [result] = await db.execute<ResultSetHeader>(
      'UPDATE Movie_Cast SET Name = ?, Gender = ?, Date_of_Birth = ?, Bio = ?, Photo_URL = ? WHERE Cast_ID = ?',
      [name, gender, dob, bio, photoUrl, id]
    );
    if (result.affectedRows === 0) {
      throw new AppError('Cast member not found.', 404);
    }

    const [rows] = await db.execute<any[]>(
      'SELECT * FROM Movie_Cast WHERE Cast_ID = ?',
      [id]
    );
    res.json({ castMember: rows[0] });
  })
);

router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid cast ID.', 400);
    }

    const [refs] = await db.execute<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM Movie_Role WHERE Cast_ID = ?',
      [id]
    );
    if (Number(refs[0]?.cnt || 0) > 0) {
      throw new AppError(
        `Cannot delete cast member: they are assigned to ${refs[0].cnt} movie role(s). Remove those role assignments first.`,
        409
      );
    }

    const [result] = await db.execute<ResultSetHeader>(
      'DELETE FROM Movie_Cast WHERE Cast_ID = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      throw new AppError('Cast member not found.', 404);
    }

    res.json({ message: 'Cast member deleted successfully.' });
  })
);

export default router;
