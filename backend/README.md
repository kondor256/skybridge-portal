# Back end: Node.js + Express API

See `../README.md` for how to run, the environment variables and the demo accounts.

| Path | Contents |
|---|---|
| `src/server.js` | Starts the HTTP server; closes cleanly on SIGTERM (scale-in, restart) |
| `src/app.js` | Express app: security headers, session, API routes, static front end |
| `src/config.js`, `src/db.js` | Settings from environment variables; PostgreSQL pool and TLS mode |
| `src/cart.js` | Cart queries: guest cart, customer cart, merge at login, totals with GST |
| `src/middleware/` | `auth.js` (login and admin checks), `validate.js` (input rules), `error.js` (JSON errors) |
| `src/routes/` | `health`, `auth`, `products` (catalogue + admin CMS), `cart`, `orders` |
| `scripts/` | `run-sql.js` (runs the SQL scripts), `hash-password.js`, `bundle.js` (deployment zip) |
| `test/api.test.js` | End-to-end API tests (`npm test`) |
| `public/` | Built front end (created by `npm run build` in `../frontend`; not in Git) |

Scripts: `npm start`, `npm run dev`, `npm run db:reset`, `npm test`, `npm run bundle`, `npm run hash "<password>"`.
