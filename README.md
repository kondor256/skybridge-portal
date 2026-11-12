# SkyBridge Services Portal: source code

An online ordering portal for SkyBridge service packages (SOFT807 Assessment 1, Task 2).
Customers browse packages, fill a cart, register, log in and place orders. Administrators add, edit and delete packages.

- `backend/`: Node.js + Express REST API. It also serves the built front end, so **one Node app** is deployed to each cloud.
- `frontend/`: Vue 3 single-page app (Vite, vue-router, Pinia). `npm run build` writes it to `backend/public`.
- `sql/`: database scripts for PostgreSQL 16+ (see [Database setup](#database-setup)).

## Functions

| Function | Where in the site | API |
|---|---|---|
| Browse, filter and search packages | `/` | `GET /api/products`, `GET /api/categories` |
| Package details, choose quantity | `/services/:id` | `GET /api/products/:id` |
| Add to cart, change quantity, remove, empty | `/cart` | `GET/POST/PATCH/DELETE /api/cart...` |
| Register with validation | `/register` | `POST /api/auth/register` |
| Customer login and logout | `/login` | `POST /api/auth/login`, `POST /api/auth/logout` |
| Checkout and order history | `/checkout`, `/orders` | `POST /api/orders`, `GET /api/orders` |
| Admin login and logout | `/admin/login` | `POST /api/auth/login` with `portal: "admin"` |
| Admin: add, edit, delete, hide packages | `/admin` | `GET/POST/PUT/DELETE /api/admin/products` |
| Health and instance information | page footer | `GET /api/health`, `GET /api/health/db` |

## Environment variables

The app has no settings in code. Copy `backend/.env.example` to `backend/.env` for local work; in the cloud set the same names as App Service environment variables or Elastic Beanstalk environment properties.

| Variable | Meaning |
|---|---|
| `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` | PostgreSQL connection |
| `PGSSLMODE` | `disable` locally, `require` on Azure and RDS (encrypted), `verify-full` to also check the server certificate (`PGSSLROOTCERT` = path to a CA file if needed) |
| `SESSION_SECRET` | Long random text that signs the session cookie. The same value on every instance. Required when `NODE_ENV=production` |
| `SESSION_STORE` | `pg` (default) keeps sessions in the database; `memory` is for local experiments only |
| `PORT` | Port to listen on. Both clouds set it themselves |
| `NODE_ENV` | `production` in the cloud |
| `CLOUD_PLATFORM` | `azure`, `aws` or `local`; shown in the page footer |

## Run locally

Needs Node.js 20 or newer and a PostgreSQL 16 database. With Docker:

```
docker run -d --name skybridge-pg -e POSTGRES_USER=skybridge -e POSTGRES_PASSWORD=skybridge_local -e POSTGRES_DB=skybridge -p 5433:5432 postgres:16-alpine
```

```
cd backend
copy .env.example .env        (then set PGPASSWORD=skybridge_local)
npm install
npm run db:reset              creates the tables and loads sample data (see Database setup)
npm run dev                   API on http://localhost:3000

cd ../frontend
npm install
npm run dev                   site on http://localhost:5173 (calls the API through a proxy)
```

To run it the way the cloud does (one process): `npm run build` in `frontend`, then `npm start` in `backend`, and open http://localhost:3000.

## Database setup

| File in `sql/` | Purpose |
|---|---|
| `01_create_schema.sql` | DDL: creates the tables `users`, `categories`, `products`, `carts`, `cart_items`, `orders`, `order_items` and `session` (session store) |
| `02_insert_sample_data.sql` | DML: sample categories, service packages, demo users, carts and orders |
| `demo_queries.sql` | Read-only queries that show new users, changed products, carts and orders (evidence for the demo) |
| `DATA_SOURCES.md` | Which sample data is based on real market information and which is invented |

Run `01` first, then `02`. **Both scripts can be run again, but they delete existing data:** `01` drops all tables, `02` empties them. Do not run them against a database with real orders.

**Option 1: Node script (no psql needed).** It reads the `PG*` variables from `backend/.env`:

```
cd backend
npm run db:reset                                            01 + 02, then prints row counts
node --env-file=.env scripts/run-sql.js schema              01 only
node --env-file=.env scripts/run-sql.js data                02 only
```

The script looks for the SQL files in `../sql` by default; set `SQL_DIR` to use another folder.

**Option 2: psql** (from the repository root):

```
psql "host=localhost port=5433 dbname=skybridge user=skybridge sslmode=disable" -f sql/01_create_schema.sql
psql "host=localhost port=5433 dbname=skybridge user=skybridge sslmode=disable" -f sql/02_insert_sample_data.sql
psql "host=localhost port=5433 dbname=skybridge user=skybridge sslmode=disable" -f sql/demo_queries.sql
```

**Cloud databases** (Azure Database for PostgreSQL flexible server, Amazon RDS for PostgreSQL):

1. Allow your own IP address to reach port 5432: the server firewall on Azure, the security group inbound rule on RDS.
2. Create the database (for example `skybridge`) if it does not exist yet.
3. Use `sslmode=require` (in `.env`: `PGSSLMODE=require`). Azure uses the admin user name you set when you created the server, RDS uses its master user name.
4. Run the scripts with option 1 or 2 against the cloud host, then check the row counts.
5. Use a separate `.env` for each cloud (for example `.env.azure`, `.env.aws`; ignored by git) and run `node --env-file=.env.azure scripts/run-sql.js`.

## Demo accounts (from `02_insert_sample_data.sql`)

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@skybridge.example` | `SkyAdmin2026!` |
| Customer (has a saved cart and one order) | `sione.tuilagi@southernlakes.example` | `Customer2026!` |
| Customer (two orders) | `aroha.ngata@kauricoast.example` | `Customer2026!` |

The other three customers use the same customer password. Passwords are stored only as bcrypt hashes. These are demonstration accounts: change the administrator password before using the app for anything real (`npm run hash "NewPassword1"` prints a hash for an SQL `UPDATE`).

## Tests

`npm test` in `backend` runs the API tests (`test/api.test.js`) against the database in `.env`: catalogue, registration and login validation, guest cart, cart merge at login, checkout, order history, admin access control, add/edit/delete and immediate visibility. The test removes the rows it creates. Run it against the local database, not a cloud one.

## Deployment bundle

```
cd frontend && npm run build
cd ../backend && npm run bundle        creates ../dist/skybridge-portal.zip
```

The zip has `package.json`, `package-lock.json`, `src/` and `public/` at its root and no `node_modules`. Upload steps: `../deploy/azure/README.md` and `../deploy/aws/README.md`.

## Design notes (useful for the report and the demo questions)

- **Stateless app.** Sessions and carts are in PostgreSQL, not in server memory, so a login and a cart survive when the load balancer sends the next request to another instance, and when an instance is added or removed by autoscaling.
- **Proxy aware.** The app trusts the platform's reverse proxy. The session cookie gets the `Secure` flag on HTTPS requests (Azure) and still works on the plain HTTP address of a default Elastic Beanstalk environment.
- **Passwords** are hashed with bcrypt (cost 10). Login gives the same message for an unknown email and a wrong password.
- **SQL** is always parameterised. Validation runs in the browser for fast feedback and again on the server.
- **Admin changes appear immediately** because every catalogue request reads the database and API responses are sent with `Cache-Control: no-store`.
- **Deleting a package** removes it from carts; orders keep their own copy of the name and price (`order_items`).
- A wrong password or a rejected form returns HTTP 401/400/409. The browser lists such responses in its developer console as failed requests; they are expected answers, not application errors.

Never commit `.env` files or `node_modules/`.
