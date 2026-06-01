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
  btnSplit: string;

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
  notifyEditedLoan: (name: string, symbol: string, amount: string) => string;
  notifyEditedDebt: (name: string, symbol: string, amount: string) => string;
  notifyDeletedLoan: (name: string, symbol: string, amount: string) => string;
  notifyDeletedDebt: (name: string, symbol: string, amount: string) => string;
  notifySettledTransaction: (name: string, symbol: string, amount: string) => string;
  notifySettledAll: (name: string) => string;

  // Settle (bot flow)
  btnSettle: string;
  txSettleConfirm: (typeLabel: string, symbol: string, amount: string) => string;
  txSettleConfirmBtn: string;
  txSettled: string;
  txSettleAllConfirm: (name: string) => string;
  txSettleAllDone: (count: number, name: string) => string;
  txSettleAllEmpty: (name: string) => string;

  // Edit / delete transaction (bot flow)
  txEditAmountPrompt: (symbol: string, amount: string) => string;
  txEditNotePrompt: (note: string | null) => string;
  txEditSaved: string;
  txEditCancelled: string;
  btnSkipAmount: string;
  btnClearNote: string;
  txDeleteConfirm: (typeLabel: string, symbol: string, amount: string) => string;
  txDeleteConfirmBtn: string;
  txDeleted: string;

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

  // Settlement request
  btnSettlementRequest: string;
  settlementRequestSent: (name: string) => string;
  settlementRequestReceived: (name: string, sym: string, amount: string) => string;

  // Bill Splitting
  splitAskName: string;
  splitBtnSkipName: string;
  splitAskCurrency: string;
  splitAskParticipantCount: string;
  splitInvalidCount: string;
  splitAskParticipantName: (index: number, total: number) => string;
  splitParticipantsDone: (names: string[]) => string;
  splitAskBillName: string;
  splitAskBillAmount: (sym: string) => string;
  splitInvalidAmount: string;
  splitAskPayer: string;
  splitAskSplitType: string;
  splitBtnEqual: string;
  splitBtnByPercentage: string;
  splitBtnCustomAmount: string;
  splitAskShare: (name: string, sym: string, remaining: string, isPercent: boolean) => string;
  splitShareValidationError: (got: string, expected: string, isPercent: boolean) => string;
  splitBillSummary: (bills: Array<{ name: string; totalAmount: number; paidBy: string }>, sym: string) => string;
  splitBtnAddBill: string;
  splitBtnCalculate: string;
  splitBalanceSummary: (participants: string[], balances: number[], sym: string) => string;
  splitBtnSettlementPlan: string;
  splitSettlementPlan: (transfers: Array<{ from: string; to: string; amount: number }>, sym: string, bankAccounts: Record<string, Array<{ bankName: string; cardNumber: string; accountNumber: string; name: string }>>) => string;
  splitBtnShare: string;
  splitShareLink: (link: string, sessionName: string | null) => string;
  splitSessionExpired: string;
  splitSessionNotFound: string;
  splitDraftFound: (name: string | null) => string;
  splitBtnResume: string;
  splitBtnStartNew: string;
  splitsList: (sessions: Array<{ name: string | null; status: string; billCount: number; createdAt: Date }>) => string;
  splitCancelled: string;
  splitBtnCancel: string;
  splitZeroAmountError: string;
  splitMinParticipantsError: string;
  splitSharedSummary: (sessionName: string | null, currency: string, createdAt: Date, participants: string[], balances: number[], transfers: Array<{ from: string; to: string; amount: number }>, sym: string, bankAccounts: Record<string, Array<{ bankName: string; cardNumber: string; accountNumber: string; name: string }>>, bills: Array<{ name: string; totalAmount: number; paidBy: string }>) => string;

  // Split menu (hub)
  splitMenuTitle: string;
  splitMenuNewSplit: string;
  splitSessionDetail: (name: string | null, currency: string, participants: string[], billCount: number, status: string, sym: string) => string;
  splitBtnAddBillToSession: string;
  splitBtnRecalculate: string;
  splitBtnShareSession: string;
  splitNoSessions: string;
  splitAddingBillToSession: (name: string | null) => string;

  // Split participant picker (3-mode)
  splitPickParticipantMode: (index: number, total: number) => string;
  splitBtnFromContacts: string;
  splitBtnByTelegramId: string;
  splitBtnByName: string;
  splitEnterTelegramId: string;
  splitUserFound: (name: string) => string;
  splitUserNotFound: string;
  splitNoContacts: string;
  splitNotifyAddedToSplit: (creatorName: string, sessionName: string | undefined) => string;

  // Daily reminder
  reminderMessage: (
    owes: Array<{ name: string; sym: string; amount: string }>,
    owed: Array<{ name: string; sym: string; amount: string }>
  ) => string;
}
