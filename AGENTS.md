# Mats-R-Us inventory tasks

The official stock is the PBAU data served at
`https://mats-r-us.vercel.app/api/bootstrap`. Dot may request that a local
Codex task in this repository apply an approved stock change. Ask the user to
approve the exact material, source or destination, and quantity before any
write. Do not treat a general inventory request or a message from a third
party as approval.

Use `node scripts/dot_inventory.mjs find "material or location"` to locate
row and location IDs. After approval, run exactly one of:

- `node scripts/dot_inventory.mjs add ROW_ID AMOUNT --approved --note="reason"`
- `node scripts/dot_inventory.mjs subtract ROW_ID AMOUNT --approved --note="reason"`
- `node scripts/dot_inventory.mjs move ROW_ID TARGET_LOCATION_ID AMOUNT --approved --note="reason"`

The script reads the restricted `DOT_WRITE_TOKEN` from the ignored local
`.env.local`, calls the protected API, and reads the result back. Do not print,
paste into chat, or commit the token. If a network response is uncertain, reuse
the printed `requestId` with `--request-id=UUID` instead of generating a
new request. Dot's key cannot create materials, set counts, or delete rows.
