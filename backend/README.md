# Back end: Node.js + Express API

See `../README.md` for how to run, the environment variables and the demo accounts.

| Path | Contents |
|---|---|
| `src/server.js` | Starts the HTTP server; closes cleanly on SIGTERM (scale-in, restart) |
| `src/app.js` | Express app: security headers, session, API routes, static front end |
| `src/config.js`, `src/db.js` | Settings from environment variables; PostgreSQL pool and TLS mode |
| `src/cart.js` | Cart queries: guest cart, customer cart, merge at login, totals with GST |
| `src/crypto/` | A3: `fieldCrypto.js` (AES-256-GCM), `keys.js` (key loading), `fields.js` (decrypt a row, unavailable + audit on failure) |
| `src/audit.js`, `src/clientIp.js` | A3: audit log writer; visitor IP without the Azure port |
| `src/middleware/` | `auth.js` (login and admin checks), `validate.js` (input rules), `error.js` (JSON errors), `rateLimit.js` (A3: login rate limit) |
| `src/routes/` | `health`, `auth`, `products` (catalogue + admin CMS), `cart`, `orders` |
| `scripts/` | `run-sql.js` (runs the SQL scripts), `encrypt-existing.js` (A3 migration), `hash-password.js`, `bundle.js` (deployment zip) |
| `certs/` | A3: public CA bundles for database TLS `verify-full` (Azure roots, RDS global bundle) |
| `test/` | `crypto.test.js`, `api.test.js`, `proxy.test.js` (`npm test`) |
| `public/` | Built front end (created by `npm run build` in `../frontend`; not in Git) |

Scripts: `npm start`, `npm run dev`, `npm run db:reset`, `npm run encrypt-existing [-- --dry-run]`, `npm test`, `npm run test:crypto`, `npm run bundle`, `npm run hash "<password>"`.
