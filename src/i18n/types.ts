export interface Translations {
  // Nickname
  nicknamePrompt: (defaultName: string) => string;
  nicknameSet: (name: string) => string;
  nicknameUpdated: (name: string) => string;
  btnKeepTelegramName: string;
  btnChangeNickname: string;

  // Buttons
  btnInvite: string;
  btnContacts: string;
  btnHelp: string;
  btnBalance: string;
  btnLogs: string;
  btnAdd: string;
  btnAddAnother: string;
  btnCancel: string;
  btnSkipNote: string;
  btnBack: string;
  btnBackContacts: string;
  btnSetCurrency: string;
  btnChangeLang: string;
  btnInviteFriend: string;
  btnAccounts: string;
  btnAddAccount: string;
  btnWithdrawalInfo: string;
  btnProfile: string;

  // Profile
  profileTitle: string;
  profileInfo: (name: string, langLabel: string) => string;
  profileBtnBankAccounts: (count: number) => string;

  // Common errors
  errCannotIdentify: string;
  errSomethingWrong: string;
  errNoContact: string;
  errUserNotFound: string;
  errNoRelationship: string;

  // Language picker
  langPickerPrompt: string;
  langUpdated: string;

  // Start / Welcome
  startWelcome: (name: string) => string;
  startWelcomeBack: (name: string) => string;
  startInviteInvalid: (name: string) => string;
  startConnected: (name: string, inviterName: string) => string;
  startAlreadyConnected: (name: string, inviterName: string) => string;
  startInviterNotified: (joinerName: string) => string;

  // Help
  helpText: string;

  // Invite
  inviteText: (link: string) => string;

  // Contacts
  contactsTitle: string;
  contactsEmpty: string;
  contactsSelectPrompt: string;
  contactsBalanceSettled: string;
  contactsBalanceOwed: (symbol: string, amount: string) => string;
  contactsBalanceOwes: (symbol: string, amount: string) => string;

  // Select contact
  selectActiveContact: (name: string) => string;

  // Balance
  balanceSettled: (name: string) => string;
  balanceOwed: (name: string, symbol: string, amount: string) => string;
  balanceOwes: (name: string, symbol: string, amount: string) => string;

  // Logs
  logsTitle: (name: string) => string;
  logsEmpty: (name: string) => string;
  logLoan: string;
  logDebt: string;
  logAddedByYou: string;

  // Add Transaction scene
  txNoContact: string;
  txTypeQuestion: (name: string) => string;
  txTypeBorrow: string;
  txTypeLend: string;
  txUseButtons: string;
  txSelectedType: (label: string, symbol: string) => string;
  txEnterAmount: string;
  txInvalidAmount: string;
  txAmountConfirm: (symbol: string, amount: string) => string;
  txNoteOrSkip: string;
  txNoteSkipped: string;
  txCancelled: string;
  txSomethingWrong: string;
  txTypeLabelDebt: string;
  txTypeLabelLoan: string;
  txSaved: (typeLabel: string, symbol: string, amount: string, contactName: string, note?: string) => string;

  // Notification to contact
  notifyBorrowed: (name: string, symbol: string, amount: string) => string;
  notifyLent: (name: string, symbol: string, amount: string) => string;
  notifyNote: (note: string) => string;

  // Feedback
  btnSendFeedback: string;
  btnSkipFeedback: string;
  feedbackPrompt: (name: string) => string;
  feedbackSkipped: string;
  feedbackSent: string;
  feedbackReceived: (name: string) => string;

  // Currency
  currencyPickerTitle: (name: string) => string;
  currencyPickerDesc: string;
  currencyUpdated: (currLabel: string, name: string, symbol: string) => string;

  // Bank accounts — own management
  acctTitle: string;
  acctEmpty: string;
  acctItem: (index: number, bankName: string, name: string, cardNumber: string) => string;
  acctEnterName: string;
  acctEnterCardNumber: string;
  acctInvalidCardNumber: string;
  acctEnterAccountNumber: string;
  acctEnterBankName: string;
  acctSaved: string;
  acctUpdated: string;
  acctDeleted: string;
  acctConfirmDelete: (bankName: string, name: string) => string;
  acctCancelled: string;

  // Withdrawal info — viewing a contact's accounts
  withdrawalTitle: (contactName: string) => string;
  withdrawalEmpty: (contactName: string) => string;
  withdrawalItem: (bankName: string, name: string, cardNumber: string, accountNumber: string) => string;
}
