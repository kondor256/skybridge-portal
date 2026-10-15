const express = require('express');
const { pool } = require('../db');
const { HttpError } = require('../middleware/error');
const { validateQuantity, parseId } = require('../middleware/validate');
const { findCartId, ensureCartId, loadCart } = require('../cart');

const router = express.Router();

router.get('/', async (req, res) => {
  res.json({ cart: await loadCart(await findCartId(req)) });
});

// Add a package; adding the same package again increases its quantity.
router.post('/items', async (req, res) => {
  const quantity = validateQuantity(req.body?.quantity ?? 1);
  const productId = parseId(req.body?.productId);

  const { rows } = await pool.query('SELECT id FROM products WHERE id = $1 AND is_active', [productId]);
  if (rows.length === 0) {
    throw new HttpError(404, 'This service package is no longer available.');
  }

  const cartId = await ensureCartId(req);
  await pool.query(
    `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (cart_id, product_id)
     DO UPDATE SET quantity = LEAST(99, cart_items.quantity + EXCLUDED.quantity)`,
    [cartId, productId, quantity],
  );
  res.status(201).json({ cart: await loadCart(cartId) });
});

router.patch('/items/:productId', async (req, res) => {
  const productId = parseId(req.params.productId);
  const quantity = validateQuantity(req.body?.quantity);
  const cartId = await findCartId(req);

  const { rowCount } = await pool.query(
    'UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND product_id = $3',
    [quantity, cartId, productId],
  );
  if (rowCount === 0) {
    throw new HttpError(404, 'This item is not in your cart.');
  }
  res.json({ cart: await loadCart(cartId) });
});

router.delete('/items/:productId', async (req, res) => {
  const cartId = await findCartId(req);
  await pool.query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [
    cartId,
    parseId(req.params.productId),
  ]);
  res.json({ cart: await loadCart(cartId) });
});

router.delete('/', async (req, res) => {
  const cartId = await findCartId(req);
  await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
  res.json({ cart: await loadCart(cartId) });
});

module.exports = router;
