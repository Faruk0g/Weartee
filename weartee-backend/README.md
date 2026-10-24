# WEARTEE backend

Pure Node.js API (no `npm install` required).

## Run

```bash
cd weartee-backend
node src/server.js
```

Or:

```bash
npm start
```

API: **http://localhost:5050**

Test it:

```bash
curl http://localhost:5050/api/health
```

You should see:

```json
{"ok":true,"service":"weartee","time":"..."}
```

## If localhost does not respond

1. Make sure the server is running in a terminal and you see:
   `WEARTEE API listening on http://localhost:5050`
2. Keep that terminal open.
3. Open `http://localhost:5050/api/health` in the browser.
4. Serve the frontend with a local static server (not `file://`):
   ```bash
   npx --yes serve weartee-fixed -p 5500
   ```
5. Frontend points to `http://localhost:5050` via `window.WEARTEE_API`.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | public |
| GET | `/api/meta` | shipping + categories |
| GET | `/api/products` | public |
| GET | `/api/products/:id` | public |
| POST | `/api/auth/register` | `{ name, email, phone, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| GET/PUT | `/api/me` | Bearer token |
| POST | `/api/orders` | guest checkout OK |
| GET | `/api/orders` | token or `?email=` |
| GET | `/api/orders/:id` | public by id |
| GET | `/api/admin/orders` | header `x-admin-key` |
| PATCH | `/api/admin/orders/:id` | `{ "status": "Shipped" }` |

Default admin key: `change-me-admin`

Data file: `data/db.json` (auto-created on first start).

# Bank transfer setup

Set these environment variables in the backend deployment to show the bank
account and proof-of-payment contact on transfer orders:

```env
TRANSFER_BANK_NAME=
TRANSFER_ACCOUNT_NAME=
TRANSFER_ACCOUNT_NUMBER=
TRANSFER_PROOF_WHATSAPP=
TRANSFER_PROOF_EMAIL=weartee.ng@gmail.com
```

Customers place the order first, then see the amount, account details, and
order-number reference on the confirmation page. In Admin, change the order's
payment status to **Paid** after verifying the transfer.
