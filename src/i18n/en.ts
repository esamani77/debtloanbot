import { Translations } from './types';

export const en: Translations = {
  // Nickname
  nicknamePrompt: (defaultName) =>
    `What nickname should others see?\n\n*Default:* ${defaultName}\n\nType a custom nickname or press the button below:`,
  nicknameSet: (name) => `✅ Your nickname is set to *${name}*!`,
  nicknameUpdated: (name) => `✅ Nickname updated to *${name}*.`,
  btnKeepTelegramName: 'Keep my Telegram name',
  btnChangeNickname: '✏️ Change Nickname',

  // Buttons
  btnInvite: '📨 Get Invite Link',
  btnContacts: '📋 View Contacts',
  btnHelp: '❓ Help',
  btnBalance: '💰 View Balance',
  btnLogs: '📋 View Logs',
  btnAdd: '➕ Add Transaction',
  btnAddAnother: '➕ Add Another',
  btnCancel: '❌ Cancel',
  btnSkipNote: '⏭ Skip Note',
  btnBack: '↩️ Back',
  btnBackContacts: '👥 Back to Contacts',
  btnSetCurrency: '💱 Set Currency',
  btnChangeLang: '🌐 Change Language',
  btnInviteFriend: '📨 Invite a Friend',
  btnAccounts: '🏦 My Bank Accounts',
  btnAddAccount: '➕ Add Account',
  btnWithdrawalInfo: '💳 Withdrawal Info',
  btnProfile: '👤 Profile',
  btnSplit: '🧾 Split',

  // Profile
  profileTitle: '👤 *Your Profile*',
  profileInfo: (name, lang) => `*Name:* ${name}\n*Language:* ${lang}`,
  profileBtnBankAccounts: (n) => `🏦 Bank Accounts (${n})`,

  // Common errors
  errCannotIdentify: 'Could not identify user. Please try again.',
  errSomethingWrong: 'Something went wrong. Please try again.',
  errNoContact:
    '⚠️ No contact selected. Please use /contacts to select a contact first.',
  errUserNotFound: 'User not found. Please send /start first.',
  errNoRelationship:
    '⚠️ No relationship found with this contact. Please invite them first using /invite.',

  // Language
  langPickerPrompt:
    '🌐 Choose your language:\n\nزبان خود را انتخاب کنید:',
  langUpdated: '✅ Language set to English.',

  // Start
  startWelcome: (name) =>
    `Welcome to *DebtMate*, ${name}! 💰\n\nTrack debts and loans with your friends easily.\n\n*Commands:*\n/invite — Get your invite link\n/contacts — View contacts & balances\n/balance — Check active contact's balance\n/add — Add a transaction\n/logs — View recent transactions\n/help — Help`,
  startWelcomeBack: (name) =>
    `Welcome back to *DebtMate*, ${name}! 👋`,
  startInviteInvalid: (name) =>
    `Welcome to *DebtMate*, ${name}! 👋\n\nThe invite link appears invalid, but your account is ready.\nUse /invite to connect with friends!`,
  startConnected: (name, inviterName) =>
    `Welcome to *DebtMate*, ${name}! 👋\n\nYou've been connected with *${inviterName}*!\nYou can now track debts and loans between you.`,
  startAlreadyConnected: (name, inviterName) =>
    `Welcome back to *DebtMate*, ${name}! 👋\n\nYou're already connected with *${inviterName}*.`,
  startInviterNotified: (joinerName) =>
    `🎉 *${joinerName}* accepted your invite and is now connected with you on DebtMate!\n\nUse /contacts to view your connections.`,

  // Help
  helpText:
    `❓ *DebtMate — Help*\n\n` +
    `*Commands:*\n` +
    `/start — Register & see welcome\n` +
    `/invite — Your personal invite link\n` +
    `/contacts — View contacts & balances\n` +
    `/balance — Balance with active contact\n` +
    `/add — Add a debt or loan\n` +
    `/logs — Recent transactions\n` +
    `/split — Start a bill split session\n` +
    `/splits — View your recent splits\n` +
    `/help — This help message\n\n` +
    `*How it works:*\n` +
    `1. Use /invite to get your link\n` +
    `2. Share it with a friend\n` +
    `3. Select them via /contacts\n` +
    `4. Use /add to record transactions\n` +
    `5. Use /balance to see who owes what\n\n` +
    `*Bill Splitting:*\n` +
    `Use /split to split group expenses fairly.\n` +
    `Add participants, record bills, and share a\n` +
    `read-only link with your group.\n\n` +
    `*Balance types:*\n` +
    `💰 *Loan* — You lent money (they owe you)\n` +
    `💸 *Debt* — You borrowed money (you owe them)`,

  // Invite
  inviteText: (link) =>
    `📨 *Your Personal Invite Link*\n\nShare this with a friend to connect on DebtMate:\n\n\`${link}\`\n\nWhen they tap the link and start the bot, you'll be connected automatically!`,

  // Contacts
  contactsTitle: '👥 *Your Contacts*',
  contactsEmpty: 'No contacts yet. Use /invite to connect with someone.',
  contactsSelectPrompt: 'Select a contact to view details:',
  contactsBalanceSettled: '✅ Settled',
  contactsBalanceOwed: (sym, amount) => `🟢 Owed ${sym}${amount}`,
  contactsBalanceOwes: (sym, amount) => `🔴 Owes ${sym}${amount}`,

  // Select
  selectActiveContact: (name) =>
    `✅ *Active Contact: ${name}*\n\nWhat would you like to do?`,

  // Balance
  balanceSettled: (name) =>
    `✅ *All Settled!*\n\nYou and *${name}* are all settled up. No outstanding balance.`,
  balanceOwed: (name, sym, amount) =>
    `💚 *You are owed money!*\n\n*${name}* owes you *${sym}${amount}*`,
  balanceOwes: (name, sym, amount) =>
    `❤️ *You owe money*\n\nYou owe *${name}* *${sym}${amount}*`,

  // Logs
  logsTitle: (name) => `📋 *Recent Transactions with ${name}*`,
  logsEmpty: (name) =>
    `📋 *Transaction Logs with ${name}*\n\nNo transactions yet. Add one to get started!`,
  logLoan: 'Loan',
  logDebt: 'Debt',
  logAddedByYou: 'You',

  // Add Transaction
  txNoContact:
    '⚠️ No contact selected. Please use /contacts to select a contact first.',
  txTypeQuestion: (name) =>
    `Adding a transaction with *${name}*.\n\nWhat type of transaction is this?`,
  txTypeBorrow: '🔴 I Borrowed',
  txTypeLend: '🟢 I Lent',
  txUseButtons: 'Please use the buttons above to select a transaction type.',
  txSelectedType: (label, sym) =>
    `Selected: *${label}*\n\nEnter the amount in ${sym} (e.g. 25.50):`,
  txEnterAmount: 'Please enter a valid amount as a number (e.g. 25.50):',
  txInvalidAmount:
    '⚠️ Invalid amount. Please enter a positive number (e.g. 25.50):',
  txAmountConfirm: (sym, amount) =>
    `Amount: *${sym}${amount}*\n\nWould you like to add a note for this transaction?`,
  txNoteOrSkip: 'Please type a note or press "Skip Note":',
  txNoteSkipped: 'No note added.',
  txCancelled: 'Transaction cancelled.',
  txSomethingWrong: 'Something went wrong. Please start over with /add.',
  txTypeLabelDebt: '💸 Debt (I Borrowed)',
  txTypeLabelLoan: '💰 Loan (I Lent)',
  txSaved: (typeLabel, sym, amount, contactName, note) =>
    `✅ *Transaction Saved!*\n\nType: ${typeLabel}\nAmount: *${sym}${amount}*\nWith: ${contactName}` +
    (note ? `\nNote: ${note}` : ''),

  // Notifications
  notifyBorrowed: (name, sym, amount) =>
    `💸 *${name}* recorded a transaction with you:\nThey borrowed *${sym}${amount}* from you.`,
  notifyLent: (name, sym, amount) =>
    `💰 *${name}* recorded a transaction with you:\nThey lent *${sym}${amount}* to you.`,
  notifyNote: (note) => `Note: ${note}`,
  notifyEditedLoan: (name, sym, amount) =>
    `✏️ *${name}* edited a transaction:\nThey lent *${sym}${amount}* to you.`,
  notifyEditedDebt: (name, sym, amount) =>
    `✏️ *${name}* edited a transaction:\nThey borrowed *${sym}${amount}* from you.`,
  notifyDeletedLoan: (name, sym, amount) =>
    `🗑️ *${name}* deleted a transaction:\nThey had lent *${sym}${amount}* to you.`,
  notifyDeletedDebt: (name, sym, amount) =>
    `🗑️ *${name}* deleted a transaction:\nThey had borrowed *${sym}${amount}* from you.`,
  notifySettledTransaction: (name, sym, amount) =>
    `✅ *${name}* marked a transaction as settled.\n\n*${sym}${amount}*`,
  notifySettledAll: (name) =>
    `✅ *${name}* marked all transactions as settled.`,

  // Settle (bot flow)
  btnSettle: '✅ Settle',
  txSettleConfirm: (typeLabel, sym, amount) =>
    `✅ *Settle this transaction?*\n\n${typeLabel} — *${sym}${amount}*\n\nThis will mark it as settled and remove it from the balance.`,
  txSettleConfirmBtn: '✅ Confirm Settle',
  txSettled: '✅ Transaction settled.',
  txSettleAllConfirm: (name) =>
    `✅ *Settle all transactions with ${name}?*\n\nAll unsettled transactions will be marked as settled.`,
  txSettleAllDone: (count, name) =>
    `✅ *${count} transaction${count !== 1 ? 's' : ''} settled with ${name}!*`,
  txSettleAllEmpty: (name) =>
    `✅ *No unsettled transactions with ${name}.*\n\nYou're all settled up!`,

  // Edit / delete transaction (bot flow)
  txEditAmountPrompt: (sym, amount) =>
    `✏️ *Edit Amount*\n\nCurrent: *${sym}${amount}*\n\nEnter new amount, or skip to keep it:`,
  txEditNotePrompt: (note) =>
    `📝 *Edit Note*\n\nCurrent: ${note ? `_${note}_` : '_none_'}\n\nType a new note, skip to keep it, or clear it:`,
  txEditSaved: '✅ *Transaction updated!*',
  txEditCancelled: '❌ Edit cancelled.',
  btnSkipAmount: '⏭ Keep amount',
  btnClearNote: '🗑️ Clear note',
  txDeleteConfirm: (typeLabel, sym, amount) =>
    `🗑️ *Delete this transaction?*\n\n${typeLabel} — *${sym}${amount}*\n\nThis cannot be undone.`,
  txDeleteConfirmBtn: '✅ Confirm Delete',
  txDeleted: '🗑️ Transaction deleted.',

  // Feedback
  btnSendFeedback: '💬 Send Feedback',
  btnSkipFeedback: '⏭ Skip',
  feedbackPrompt: (name) =>
    `💬 Send a feedback message to *${name}*.\n\nYou can send text, an image, a GIF, or a sticker.\nPress *Skip* if you don't want to send anything.`,
  feedbackSkipped: 'Feedback skipped.',
  feedbackSent: '✅ Your feedback was sent!',
  feedbackReceived: (name) => `💬 *${name}* sent you a feedback message:`,

  // Bank accounts
  acctTitle: '🏦 *Your Bank Accounts*',
  acctEmpty: 'No bank accounts yet. Add one so contacts can pay you.',
  acctItem: (i, bankName, name, card) =>
    `${i}. *${bankName}*\n   👤 ${name}  💳 ${card}`,
  acctEnterName: '👤 Enter the account holder name:',
  acctEnterCardNumber: '💳 Enter the card number (16 digits):',
  acctInvalidCardNumber: '⚠️ Invalid card number. Please enter exactly 16 digits:',
  acctEnterAccountNumber: '🏦 Enter the account number (SHEBA/IBAN for IRT, e.g. IR…):',
  acctEnterBankName: '🏛️ Enter the bank name:',
  acctSaved: '✅ Bank account saved successfully!',
  acctUpdated: '✅ Bank account updated successfully!',
  acctDeleted: '🗑️ Bank account deleted.',
  acctConfirmDelete: (bankName, name) =>
    `🗑️ Delete *${bankName}* (${name})?\n\nThis cannot be undone.`,
  acctCancelled: 'Cancelled.',

  // Withdrawal info
  withdrawalTitle: (contactName) =>
    `💳 *Bank Accounts of ${contactName}*`,
  withdrawalEmpty: (contactName) =>
    `${contactName} hasn't added any bank accounts yet.`,
  withdrawalItem: (bankName, name, card, account) =>
    `🏛️ *${bankName}*\n👤 ${name}\n💳 Card: \`${card}\`\n🔢 Account: \`${account}\``,

  // Settlement request
  btnSettlementRequest: '💸 Request Settlement',
  settlementRequestSent: (name) => `✅ Settlement request sent to *${name}*!`,
  settlementRequestReceived: (name, sym, amount) =>
    `📢 *${name}* is requesting you to settle your debt.\n\nYou owe them *${sym}${amount}*.\n\nPlease transfer the amount at your earliest convenience.`,

  // Currency
  currencyPickerTitle: (name) =>
    `💱 Select currency for transactions with *${name}*:`,
  currencyPickerDesc:
    'All existing and future transactions with this contact will display in the selected currency.',
  currencyUpdated: (label, name, sym) =>
    `✅ Currency updated to *${label}*\n\nAll transactions with *${name}* will now show in ${sym}.`,

  // Bill Splitting
  splitAskName: '🧾 *Start a Bill Split*\n\nGive this session a name (e.g. "Barcelona Trip", "Friday Dinner") or skip:',
  splitBtnSkipName: '⏭ Skip',
  splitAskCurrency: '💱 Select the currency for this split:',
  splitAskParticipantCount: '👥 How many people are sharing? Enter a number (2–20):',
  splitInvalidCount: '⚠️ Please enter a number between 2 and 20.',
  splitAskParticipantName: (i, total) => `👤 Enter name for participant ${i} of ${total}:`,
  splitParticipantsDone: (names) => `✅ *Participants added:*\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\nNow let's add your expenses.`,
  splitAskBillName: '📝 What was this expense? (e.g. "Hotel", "Dinner", "Taxi")',
  splitAskBillAmount: (sym) => `💰 How much? Enter the total amount in ${sym}:`,
  splitInvalidAmount: '⚠️ Please enter a valid positive number.',
  splitAskPayer: '🙋 Who paid for this?',
  splitAskSplitType: '⚖️ How should this be split?',
  splitBtnEqual: '⚖️ Split Equally',
  splitBtnByPercentage: '📊 By Percentage',
  splitBtnCustomAmount: '💰 Custom Amounts',
  splitAskShare: (name, sym, remaining, isPercent) =>
    isPercent
      ? `📊 Percentage for *${name}*:\n\n_(Remaining: ${remaining}%)_`
      : `💰 Amount for *${name}* (${sym}):\n\n_(Remaining: ${sym}${remaining})_`,
  splitShareValidationError: (got, expected, isPercent) =>
    isPercent
      ? `⚠️ Percentages sum to ${got}% — must equal 100%. Please start over.`
      : `⚠️ Amounts sum to ${got} — must equal ${expected}. Please start over.`,
  splitBillSummary: (bills, sym) =>
    `📋 *Bills so far:*\n\n${bills.map((b, i) => `${i + 1}. *${b.name}* — ${sym}${b.totalAmount.toFixed(2)} (paid by ${b.paidBy})`).join('\n')}`,
  splitBtnAddBill: '➕ Add Another Bill',
  splitBtnCalculate: '🧮 Calculate',
  splitBalanceSummary: (participants, balances, sym) => {
    const lines = participants.map((p, i) => {
      const b = balances[i];
      if (b > 0.005) return `🟢 *${p}*: +${sym}${b.toFixed(2)} _(owed)_`;
      if (b < -0.005) return `🔴 *${p}*: -${sym}${Math.abs(b).toFixed(2)} _(owes)_`;
      return `⚪ *${p}*: settled`;
    });
    return `💰 *Balance Summary*\n\n${lines.join('\n')}`;
  },
  splitBtnSettlementPlan: '📋 Show Settlement Plan',
  splitSettlementPlan: (transfers, sym, bankAccounts) => {
    if (transfers.length === 0) return '✅ *Everyone is settled — no transfers needed!*';
    const lines = transfers.map((t) => {
      let line = `• *${t.from}* → pays *${t.to}*: ${sym}${t.amount.toFixed(2)}`;
      const accts = bankAccounts[t.to];
      if (accts && accts.length > 0) {
        const a = accts[0];
        line += `\n  🏛️ ${a.bankName} | 💳 \`${a.cardNumber}\``;
      }
      return line;
    });
    return `📋 *Settlement Plan*\n\n${lines.join('\n\n')}`;
  },
  splitBtnShare: '🔗 Share Results',
  splitShareLink: (link, sessionName) =>
    `🔗 *Share this split${sessionName ? ` — ${sessionName}` : ''}*\n\n\`${link}\`\n\nAnyone can open this link to see the full results.`,
  splitSessionExpired: '⏰ This split session has expired (links are valid for 90 days).',
  splitSessionNotFound: '❌ Split session not found.',
  splitDraftFound: (name) =>
    `📋 You have an unfinished split${name ? ` (*${name}*)` : ''} from the last 48 hours.\n\nWould you like to resume it or start a new one?`,
  splitBtnResume: '▶️ Resume',
  splitBtnStartNew: '🆕 Start New',
  splitsList: (sessions) => {
    if (sessions.length === 0) return '📋 *Your Splits*\n\nNo splits yet. Use /split to create one.';
    const statusEmoji: Record<string, string> = { DRAFT: '🟡', CALCULATED: '🟢', SHARED: '🔵' };
    const lines = sessions.map((s, i) => {
      const emoji = statusEmoji[s.status] ?? '⚪';
      const name = s.name ?? 'Unnamed split';
      const date = s.createdAt.toLocaleDateString('en-GB');
      return `${i + 1}. ${emoji} *${name}* — ${s.billCount} bill${s.billCount !== 1 ? 's' : ''} · ${date}`;
    });
    return `📋 *Your Recent Splits*\n\n${lines.join('\n')}\n\n🟡 Draft  🟢 Calculated  🔵 Shared`;
  },
  splitCancelled: '❌ Split session cancelled.',
  splitBtnCancel: '❌ Cancel',
  splitZeroAmountError: '⚠️ Amount must be greater than zero.',
  splitMinParticipantsError: '⚠️ You need at least 2 participants.',
  splitMenuTitle: '🧾 *Bill Splitting*\n\nStart a new split or continue an existing one:',
  splitMenuNewSplit: '➕ New Split',
  splitSessionDetail: (name, currency, participants, billCount, status, sym) => {
    const statusLabels: Record<string, string> = { DRAFT: '🟡 Draft', CALCULATED: '🟢 Calculated', SHARED: '🔵 Shared' };
    return `🧾 *${name ?? 'Unnamed Split'}*\n💱 ${currency} (${sym})\n👥 ${participants.join(', ')}\n📋 ${billCount} bill${billCount !== 1 ? 's' : ''}\n${statusLabels[status] ?? status}`;
  },
  splitBtnAddBillToSession: '➕ Add Bill',
  splitBtnRecalculate: '🧮 Recalculate',
  splitBtnShareSession: '🔗 Share',
  splitNoSessions: '🧾 *Bill Splitting*\n\nNo splits yet. Start one now!',
  splitAddingBillToSession: (name) => `➕ *Adding bill to "${name ?? 'split'}"*\n\nWhat was this expense?`,

  splitPickParticipantMode: (i, total) => `👤 *Participant ${i} of ${total}*\n\nHow do you want to add this person?`,
  splitBtnFromContacts: '👥 From Contacts',
  splitBtnByTelegramId: '🆔 By Telegram ID',
  splitBtnByName: '✏️ Type Name',
  splitEnterTelegramId: '🆔 Enter the Telegram user ID (numbers only):',
  splitUserFound: (name) => `✅ Found *${name}*! Adding them to the split.`,
  splitUserNotFound: '❌ That Telegram ID isn\'t registered in DebtMate yet. You can share this invite link with them:',
  splitNoContacts: '⚠️ You have no contacts yet. Use /invite to connect with someone, or add participants by Telegram ID or name.',
  splitNotifyAddedToSplit: (creatorName, sessionName) =>
    `👋 *${creatorName}* added you as a participant in a split${sessionName ? ` (*${sessionName}*)` : ''}!\n\nOpen DebtMate to view the results when they're ready.`,

  splitNotifyResultsReady: (creatorName, sessionName, sym, balance, myTransfers, shareLink) => {
    let msg = `🧾 *${creatorName}* has calculated a split${sessionName ? ` — *${sessionName}*` : ''}!\n\n`;
    if (balance > 0.005) msg += `💚 Your balance: +${sym}${balance.toFixed(2)} _(you are owed)_\n`;
    else if (balance < -0.005) msg += `❤️ Your balance: −${sym}${Math.abs(balance).toFixed(2)} _(you owe)_\n`;
    else msg += `✅ You're all settled up!\n`;
    if (myTransfers.length > 0) {
      msg += `\n📋 *Your transfers:*\n`;
      msg += myTransfers.map((t) => `• *${t.from}* → *${t.to}*: ${sym}${t.amount.toFixed(2)}`).join('\n');
      msg += '\n';
    }
    msg += `\n🔗 [View full results](${shareLink})`;
    return msg;
  },

  reminderMessage: (owes, owed) => {
    let msg = `⏰ *Daily Balance Reminder*\n`;
    if (owes.length > 0)
      msg += `\n💸 *You owe:*\n${owes.map((o) => `• ${o.name}: ${o.sym}${o.amount}`).join('\n')}`;
    if (owed.length > 0)
      msg += `\n\n💰 *You're owed:*\n${owed.map((o) => `• ${o.name}: ${o.sym}${o.amount}`).join('\n')}`;
    return msg;
  },

  splitSharedSummary: (sessionName, currency, createdAt, participants, balances, transfers, sym, bankAccounts, bills) => {
    const title = sessionName ? `*${sessionName}*` : '*Split Summary*';
    const date = createdAt.toLocaleDateString('en-GB');
    let text = `${title}\n📅 ${date} · ${currency}`;
    if (bills.length > 0) {
      const billLines = bills.map((b, i) => `${i + 1}. *${b.name}* — ${sym}${b.totalAmount.toFixed(2)} (paid by ${b.paidBy})`);
      text += `\n\n*Bills:*\n${billLines.join('\n')}`;
    }
    const balanceLines = participants.map((p, i) => {
      const b = balances[i];
      if (b > 0.005) return `🟢 *${p}*: +${sym}${b.toFixed(2)}`;
      if (b < -0.005) return `🔴 *${p}*: -${sym}${Math.abs(b).toFixed(2)}`;
      return `⚪ *${p}*: settled`;
    });
    text += `\n\n*Balances:*\n${balanceLines.join('\n')}`;
    if (transfers.length > 0) {
      const tLines = transfers.map((t) => {
        let line = `• *${t.from}* → *${t.to}*: ${sym}${t.amount.toFixed(2)}`;
        const accts = bankAccounts[t.to];
        if (accts && accts.length > 0) line += `\n  🏛️ ${accts[0].bankName} | 💳 \`${accts[0].cardNumber}\``;
        return line;
      });
      text += `\n\n*Settlement Plan:*\n${tLines.join('\n\n')}`;
    } else {
      text += '\n\n✅ Everyone is settled!';
    }
    return text;
  },
};
