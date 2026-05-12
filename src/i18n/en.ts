import { Translations } from './types';

export const en: Translations = {
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
    `/help — This help message\n\n` +
    `*How it works:*\n` +
    `1. Use /invite to get your link\n` +
    `2. Share it with a friend\n` +
    `3. Select them via /contacts\n` +
    `4. Use /add to record transactions\n` +
    `5. Use /balance to see who owes what\n\n` +
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

  // Bank accounts
  acctTitle: '🏦 *Your Bank Accounts*',
  acctEmpty: 'No bank accounts yet. Add one so contacts can pay you.',
  acctItem: (i, bankName, name, card) =>
    `${i}. *${bankName}*\n   👤 ${name}  💳 ${card}`,
  acctEnterName: '👤 Enter the account holder name:',
  acctEnterCardNumber: '💳 Enter the card number (16 digits):',
  acctInvalidCardNumber: '⚠️ Invalid card number. Please enter exactly 16 digits:',
  acctEnterAccountNumber: '🏦 Enter the account number (SHEBA/IBAN for IRR, e.g. IR…):',
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

  // Currency
  currencyPickerTitle: (name) =>
    `💱 Select currency for transactions with *${name}*:`,
  currencyPickerDesc:
    'All existing and future transactions with this contact will display in the selected currency.',
  currencyUpdated: (label, name, sym) =>
    `✅ Currency updated to *${label}*\n\nAll transactions with *${name}* will now show in ${sym}.`,
};
