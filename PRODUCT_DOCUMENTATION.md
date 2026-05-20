# DebtMate — Product Documentation

> **Target audience:** Product Managers  
> **Last updated:** May 2026

---

## Overview

DebtMate is a Telegram bot that lets users track money they've lent to or borrowed from friends. It replaces informal memory, notes apps, or spreadsheets with a structured, real-time, notification-driven experience — entirely inside Telegram.

**Core value proposition:** Two people connect once via an invite link. From that point on, either side can record transactions, and both are notified instantly. The balance between them is always visible and up to date.

---

## Target Users

- People who frequently lend or borrow money with friends, family, or colleagues
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

Users can only track debts with people they are connected to. Connections are established through a **personal invite link**.

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

Tapping a contact sets them as the **active contact**, which is required for all subsequent actions (adding transactions, checking balance, etc.).

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

---

## Commands Reference

| Command | Description |
|---|---|
| `/start` | Register or return to the bot; process invite links |
| `/invite` | Get a personal invite link to share |
| `/contacts` | View all connections and their balances |
| `/balance` | Check balance with the active contact |
| `/add` | Record a new transaction |
| `/logs` | View recent transactions with the active contact |
| `/help` | Show help and command list |

---

## Notifications

DebtMate sends push notifications for two events:

1. **Transaction recorded** — the other party learns what was logged (type, amount, optional note).
2. **Settlement requested** — the debtor is asked to settle up.

All notifications are delivered in the recipient's preferred language.

---

## Languages

The product supports two languages, switchable at any time:

- 🇬🇧 **English**
- 🇮🇷 **Persian (Farsi / فارسی)**

The language setting is per-user. When one user records a transaction and the other receives a notification, each message is rendered in that recipient's own language.

---

## Constraints & Current Limitations

- **No settlement confirmation:** Marking a debt as "paid" requires recording a new transaction (e.g. a loan to net it out). There is no dedicated "mark as settled" action.
- **No group debts:** Relationships are strictly 1-to-1. Group expense splitting is not supported.
- **No transaction editing or deletion:** Once saved, a transaction cannot be modified. Users work around this by adding a corrective transaction.
- **Currency is display-only:** Changing the currency on a relationship changes the display label but does not convert amounts. Historical entries are unaffected in value.
- **No in-app payment:** DebtMate shows bank account info and sends settlement requests, but does not process or verify transfers.
