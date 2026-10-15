# Front end: Vue 3

See `../README.md` for how to run.

| Path | Contents |
|---|---|
| `src/main.js`, `src/App.vue` | App start (restores the session first) and page frame |
| `src/router.js` | Routes and guards (customer pages, admin pages, guest-only pages) |
| `src/api.js` | Wrapper for calls to `/api` with one error format |
| `src/stores/` | Pinia stores: `auth`, `cart`, `toast` |
| `src/views/` | Catalogue, Product, Cart, Checkout, Orders, Register, Login (customer and admin), AdminDashboard, NotFound |
| `src/components/` | Header, footer, form field, quantity stepper, product image, toasts |
| `src/validation.js`, `src/format.js` | Form rules (the server repeats them); money, date and label formats |
| `public/img/` | SVG illustrations drawn for this project (no third-party images) |

Scripts: `npm run dev` (port 5173, proxies `/api` to port 3000), `npm run build` (output in `../backend/public`).
