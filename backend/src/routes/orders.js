const express = require('express');
const { pool, withTransaction } = require('../db');
const { HttpError } = require('../middleware/error');
const { requireLogin } = require('../middleware/auth');
const { validateCheckout, parseId } = require('../middleware/validate');
const { findCartId, loadCart } = require('../cart');
const { encrypt } = require('../crypto/fieldCrypto');
const { decryptRow } = require('../crypto/fields');

const router = express.Router();
router.use(requireLogin);

// A3: stored as AES-256-GCM ciphertext, decrypted only for the customer who owns the order.
const ENCRYPTED_FIELDS = ['companyName', 'contactPhone', 'notes'];
const decryptOrder = (order, req) => decryptRow(order, ENCRYPTED_FIELDS, { req, table: 'orders' });

const ORDER_SELECT = `
  SELECT o.id, o.status, o.company_name AS "companyName", o.contact_phone AS "contactPhone", o.notes,
         o.subtotal, o.gst, o.total, o.created_at AS "createdAt",
         COALESCE(
           json_agg(json_build_object(
             'productId', oi.product_id, 'name', oi.product_name, 'unit', oi.unit,
             'unitPrice', oi.unit_price, 'quantity', oi.quantity,
             'lineTotal', oi.unit_price * oi.quantity
           ) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL),
           '[]'
         ) AS items
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id`;

// Checkout: the cart becomes an order. One transaction, so an order is never
// saved without its items and the cart is emptied only if the order was saved.
router.post('/', async (req, res) => {
  if (req.session.role !== 'customer') {
    throw new HttpError(403, 'Only customer accounts can place orders.');
  }
  const { companyName, contactPhone, notes } = validateCheckout(req.body);

  const orderId = await withTransaction(async (client) => {
    const cartId = await findCartId(req, client);
    const cart = await loadCart(cartId, client);
    if (cart.items.length === 0) {
      throw new HttpError(400, 'Your cart is empty.');
    }

    const { rows } = await client.query(
      `INSERT INTO orders (user_id, company_name, contact_phone, notes, subtotal, gst, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [req.session.userId, encrypt(companyName), encrypt(contactPhone), encrypt(notes), cart.subtotal, cart.gst, cart.total],
    );
    for (const item of cart.items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [rows[0].id, item.productId, item.name, item.unit, item.price, item.quantity],
      );
    }
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    return rows[0].id;
  });

  const { rows } = await pool.query(`${ORDER_SELECT} WHERE o.id = $1 GROUP BY o.id`, [orderId]);
  res.status(201).json({ order: await decryptOrder(rows[0], req) });
});

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `${ORDER_SELECT} WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC, o.id DESC`,
    [req.session.userId],
  );
  res.json({ orders: await Promise.all(rows.map((order) => decryptOrder(order, req))) });
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(`${ORDER_SELECT} WHERE o.id = $1 AND o.user_id = $2 GROUP BY o.id`, [
    parseId(req.params.id),
    req.session.userId,
  ]);
  if (rows.length === 0) {
    throw new HttpError(404, 'Order not found.');
  }
  res.json({ order: await decryptOrder(rows[0], req) });
});

module.exports = router;
