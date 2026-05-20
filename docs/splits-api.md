# Splits API — Front-End Reference

Base URL: `/api/splits`

All endpoints (except the public share endpoint) require a Telegram Mini App auth header.

---

## Authentication

Every protected request must include:

```
Authorization: tma <initDataRaw>
```

`initDataRaw` is the raw `window.Telegram.WebApp.initData` string from the Telegram Mini App SDK. It is validated server-side using HMAC-SHA256 against the bot token. The data must be no older than 24 hours.

**Example:**
```js
const headers = {
  'Content-Type': 'application/json',
  Authorization: `tma ${window.Telegram.WebApp.initData}`,
};
```

---

## Data Types

### Session Status

| Value        | Meaning                                               |
|--------------|-------------------------------------------------------|
| `DRAFT`      | Bills can still be added or edited                    |
| `CALCULATED` | Balances have been calculated; share link is active   |
| `SHARED`     | Session has been shared via the Telegram bot          |

### Currency

Accepted values: `USD`, `EUR`, `GBP`, `IRR`, `TRY`

### Split Type

| Value        | Meaning                                                                 |
|--------------|-------------------------------------------------------------------------|
| `EQUAL`      | Total divided equally; `shares` are computed amounts per person         |
| `PERCENTAGE` | `shares` are percentages (must sum to 100); server converts to amounts  |
| `CUSTOM`     | `shares` are exact amounts (must sum to `totalAmount`)                  |

### Bill Object

```ts
{
  id:           string,
  name:         string,
  totalAmount:  number,
  paidByIndex:  number,   // zero-based index into participants[]
  paidBy:       string,   // participants[paidByIndex] — convenience field
  splitType:    "EQUAL" | "PERCENTAGE" | "CUSTOM",
  shares:       number[], // one entry per participant
}
```

### Transfer Object

```ts
{
  from:   string,   // participant name who owes
  to:     string,   // participant name who is owed
  amount: number,
}
```

---

## Endpoints

---

### `GET /api/splits`

List all split sessions belonging to the authenticated user (up to 20, newest first).

**Response `200`**
```json
[
  {
    "id": "cuid_abc123",
    "name": "Trip to Istanbul",
    "currency": "TRY",
    "status": "CALCULATED",
    "participants": ["Ali", "Sara", "Reza"],
    "billCount": 4,
    "shareToken": "tok_xyz",
    "createdAt": "2026-05-15T10:00:00.000Z"
  }
]
```

---

### `POST /api/splits`

Create a new split session in `DRAFT` status.

**Request body**
```json
{
  "name": "Trip to Istanbul",
  "currency": "TRY",
  "participants": ["Ali", "Sara", "Reza"]
}
```

| Field          | Type       | Required | Constraints                     |
|----------------|------------|----------|---------------------------------|
| `name`         | `string`   | No       | Optional label for the session  |
| `currency`     | `string`   | Yes      | One of the accepted currencies  |
| `participants` | `string[]` | Yes      | 2–20 non-empty unique names     |

**Response `201`**
```json
{ "id": "cuid_abc123" }
```

**Errors**

| Status | Reason                                       |
|--------|----------------------------------------------|
| `400`  | Invalid currency, or participants out of range |
| `401`  | Missing or invalid auth header               |

---

### `GET /api/splits/:id`

Get full detail for a session, including all bills, net balances, and transfers (if calculated).

**Response `200`**
```json
{
  "id": "cuid_abc123",
  "name": "Trip to Istanbul",
  "currency": "TRY",
  "status": "CALCULATED",
  "participants": ["Ali", "Sara", "Reza"],
  "bills": [
    {
      "id": "bill_1",
      "name": "Dinner",
      "totalAmount": 600,
      "paidByIndex": 0,
      "paidBy": "Ali",
      "splitType": "EQUAL",
      "shares": [200, 200, 200]
    }
  ],
  "netBalances": [400, -200, -200],
  "transfers": [
    { "from": "Sara", "to": "Ali", "amount": 200 },
    { "from": "Reza", "to": "Ali", "amount": 200 }
  ],
  "shareToken": "tok_xyz",
  "shareLink": "https://t.me/debtloanbot?start=split_tok_xyz",
  "expiresAt": "2026-06-15T10:00:00.000Z",
  "createdAt": "2026-05-15T10:00:00.000Z"
}
```

