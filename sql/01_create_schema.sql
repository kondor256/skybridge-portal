-- SOFT807 Assessment 1, Task 2: SkyBridge Services Portal
-- Script 1 of 2: create the database schema (PostgreSQL 16+)
-- Run on BOTH: Azure Database for PostgreSQL Flexible Server and Amazon RDS for PostgreSQL.
-- The brief requires this script; without it the database sections score zero.
--
-- The script can be run again: it drops the tables first, so all data is lost.
-- Run 02_insert_sample_data.sql afterwards.

BEGIN;

DROP TABLE IF EXISTS order_items, orders, cart_items, carts, products, categories, users, session CASCADE;

-- ---------------------------------------------------------------------------
-- Users: customers and administrators. Passwords are stored as bcrypt hashes.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(254) NOT NULL,
    phone         VARCHAR(20),
    password_hash VARCHAR(72)  NOT NULL,
    role          VARCHAR(10)  NOT NULL DEFAULT 'customer',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT users_email_unique    UNIQUE (email),
    CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
    CONSTRAINT users_role_check      CHECK (role IN ('customer', 'admin'))
);

-- ---------------------------------------------------------------------------
-- Categories: the three SkyBridge service lines.
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(80) NOT NULL,
    slug        VARCHAR(40) NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    CONSTRAINT categories_name_unique UNIQUE (name),
    CONSTRAINT categories_slug_unique UNIQUE (slug)
);

-- ---------------------------------------------------------------------------
-- Products: service packages that customers can order. Prices are NZD excl. GST.
-- ---------------------------------------------------------------------------
CREATE TABLE products (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id INTEGER       NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    name        VARCHAR(120)  NOT NULL,
    summary     VARCHAR(255)  NOT NULL,
    description TEXT          NOT NULL DEFAULT '',
    features    TEXT[]        NOT NULL DEFAULT '{}',
    price       NUMERIC(10,2) NOT NULL,
    unit        VARCHAR(10)   NOT NULL DEFAULT 'project',
    duration    VARCHAR(60)   NOT NULL DEFAULT '',
    image_url   VARCHAR(500)  NOT NULL DEFAULT '',
    is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT products_price_check CHECK (price >= 0),
    CONSTRAINT products_unit_check  CHECK (unit IN ('project', 'month', 'day'))
);

CREATE INDEX products_category_idx ON products (category_id);
CREATE INDEX products_active_idx   ON products (is_active);

-- ---------------------------------------------------------------------------
-- Carts: one per visitor. user_id is NULL for a guest cart (the cart id is kept
-- in the visitor's session) and is set when the visitor logs in.
-- ---------------------------------------------------------------------------
CREATE TABLE carts (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    INTEGER     REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT carts_user_unique UNIQUE (user_id)
);

CREATE TABLE cart_items (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cart_id    UUID        NOT NULL REFERENCES carts (id)    ON DELETE CASCADE,
    product_id INTEGER     NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    quantity   INTEGER     NOT NULL DEFAULT 1,
    added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cart_items_unique         UNIQUE (cart_id, product_id),
    CONSTRAINT cart_items_quantity_check CHECK (quantity BETWEEN 1 AND 99)
);

CREATE INDEX cart_items_product_idx ON cart_items (product_id);

-- ---------------------------------------------------------------------------
-- Orders: order_items keeps a copy of the name and price at the time of the
-- order, so editing or deleting a product later does not change old orders.
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       INTEGER       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status        VARCHAR(12)   NOT NULL DEFAULT 'pending',
    company_name  VARCHAR(120)  NOT NULL DEFAULT '',
    contact_phone VARCHAR(20)   NOT NULL DEFAULT '',
    notes         VARCHAR(1000) NOT NULL DEFAULT '',
    subtotal      NUMERIC(12,2) NOT NULL,
    gst           NUMERIC(12,2) NOT NULL,
    total         NUMERIC(12,2) NOT NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT orders_status_check CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT orders_totals_check CHECK (subtotal >= 0 AND gst >= 0 AND total = subtotal + gst)
);

CREATE INDEX orders_user_idx ON orders (user_id);

CREATE TABLE order_items (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id     INTEGER       NOT NULL REFERENCES orders (id)   ON DELETE CASCADE,
    product_id   INTEGER       REFERENCES products (id)          ON DELETE SET NULL,
    product_name VARCHAR(120)  NOT NULL,
    unit         VARCHAR(10)   NOT NULL DEFAULT 'project',
    unit_price   NUMERIC(10,2) NOT NULL,
    quantity     INTEGER       NOT NULL,
    CONSTRAINT order_items_price_check    CHECK (unit_price >= 0),
    CONSTRAINT order_items_quantity_check CHECK (quantity BETWEEN 1 AND 99)
);

CREATE INDEX order_items_order_idx   ON order_items (order_id);
CREATE INDEX order_items_product_idx ON order_items (product_id);

-- ---------------------------------------------------------------------------
-- Session store for the Node.js app (connect-pg-simple). Sessions are kept in
-- the database, not in server memory, so a login still works when the load
-- balancer sends the next request to a different instance.
-- ---------------------------------------------------------------------------
CREATE TABLE session (
    sid    VARCHAR      NOT NULL PRIMARY KEY,
    sess   JSON         NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX session_expire_idx ON session (expire);

COMMIT;
