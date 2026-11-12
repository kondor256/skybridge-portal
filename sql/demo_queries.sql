-- 1. Newest users (registration evidence). Only the first characters of the bcrypt hash.
SELECT id, full_name, email, role, left(password_hash, 7) || '…' AS hash, created_at
FROM users ORDER BY id DESC LIMIT 5;

-- 2. Products changed most recently (admin add / edit / delete evidence)
SELECT id, name, price, unit, is_active, updated_at
FROM products ORDER BY updated_at DESC LIMIT 5;

-- 3. Cart contents (cart evidence)
SELECT u.email, p.name, ci.quantity, ci.added_at
FROM cart_items ci
JOIN carts c    ON c.id = ci.cart_id
LEFT JOIN users u ON u.id = c.user_id
JOIN products p ON p.id = ci.product_id
ORDER BY ci.added_at DESC LIMIT 10;

-- 4. Newest orders
SELECT o.id, u.email, o.subtotal, o.gst, o.total, o.status, o.created_at
FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC LIMIT 5;

-- 5. Active sessions (shows sessions live in the DB, not in one server's memory)
SELECT count(*) AS active_sessions FROM session WHERE expire > now();