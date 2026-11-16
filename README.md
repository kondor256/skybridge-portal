# SkyBridge Services Portal: source code

An online ordering portal for SkyBridge service packages (SOFT807 Assessment 1, Task 2; security version for Assessment 3).
Customers browse packages, fill a cart, register, log in and place orders. Administrators add, edit and delete packages.
The A1 submitted state is the git tag `a1-submitted`. A3 adds field encryption, an audit log, login protection, HTTPS hardening and certificate-checked database TLS (see [Security (A3)](#security-a3)).

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
| `PGSSLMODE` | `disable` locally; `verify-full` in the cloud (A3): TLS and the server certificate and host name are checked. (`require` encrypts but does not check the certificate.) |
| `PGSSLROOTCERT` | CA bundle for `verify-full`, relative to `backend/` or absolute: `certs/azure-postgres-roots.pem` (Azure) or `certs/rds-global-bundle.pem` (AWS) |
| `SESSION_SECRET` | Long random text that signs the session cookie. The same value on every instance. Required when `NODE_ENV=production`. In the cloud: Key Vault reference / Secrets Manager |
| `DATA_KEY_V1` | A3: AES-256 key for field encryption, base64 of 32 random bytes. Required. A different key per environment; in the cloud from Key Vault / Secrets Manager. Add `DATA_KEY_V2` to rotate (new values use the newest key) |
| `TRUST_PROXY_HOPS` | A3: proxies in front of the app: `0` local, `1` Azure App Service, `2` AWS (CloudFront + load balancer) |
| `TRUST_CLOUDFRONT_PROTO` | A3: `true` on AWS behind CloudFront (visitor protocol from `CloudFront-Forwarded-Proto`) |
| `LOCKOUT_THRESHOLD`, `LOCKOUT_MINUTES`, `AUTH_RATE_LIMIT`, `AUTH_RATE_WINDOW_MINUTES` | A3, optional: lock-out after 5 wrong passwords for 15 min; 10 failed login/registration requests per IP per 15 min (defaults) |
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
copy .env.example .env        (then set PGPASSWORD=skybridge_local and DATA_KEY_V1, see .env.example)
npm install
npm run db:reset              creates the tables and loads sample data (see Database setup)
npm run encrypt-existing      encrypts the sample phone numbers, company names and notes
npm run dev                   API on http://localhost:3000

cd ../frontend
npm install
npm run dev                   site on http://localhost:5173 (calls the API through a proxy)
```

To run it the way the cloud does (one process): `npm run build` in `frontend`, then `npm start` in `backend`, and open http://localhost:3000.

## Database setup

| File in `sql/` | Purpose |
|---|---|
| `SQL-Script-DDL.txt` | DDL: creates the tables `users`, `categories`, `products`, `carts`, `cart_items`, `orders`, `order_items`, `audit_log` (A3) and `session` (session store). Encrypted fields are `TEXT`; `users` has `failed_logins` / `locked_until` for the lock-out |
| `SQL-Script-DML.txt` | DML: sample categories, service packages, demo users, carts and orders. Sensitive fields go in as plain text (no key in SQL); run `npm run encrypt-existing` afterwards |
| `03_a3_upgrade_existing.sql` | Upgrades an existing A1 database to the A3 schema **without deleting data** (can be run again) |
| `demo_queries.sql` | Read-only queries that show new users, changed products, carts and orders (evidence for the demo) |
| `DATA_SOURCES.md` | Which sample data is based on real market information and which is invented |

Run the DDL first, then the DML, then the migration. **DDL and DML can be run again, but they delete existing data:** the DDL drops all tables, the DML empties them. Do not run them against a database with real orders.

**Option 1: Node script (no psql needed).** It reads the `PG*` variables from `backend/.env`:

```
cd backend
npm run db:reset                                            DDL + DML, then prints row counts
node --env-file=.env scripts/run-sql.js schema              DDL only
node --env-file=.env scripts/run-sql.js data                DML only
node --env-file=.env scripts/run-sql.js upgrade             A1 database -> A3 schema, keeps the data
npm run encrypt-existing                                    encrypts plain-text values (add --dry-run to only count)
```

The script looks for the SQL files in `../sql` by default; set `SQL_DIR` to use another folder.

**Option 2: psql** (from the repository root):

```
psql "host=localhost port=5433 dbname=skybridge user=skybridge sslmode=disable" -f sql/SQL-Script-DDL.txt
psql "host=localhost port=5433 dbname=skybridge user=skybridge sslmode=disable" -f sql/SQL-Script-DML.txt
psql "host=localhost port=5433 dbname=skybridge user=skybridge sslmode=disable" -f sql/demo_queries.sql
```

**Cloud databases** (Azure Database for PostgreSQL flexible server, Amazon RDS for PostgreSQL):

1. Allow your own IP address to reach port 5432: the server firewall on Azure, the security group inbound rule on RDS.
2. Create the database (for example `skybridge`) if it does not exist yet.
3. Use `PGSSLMODE=verify-full` with the matching `PGSSLROOTCERT` (psql: `sslmode=verify-full sslrootcert=backend/certs/...`). Azure uses the admin user name you set when you created the server, RDS uses its master user name.
4. Run the scripts with option 1 or 2 against the cloud host, then check the row counts. Then run `npm run encrypt-existing` with that cloud's `DATA_KEY_V1` (on Azure from the web app's SSH console, where the key is already set).
5. Use a separate `.env` for each cloud (for example `.env.azure`, `.env.aws`; ignored by git) and run `node --env-file=.env.azure scripts/run-sql.js`.

## Demo accounts (from `SQL-Script-DML.txt`)

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@skybridge.example` | `SkyAdmin2026!` |
| Customer (has a saved cart and one order) | `sione.tuilagi@southernlakes.example` | `Customer2026!` |
| Customer (two orders) | `aroha.ngata@kauricoast.example` | `Customer2026!` |

The other three customers use the same customer password. Passwords are stored only as bcrypt hashes. These are demonstration accounts: change the administrator password before using the app for anything real (`npm run hash "NewPassword1"` prints a hash for an SQL `UPDATE`).

## Tests

`npm test` in `backend` runs three test files, one after another, against the database in `.env`. The tests remove the rows they create. Run them against the local database, not a cloud one.

- `test/crypto.test.js` (no database; also `npm run test:crypto`): round trip, unique IV, tampered ciphertext/tag/IV, wrong key, unknown key id, legacy plain text, key rotation, key validation.
- `test/api.test.js`: catalogue, registration and login validation, guest cart, cart merge at login, checkout, order history, admin access control, add/edit/delete and immediate visibility; A3: ciphertext in the database, tampered field shown as unavailable and audited, audit rows, rate limit (429), lock-out (423).
- `test/proxy.test.js`: production mode behind CloudFront + load balancer: HSTS and CSP headers, `Secure` cookie only for HTTPS visitors, client IP from trusted hops only, Azure port removed.

## Deployment bundle

```
cd frontend && npm run build
cd ../backend && npm run bundle        creates ../dist/skybridge-portal.zip
```

The zip has `package.json`, `package-lock.json`, `src/`, `public/`, `certs/` (CA bundles) and `scripts/encrypt-existing.js` at its root and no `node_modules`. Upload steps: `../deploy/azure/README.md` and `../deploy/aws/README.md`.

## Design notes (useful for the report and the demo questions)

- **Stateless app.** Sessions and carts are in PostgreSQL, not in server memory, so a login and a cart survive when the load balancer sends the next request to another instance, and when an instance is added or removed by autoscaling.
- **Proxy aware.** The app trusts exactly `TRUST_PROXY_HOPS` proxies, so `req.ip` is the visitor and `req.secure` is right. In production the session cookie is always `Secure`, `HttpOnly`, `SameSite=Lax`.
- **Passwords** are hashed with bcrypt (cost 10). Login gives the same message for an unknown email and a wrong password.
- **SQL** is always parameterised. Validation runs in the browser for fast feedback and again on the server.
- **Admin changes appear immediately** because every catalogue request reads the database and API responses are sent with `Cache-Control: no-store`.
- **Deleting a package** removes it from carts; orders keep their own copy of the name and price (`order_items`).
- A wrong password or a rejected form returns HTTP 401/400/409. The browser lists such responses in its developer console as failed requests; they are expected answers, not application errors.

## Security (A3)

| Control | Where |
|---|---|
| AES-256-GCM field encryption of `users.phone`, `orders.company_name`, `orders.contact_phone`, `orders.notes`. Stored as `v1:<keyId>:<iv>:<tag>:<ciphertext>`, random 12-byte IV per value, 16-byte tag; a changed value is detected, shown as unavailable and audited | `src/crypto/fieldCrypto.js`, `src/crypto/fields.js` |
| Key from the platform secret store, length checked at start-up, never logged; key ids allow rotation | `src/crypto/keys.js`, `src/config.js` |
| Migration of existing plain-text rows (one transaction, can be run again) | `scripts/encrypt-existing.js` |
| Audit log: register, login success/failure, lock-out, rate limit, logout, admin changes, decryption failures | `src/audit.js`, table `audit_log` |
| Login rate limit (HTTP 429) and account lock-out (HTTP 423) | `src/middleware/rateLimit.js`, `src/routes/auth.js` |
| HSTS, CSP with `upgrade-insecure-requests`, `Secure` cookie, trusted proxy hops, CloudFront protocol fix | `src/app.js`, `src/clientIp.js` |
| Database TLS with certificate and host name check (`verify-full`) against the bundled CAs; TLS details in `/api/health/db` | `src/db.js`, `certs/`, `src/routes/health.js` |
| Dependencies: `npm audit --omit=dev` = 0 vulnerabilities. 5 moderate findings remain in the dev-only zip tool `archiver` (fix needs archiver 8, ESM-only); they never run in the cloud | `package.json` |

Never commit `.env` files, keys or `node_modules/`.
