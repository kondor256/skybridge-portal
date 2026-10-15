const express = require('express');
const { pool } = require('../db');
const { HttpError } = require('../middleware/error');
const { requireAdmin } = require('../middleware/auth');
const { validateProduct, parseId } = require('../middleware/validate');

const PRODUCT_SELECT = `
  SELECT p.id, p.name, p.summary, p.description, p.features, p.price, p.unit, p.duration,
         p.image_url AS "imageUrl", p.is_active AS "isActive",
         p.created_at AS "createdAt", p.updated_at AS "updatedAt",
         c.id AS "categoryId", c.name AS category, c.slug AS "categorySlug"
  FROM products p
  JOIN categories c ON c.id = p.category_id`;

async function findProduct(id) {
  const { rows } = await pool.query(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]);
  return rows[0];
}

// A category id that does not exist breaks the foreign key (23503).
function translateDbError(err) {
  if (err.code === '23503') {
    throw new HttpError(400, 'Please correct the highlighted fields.', { categoryId: 'Choose a category.' });
  }
  throw err;
}

// ---- Public catalogue: /api/categories and /api/products ------------------
const categories = express.Router();

categories.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.slug, c.description,
            count(p.id) FILTER (WHERE p.is_active)::int AS "productCount"
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id
     ORDER BY c.id`,
  );
  res.json({ categories: rows });
});

const catalogue = express.Router();

catalogue.get('/', async (req, res) => {
  const conditions = ['p.is_active'];
  const params = [];
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';

  if (category) {
    params.push(category);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (search) {
    // Escape LIKE wildcards so the text is searched literally.
    params.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.summary ILIKE $${params.length})`);
  }

  const { rows } = await pool.query(
    `${PRODUCT_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY c.id, p.id`,
    params,
  );
  res.json({ products: rows });
});

catalogue.get('/:id', async (req, res) => {
  const product = await findProduct(parseId(req.params.id));
  if (!product || !product.isActive) {
    throw new HttpError(404, 'This service package is no longer available.');
  }
  res.json({ product });
});

// ---- Admin CMS: /api/admin/products ---------------------------------------
const admin = express.Router();
admin.use(requireAdmin);

admin.get('/', async (req, res) => {
  const { rows } = await pool.query(`${PRODUCT_SELECT} ORDER BY p.id`);
  res.json({ products: rows });
});

admin.post('/', async (req, res) => {
  const p = validateProduct(req.body);
  const { rows } = await pool
    .query(
      `INSERT INTO products (category_id, name, summary, description, features, price, unit, duration, image_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [p.categoryId, p.name, p.summary, p.description, p.features, p.price, p.unit, p.duration, p.imageUrl, p.isActive],
    )
    .catch(translateDbError);
  res.status(201).json({ product: await findProduct(rows[0].id) });
});

admin.put('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const p = validateProduct(req.body);
  const { rowCount } = await pool
    .query(
      `UPDATE products
       SET category_id = $1, name = $2, summary = $3, description = $4, features = $5, price = $6,
           unit = $7, duration = $8, image_url = $9, is_active = $10, updated_at = now()
       WHERE id = $11`,
      [p.categoryId, p.name, p.summary, p.description, p.features, p.price, p.unit, p.duration, p.imageUrl, p.isActive, id],
    )
    .catch(translateDbError);
  if (rowCount === 0) {
    throw new HttpError(404, 'This service package no longer exists.');
  }
  res.json({ product: await findProduct(id) });
});

admin.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [parseId(req.params.id)]);
  if (rowCount === 0) {
    throw new HttpError(404, 'This service package no longer exists.');
  }
  res.status(204).end();
});

module.exports = { categories, catalogue, admin };
