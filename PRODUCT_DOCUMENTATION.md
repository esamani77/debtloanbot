# DebtMate — Product Documentation

> **Target audience:** Product Managers  
> **Last updated:** May 2026

---

## Overview

DebtMate is a Telegram bot that lets users track money they've lent to or borrowed from friends — and now split group bills with any set of people. It replaces informal memory, notes apps, or spreadsheets with a structured, real-time, notification-driven experience — entirely inside Telegram.

**Core value proposition:**
- **1-to-1 debt tracking:** Two people connect once via an invite link. Either side can record transactions, and both are notified instantly. The balance between them is always visible and up to date.
- **Group bill splitting:** Any user can create a split session for a group of people (no prior connection required), add multiple bills with flexible split modes, and generate a minimised settlement plan and shareable link — all from within the chat.

---

## Target Users

- People who frequently lend or borrow money with friends, family, or colleagues
- Groups who split shared expenses (trips, dinners, shared subscriptions)
- Users in Iran, Turkey, or international markets (supported currencies: IRR, TRY, USD, EUR, GBP)
- Both English and Persian (Farsi) speakers — the product is fully bilingual

---

## User Journey

### 1. Onboarding

When a user starts the bot for the first time:

1. They are asked to choose their language (English or Persian).
2. They are prompted to set a **nickname** — what other users will see. They can keep their Telegram name or set a custom one.
3. Their account is created automatically.

If they started the bot via an **invite link** from a friend:
- They are connected with that friend immediately after onboarding.
- Both the new user and the inviter receive a confirmation message.

---

### 2. Connecting with Friends (Invite System)

Users can only track 1-to-1 debts with people they are connected to. Connections are established through a **personal invite link**.

**Flow:**
1. User runs `/invite` or taps "Get Invite Link."
2. They receive a unique invite link.
3. They share it with a friend (via a "Share" button).
4. When the friend opens the link and starts the bot, a **relationship** is created between them automatically.

Each pair of users has exactly one relationship. There are no duplicate connections.

---

### 3. Contacts

`/contacts` shows the user a list of all their connected friends, each with a balance summary:

| Status | Meaning |
|---|---|
| ✅ Settled | No outstanding balance |
| 🟢 Owed $X | The contact owes the user money |
| 🔴 Owes $X | The user owes the contact money |

Tapping a contact sets them as the **active contact**, which is required for all subsequent 1-to-1 actions (adding transactions, checking balance, etc.).

---

### 4. Adding a Transaction

`/add` starts a guided multi-step flow:

1. **Choose type:**
   - 🔴 "I Borrowed" — records a debt (the user owes the contact)
   - 🟢 "I Lent" — records a loan (the contact owes the user)

2. **Enter amount** — typed as a number (e.g. `25.50`)

3. **Add a note** — optional, free text. Can be skipped.

4. **Transaction is saved.** Both users are notified.

**Notification to the other party:**
- The contact receives a message explaining what was recorded (e.g. "Erfan lent you $50").
- The notification is delivered in the **contact's own language**.
- After receiving the notification, the contact can optionally send a **feedback message** (text, image, GIF, or sticker) back to the person who recorded the transaction.

---

### 5. Balance

`/balance` shows the current net balance with the active contact:

- **Settled:** No money owed in either direction.
- **You are owed:** The contact owes the user a specific amount.
- **You owe:** The user owes the contact a specific amount.

If the user is owed money, a **"Request Settlement"** button appears (see below).

---

### 6. Transaction Logs

