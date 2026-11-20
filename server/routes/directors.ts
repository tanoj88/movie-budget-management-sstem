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
      where = 'WHERE d.Name LIKE ?';
      params.push(`%${q}%`);
    }

    const [rows] = await db.execute<any[]>(
      `SELECT d.Director_ID, d.Name, d.Gender, d.Date_of_Birth, d.Bio, d.Photo_URL,
              COUNT(m.Movie_ID) AS Movie_Count
       FROM Director d
       LEFT JOIN Movie m ON d.Director_ID = m.Director_ID
       ${where}
       GROUP BY d.Director_ID, d.Name, d.Gender, d.Date_of_Birth, d.Bio, d.Photo_URL
       ORDER BY d.Name ASC`,
      params
    );
    res.json({ directors: rows });
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
      throw new AppError('Director name is required (max 100 characters).', 400);
    }

    const [result] = await db.execute<ResultSetHeader>(
      'INSERT INTO Director (Name, Gender, Date_of_Birth, Bio, Photo_URL) VALUES (?, ?, ?, ?, ?)',
      [name, gender, dob, bio, photoUrl]
    );

    const [rows] = await db.execute<any[]>(
      'SELECT * FROM Director WHERE Director_ID = ?',
      [result.insertId]
    );

    res.status(201).json({ director: { ...rows[0], Movie_Count: 0 } });
  })
);

router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid director ID.', 400);
    }

    const name = String(req.body.Name || '').trim();
    const gender = req.body.Gender ? String(req.body.Gender).trim() : null;
    const dob = req.body.Date_of_Birth ? String(req.body.Date_of_Birth).trim() : null;
    const bio = req.body.Bio ? String(req.body.Bio).trim() : null;
    const photoUrl = req.body.Photo_URL ? String(req.body.Photo_URL).trim() : null;

    if (!name || name.length > 100) {
      throw new AppError('Director name is required (max 100 characters).', 400);
    }

    const [result] = await db.execute<ResultSetHeader>(
      'UPDATE Director SET Name = ?, Gender = ?, Date_of_Birth = ?, Bio = ?, Photo_URL = ? WHERE Director_ID = ?',
      [name, gender, dob, bio, photoUrl, id]
    );
    if (result.affectedRows === 0) {
      throw new AppError('Director not found.', 404);
    }

    const [rows] = await db.execute<any[]>(
      'SELECT * FROM Director WHERE Director_ID = ?',
      [id]
    );
    res.json({ director: rows[0] });
  })
);

router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid director ID.', 400);
    }

    const [refs] = await db.execute<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM Movie WHERE Director_ID = ?',
      [id]
    );
    if (Number(refs[0]?.cnt || 0) > 0) {
      throw new AppError(
        `Cannot delete director: they are linked to ${refs[0].cnt} movie(s). Reassign or remove those movies first.`,
        409
      );
    }

    const [result] = await db.execute<ResultSetHeader>(
      'DELETE FROM Director WHERE Director_ID = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      throw new AppError('Director not found.', 404);
    }

    res.json({ message: 'Director deleted successfully.' });
  })
);

export default router;
