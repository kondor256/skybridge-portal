// Cart data access. Every cart is a row in "carts": a guest cart has no user_id
// and its id is kept in the session; a customer's cart is found by user_id.
const { pool } = require('./db');
const { gstRate } = require('./config');

const toCents = (amount) => Math.round(amount * 100);

function totals(subtotalCents) {
  const gstCents = Math.round(subtotalCents * gstRate);
  return {
    subtotal: subtotalCents / 100,
    gst: gstCents / 100,
    total: (subtotalCents + gstCents) / 100,
  };
}

// Returns the id of the visitor's cart, or null when there is none yet.
async function findCartId(req, db = pool) {
  if (req.session.userId) {
    const { rows } = await db.query('SELECT id FROM carts WHERE user_id = $1', [req.session.userId]);
    return rows[0]?.id ?? null;
  }
  if (req.session.cartId) {
    const { rows } = await db.query('SELECT id FROM carts WHERE id = $1 AND user_id IS NULL', [req.session.cartId]);
    return rows[0]?.id ?? null;
  }
  return null;
}

// Returns the id of the visitor's cart and creates the cart when needed.
async function ensureCartId(req, db = pool) {
  const existing = await findCartId(req, db);
  if (existing) return existing;

  if (req.session.userId) {
    const { rows } = await db.query(
      `INSERT INTO carts (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [req.session.userId],
    );
    return rows[0].id;
  }
  const { rows } = await db.query('INSERT INTO carts DEFAULT VALUES RETURNING id');
  req.session.cartId = rows[0].id;
  return rows[0].id;
}

// Called after login or registration: items collected as a guest move into the
// customer's own cart (quantities are added, limited to 99).
async function adoptGuestCart(userId, guestCartId, db = pool) {
  if (!guestCartId) return;
  const { rows } = await db.query(
    `INSERT INTO carts (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
     RETURNING id`,
    [userId],
  );
  await db.query(
    `INSERT INTO cart_items (cart_id, product_id, quantity)
     SELECT $1, product_id, quantity FROM cart_items WHERE cart_id = $2
     ON CONFLICT (cart_id, product_id)
     DO UPDATE SET quantity = LEAST(99, cart_items.quantity + EXCLUDED.quantity)`,
    [rows[0].id, guestCartId],
  );
  await db.query('DELETE FROM carts WHERE id = $1 AND user_id IS NULL', [guestCartId]);
}

// Reads the cart lines (only products that are still active) with totals.
async function loadCart(cartId, db = pool) {
  let items = [];
  if (cartId) {
    const { rows } = await db.query(
      `SELECT p.id AS "productId", p.name, p.summary, p.price, p.unit, p.image_url AS "imageUrl",
              c.name AS category, ci.quantity
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE ci.cart_id = $1 AND p.is_active
       ORDER BY ci.added_at, ci.id`,
      [cartId],
    );
    items = rows.map((row) => ({ ...row, lineTotal: (toCents(row.price) * row.quantity) / 100 }));
  }
  const subtotalCents = items.reduce((sum, item) => sum + toCents(item.price) * item.quantity, 0);
  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    ...totals(subtotalCents),
  };
}

module.exports = { findCartId, ensureCartId, adoptGuestCart, loadCart, totals, toCents };