`/logs` shows recent transactions with the active contact, including:
- Transaction type (Loan / Debt)
- Amount and currency
- Who recorded it ("You" or the contact's name)
- Optional note

---

### 7. Settlement Request

When a user is owed money, they can tap **"Request Settlement"** on the balance screen. This sends the contact a push notification:

> "*[Name]* is requesting you to settle your debt. You owe them $X. Please transfer the amount at your earliest convenience."

This is a one-tap nudge — it does not automatically mark anything as settled or create a new transaction.

---

### 8. Bank Accounts

Users can save their bank account details so contacts can pay them easily.

Each bank account includes:
- Account holder name
- 16-digit card number
- Account number (IBAN/SHEBA for Iranian accounts, e.g. `IR...`)
- Bank name

**Viewing a contact's bank info:**
On the contact detail screen, a "💳 Withdrawal Info" button shows all bank accounts the contact has added. This makes it easy to initiate a transfer.

Users can add multiple accounts, edit existing ones, or delete them.

---

### 9. Currency

Each relationship has its own **currency setting**. All transactions within that pair are displayed in the selected currency.

Supported currencies:
| Code | Name |
|---|---|
| USD | US Dollar ($) |
| EUR | Euro (€) |
| GBP | British Pound (£) |
| IRR | Iranian Rial (﷼) |
| TRY | Turkish Lira (₺) |

Changing the currency updates how balances and all transactions are displayed for that pair — it does not convert amounts.

---

### 10. Feedback

After a transaction is recorded, the notified contact sees a **"Send Feedback"** button. Tapping it opens a one-time message flow where they can send:
- A text message
- A photo or image
- A GIF
- A sticker

The feedback is forwarded to the person who recorded the transaction. This feature enables quick acknowledgment ("got it!" or a reaction sticker) without leaving Telegram.

---

### 11. Profile

Users can view and update their profile:
- **Nickname** — the name displayed to contacts (separate from their Telegram display name)
- **Language** — switch between English and Persian at any time
- **Bank Accounts** — shortcut to the bank accounts manager

---

### 12. Bill Splitting

Bill splitting allows any user to create a **group expense session** without needing a prior connection with the participants. It is designed for shared dinners, trips, or any multi-person expense.

#### 12.1 Starting a Split

`/split` launches the split wizard. If the user has an existing **draft** session (created within the last 48 hours), they are offered the option to resume it or start a new one.

**New session setup:**
1. **Session name** — optional label (e.g. "Barcelona trip"). Can be skipped.
2. **Currency** — selected from the standard 5 options.
3. **Number of participants** — between 2 and 20.
4. **Participant names** — entered one by one. The bot pre-fills the initiator's Telegram name as the first participant.

#### 12.2 Adding Bills

After setup (or when resuming a session), the user adds one or more bills:

1. **Bill name** — e.g. "Dinner at restaurant"
2. **Total amount** — numeric entry
3. **Who paid** — selected from the participant list via inline buttons
4. **Split type** — three modes:

| Mode | How it works |
|---|---|
| Equal | Amount divided evenly. The bot handles rounding (last participant absorbs the remainder). |
| By Percentage | User enters a percentage per person. Must sum to 100. |
| Custom Amount | User enters an exact amount per person. Must sum to the total. |

After each bill is saved, a **bill summary** is shown with options to:
- ➕ Add another bill
- 📊 Calculate (finalise the session)
- ❌ Cancel

#### 12.3 Calculation & Settlement Plan

Tapping **Calculate** runs the debt simplification algorithm:

1. **Net balances** are computed: for each participant, `paid − owed` across all bills.
2. **Transfers** are minimised: the greedy algorithm matches the largest creditor against the largest debtor repeatedly until all balances are zero. This produces the **fewest possible transfers** to settle the group.
3. **Bank accounts** are looked up: if a participant's name matches a registered DebtMate user (by name or nickname), their saved bank account(s) are shown alongside the transfer instruction.

**Balance summary** shows each participant's net position (positive = is owed, negative = owes).  
**Settlement plan** shows who pays whom, how much, and with which bank account.

#### 12.4 Share Link

After viewing the settlement plan, the user taps **Share**. The bot:
- Generates a unique `shareToken` (16-char hex, valid for **90 days**).
- Sets the session status to `SHARED`.
- Outputs a `t.me/[bot]?start=split_[token]` link.

Any Telegram user who opens the link sees the full session — participants, bills, and the settlement plan — without needing a DebtMate account.

#### 12.5 Session Management (`/splits`)

`/splits` shows the user's most recent 8 sessions with status indicators:

| Status | Emoji | Meaning |
|---|---|---|
| DRAFT | 🟡 | Session created, not yet calculated |
| CALCULATED | 🟢 | Settlement plan computed |
| SHARED | 🔵 | Share link generated |

Tapping a session opens a detail view with options to:
- ➕ Add a new bill to the session (resets status to DRAFT)
- 🔄 Recalculate (re-runs calculation, generates a new share link)
- 🔗 Re-share (resends the existing share link with the current settlement plan)

---

## Feature Summary Table

| Feature | Description |
|---|---|
| Onboarding | Language + nickname setup on first use |
| Invite Links | Personal links to create 1-to-1 connections |
| Contacts List | All connections with balance overview |
| Add Transaction | Guided flow to record a debt or loan |
| Balance View | Net balance with the active contact |
| Transaction Logs | History of transactions with a contact |
| Settlement Request | Push notification to request repayment |
| Bank Accounts | Save and share payment details |
| Withdrawal Info | View a contact's bank account details |
| Currency Picker | Per-relationship currency (5 options) |
| Feedback | Send a reaction/message after a transaction |
| Language Support | English and Persian (Farsi) |
| Real-time Notifications | Both parties are notified on every transaction |
| Bill Splitting | Group expense sessions with flexible split modes |
| Split Sessions List | Browse, resume, and reshare past sessions |
| Share Links | Public 90-day link to view any split result |
| Debt Simplification | Minimised transfer plan for group settlements |

---

## Commands Reference

| Command | Description |
|---|---|
| `/start` | Register or return to the bot; process invite links; open shared split sessions |
| `/invite` | Get a personal invite link to share |
| `/contacts` | View all connections and their balances |
| `/balance` | Check balance with the active contact |
| `/add` | Record a new transaction |
| `/logs` | View recent transactions with the active contact |
| `/split` | Start a new bill split session or add bills to a draft |
| `/splits` | View and manage recent split sessions |
| `/help` | Show help and command list |

---

## Notifications

DebtMate sends push notifications for two events:

1. **Transaction recorded** — the other party learns what was logged (type, amount, optional note).
2. **Settlement requested** — the debtor is asked to settle up.

All notifications are delivered in the recipient's preferred language.

> Split sessions do not generate automatic push notifications. Settlement is coordinated via the share link shared by the session creator.

---

## Languages

The product supports two languages, switchable at any time:

- 🇬🇧 **English**
- 🇮🇷 **Persian (Farsi / فارسی)**

The language setting is per-user. When one user records a transaction and the other receives a notification, each message is rendered in that recipient's own language. All split wizard prompts, summaries, and error messages are also fully translated.

---

## System Design

### Data Models

```
User
├── id, telegramId, name, nickname, language
├── → Relationship[] (as userA or userB)
├── → Transaction[] (as createdBy)
├── → BankAccount[]
└── → SplitSession[]

Relationship
├── id, userAId, userBId, currency
└── → Transaction[]

Transaction
└── id, relationshipId, amount, type (DEBT|LOAN), createdById, note

SplitSession
├── id, createdById, name?, currency, status (DRAFT|CALCULATED|SHARED)
├── participants  String[]   — ordered list of names (index is the reference key)
├── shareToken?  — 16-char hex, set on first Calculate
├── expiresAt?   — 90 days from first Calculate
└── → BillItem[]

BillItem
└── id, sessionId, name, totalAmount, paidByIndex, splitType (EQUAL|PERCENTAGE|CUSTOM), shares Float[]
```

`participants` is a plain string array — no foreign key to `User`. This allows participants who are not DebtMate users. Bank account lookup at calculation time fuzzy-matches by name/nickname.

### API Endpoints

All endpoints under `/api/splits` require Telegram auth middleware (`X-Telegram-Id` header). The share lookup (`/api/splits/share/:token`) is public.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/splits` | List caller's sessions (last 20) |
| `POST` | `/api/splits` | Create a new draft session |
| `GET` | `/api/splits/:id` | Get full session detail + calculated plan |
| `PATCH` | `/api/splits/:id` | Update session name or currency |
| `DELETE` | `/api/splits/:id` | Delete a session |
| `POST` | `/api/splits/:id/bills` | Add a bill to a DRAFT session |
| `PUT` | `/api/splits/:id/bills` | Replace all bills (resets to DRAFT) |
| `POST` | `/api/splits/:id/calculate` | Run calculation, generate share token |
| `GET` | `/api/splits/share/:token` | Public — view shared session by token |

### Debt Simplification Algorithm

The algorithm minimises the number of transfers required to settle all balances:

1. Compute each participant's **net balance** = `sum(paid) − sum(owed)` across all bills.
2. Split into **creditors** (positive balance) and **debtors** (negative balance), sorted descending by amount.
3. Greedily match: transfer `min(creditor, debtor)` from the largest debtor to the largest creditor. Remove settled parties from the list.
4. Repeat until all balances reach zero (within a currency-specific epsilon: 0.5% for IRR, 0.005 otherwise).

IRR amounts are additionally rounded to the nearest 1,000 Rial to avoid impractical fractional amounts.

### Bot Scene Architecture

The split wizard (`SPLIT`) is a 12-step `WizardScene`:

| Step | Purpose |
|---|---|
| 0 | Ask session name (skip if resuming existing session) |
| 1 | Receive name / skip → show currency picker |
| 2 | Receive currency → ask participant count |
| 3 | Collect participant names (loop until count reached) |
| 4 | Ask bill name |
| 5 | Ask bill amount |
| 6 | Ask who paid (inline buttons) |
| 7 | Ask split type; EQUAL → save & go to summary; others → step 8 |
| 8 | Collect per-person shares (loop; validates sum = total or 100%) |
| 9 | Bill summary: Add Another → step 4, Calculate → step 10 |
| 10 | Show balance summary → "View Plan" button |
| 11 | Show settlement plan → "Share" button |
| 12 | Generate & send share link; leave scene |

Session management actions (open, add bill, recalculate, reshare) are handled outside the wizard by `splitMenuHandler` and its helper functions.

---

## Constraints & Current Limitations

- **No settlement confirmation:** Marking a 1-to-1 debt as "paid" requires recording a new transaction (e.g. a loan to net it out). There is no dedicated "mark as settled" action.
- **No transaction editing or deletion:** Once saved, a 1-to-1 transaction cannot be modified. Users work around this by adding a corrective transaction.
- **Currency is display-only:** Changing the currency on a relationship changes the display label but does not convert amounts. Historical entries are unaffected in value.
- **No in-app payment:** DebtMate shows bank account info and sends settlement requests, but does not process or verify transfers.
- **Split participants are name-based:** Group split participants are identified by the name entered during session setup. If the name matches a registered DebtMate user's name or nickname, their bank accounts are surfaced — but there is no hard link. Name mismatches mean bank info won't appear.
- **Split share links expire:** Share tokens are valid for 90 days from the first calculation. After expiry, the public link returns a 410 Gone response.
- **Split sessions are single-currency:** All bills in a session share one currency. Mixed-currency group expenses are not supported.