`netBalances` and `transfers` are `null` when `status === "DRAFT"`.

A positive `netBalance` means the participant is owed that amount. A negative value means they owe.

**Errors**

| Status | Reason                        |
|--------|-------------------------------|
| `403`  | Session belongs to another user |
| `404`  | Session not found             |

---

### `PATCH /api/splits/:id`

Update the session name and/or currency. Only works at any status (name change is always safe; currency change on a calculated session resets nothing, but recalculating after will use the new currency).

**Request body** (all fields optional)
```json
{
  "name": "Renamed Trip",
  "currency": "USD"
}
```

Send `"name": null` to clear the session name.

**Response `200`**
```json
{ "ok": true }
```

---

### `DELETE /api/splits/:id`

Permanently delete a session and all its bills.

**Response `204`** — no body.

---

### `POST /api/splits/:id/bills`

Add a single bill to a `DRAFT` session.

**Request body**
```json
{
  "name": "Hotel",
  "totalAmount": 1200,
  "paidByIndex": 1,
  "splitType": "EQUAL",
  "shares": [400, 400, 400]
}
```

| Field         | Type       | Required | Constraints                                               |
|---------------|------------|----------|-----------------------------------------------------------|
| `name`        | `string`   | Yes      | Non-empty                                                 |
| `totalAmount` | `number`   | Yes      | Positive                                                  |
| `paidByIndex` | `number`   | Yes      | Valid index into `participants[]`                         |
| `splitType`   | `string`   | Yes      | `EQUAL`, `PERCENTAGE`, or `CUSTOM`                        |
| `shares`      | `number[]` | Yes      | Length must equal `participants.length`                   |

**Notes on `shares`:**
- `EQUAL` — pass the pre-computed equal amounts (use the helper below, or compute yourself: `totalAmount / n` with last person absorbing rounding).
- `PERCENTAGE` — pass percentages, e.g. `[50, 30, 20]`. Must sum to `100`.
- `CUSTOM` — pass exact amounts. Must sum to `totalAmount`.

**Response `201`**
```json
{
  "id": "bill_2",
  "name": "Hotel",
  "totalAmount": 1200,
  "paidByIndex": 1,
  "paidBy": "Sara",
  "splitType": "EQUAL",
  "shares": [400, 400, 400]
}
```

**Errors**

| Status | Reason                                                  |
|--------|---------------------------------------------------------|
| `400`  | Validation failure (see message)                        |
| `409`  | Session is already calculated; add bills is not allowed |

> To edit bills on a calculated session, use `PUT /api/splits/:id/bills` which resets the session to DRAFT first.

---

### `PUT /api/splits/:id/bills`

Replace **all** bills in a session at once. Automatically resets the session to `DRAFT` (invalidates the previous calculation and share token).

Use this for an edit-all-bills flow (e.g., a full bill editor screen).

**Request body**
```json
{
  "bills": [
    {
      "name": "Dinner",
      "totalAmount": 600,
      "paidByIndex": 0,
      "splitType": "EQUAL",
      "shares": [200, 200, 200]
    },
    {
      "name": "Hotel",
      "totalAmount": 1200,
      "paidByIndex": 1,
      "splitType": "CUSTOM",
      "shares": [600, 400, 200]
    }
  ]
}
```

**Response `200`**
```json
{ "ok": true, "billCount": 2 }
```

---

### `POST /api/splits/:id/calculate`

Calculate net balances and the minimal set of transfers to settle all debts. Marks the session as `SHARED`.

Calling this again on an already-calculated session recalculates from scratch (useful after editing bills).

