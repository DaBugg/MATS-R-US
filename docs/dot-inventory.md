# Dot inventory connection

Mats-R-Us and Dot must use the same deployment and Neon database. Dot receives
only the `DOT_WRITE_TOKEN`; it never receives `DATABASE_URL` or the site editor key.
The public inventory read endpoint requires no Vercel login.

1. Read `GET https://mats-r-us.vercel.app/api/bootstrap` to find current
   material, location, stock row IDs, and quantities.
2. Present the exact proposed add, subtract, or move to the user. Send the
   write request only after the user approves that specific change.
3. Send `POST https://mats-r-us.vercel.app/api/stock` with
   `Authorization: Bearer <DOT_WRITE_TOKEN>` and
   `Content-Type: application/json`.
4. Generate one UUID `requestId` per approved change. Reuse the same ID
   when retrying an uncertain response so stock is never applied twice.
5. Read `GET /api/bootstrap` again and report the resulting quantity.

Add:

```json
{"requestId":"<uuid>","action":"add","rowId":"<inventory row uuid>","amount":5,"notes":"Approved stock count"}
```

Subtract:

```json
{"requestId":"<uuid>","action":"subtract","rowId":"<inventory row uuid>","amount":2,"notes":"Installed"}
```

Move:

```json
{"requestId":"<uuid>","action":"move","rowId":"<source inventory row uuid>","targetLocationId":"<destination location uuid>","amount":3,"notes":"Approved move"}
```

Dot's token cannot create or delete stock rows, change a count directly, or
modify the material and location catalogs. The server checks available
quantity, performs each move in one database transaction, records an event,
and rejects duplicate material/location rows.