**Response `200`**
```json
{
  "netBalances": [
    { "participant": "Ali",  "balance": 1400 },
    { "participant": "Sara", "balance": -600 },
    { "participant": "Reza", "balance": -800 }
  ],
  "transfers": [
    {
      "from": "Reza",
      "to": "Ali",
      "amount": 800,
      "symbol": "₺",
      "bankAccounts": []
    },
    {
      "from": "Sara",
      "to": "Ali",
      "amount": 600,
      "symbol": "₺",
      "bankAccounts": [
        { "bank": "Mellat", "accountNumber": "1234-5678" }
      ]
    }
  ],
  "shareToken": "tok_xyz",
  "shareLink": "https://t.me/debtloanbot?start=split_tok_xyz"
}
```

`bankAccounts` is the list of bank accounts the recipient has registered via the bot. May be empty.

**Errors**

| Status | Reason                   |
|--------|--------------------------|
| `400`  | Session has no bills     |

---

### `GET /api/splits/share/:token` — Public (no auth)

Load a shared session by its share token. This endpoint is public — no `Authorization` header required. Use it to build the share page that participants can open from the Telegram share link.

**Response `200`**
```json
{
  "id": "cuid_abc123",
  "name": "Trip to Istanbul",
  "currency": "TRY",
  "symbol": "₺",
  "participants": ["Ali", "Sara", "Reza"],
  "bills": [
    {
      "id": "bill_1",
      "name": "Dinner",
      "totalAmount": 600,
      "paidBy": "Ali",
      "splitType": "EQUAL",
      "shares": [
        { "participant": "Ali",  "amount": 200 },
        { "participant": "Sara", "amount": 200 },
        { "participant": "Reza", "amount": 200 }
      ]
    }
  ],
  "netBalances": [
    { "participant": "Ali",  "balance": 1400 },
    { "participant": "Sara", "balance": -600 },
    { "participant": "Reza", "balance": -800 }
  ],
  "transfers": [
    {
      "from": "Reza",
      "to": "Ali",
      "amount": 800,
      "bankAccounts": []
    }
  ],
  "createdAt": "2026-05-15T10:00:00.000Z",
  "expiresAt": "2026-06-15T10:00:00.000Z"
}
```

Note: `shares` on each bill is an array of `{ participant, amount }` objects here (vs a plain `number[]` on the authenticated endpoints).

**Errors**

| Status | Reason            |
|--------|-------------------|
| `404`  | Token not found   |
| `410`  | Session expired   |

---

## Typical Workflows

### Create a new split and calculate

```
POST   /api/splits                  → { id }
POST   /api/splits/:id/bills        (repeat for each bill)
POST   /api/splits/:id/calculate    → { transfers, shareLink }
```

### Edit bills on an existing session

```
PUT    /api/splits/:id/bills        (replaces all, resets to DRAFT)
POST   /api/splits/:id/calculate    (recalculate)
```

### Load the share page (no login needed)

```
GET    /api/splits/share/:token
```

---

## Helper: Computing `shares` on the client

For `EQUAL` splits, compute shares yourself before sending:

```js
function equalShares(total, n) {
  const base = Math.floor((total / n) * 100) / 100;
  const shares = Array(n).fill(base);
  const diff = Math.round((total - base * n) * 100) / 100;
  shares[n - 1] = Math.round((shares[n - 1] + diff) * 100) / 100;
  return shares;
}

// e.g. equalShares(100, 3) → [33.33, 33.33, 33.34]
```

For `PERCENTAGE`, pass the percentages directly — the server stores them as-is (it does **not** convert percentages to amounts; the bot does, but the REST API stores what you send). So if you want the share amounts to be accurate in `GET` responses, convert to amounts on the client before sending:

```js
function percentageToAmounts(total, percentages) {
  return percentages.map(p => Math.round((p / 100) * total * 100) / 100);
}
```

Or keep them as percentages and use `splitType: "PERCENTAGE"` — just be aware the stored `shares` values will be the raw percentages.

---

## Error Response Shape

All errors return JSON:

```json
{ "error": "Human-readable description." }
```

| Status | Meaning                          |
|--------|----------------------------------|
| `400`  | Validation error                 |
| `401`  | Missing / invalid auth           |
| `403`  | Not your session                 |
| `404`  | Resource not found               |
| `409`  | Conflict (e.g. editing a calculated session via POST) |
| `410`  | Gone (share link expired)        |
| `500`  | Server error                     |
