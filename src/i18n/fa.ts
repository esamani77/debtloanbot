import { Translations } from './types';

export const fa: Translations = {
  // Nickname
  nicknamePrompt: (defaultName) =>
    `دیگران شما را با چه نامی بشناسند؟\n\n*پیش‌فرض:* ${defaultName}\n\nیک نام دلخواه تایپ کنید یا دکمه زیر را بزنید:`,
  nicknameSet: (name) => `✅ نام نمایشی شما *${name}* تنظیم شد!`,
  nicknameUpdated: (name) => `✅ نام نمایشی به *${name}* بروزرسانی شد.`,
  btnKeepTelegramName: 'همان نام تلگرام',
  btnChangeNickname: '✏️ تغییر نام نمایشی',

  // Buttons
  btnInvite: '📨 دریافت لینک دعوت',
  btnContacts: '📋 مخاطبین',
  btnHelp: '❓ راهنما',
  btnBalance: '💰 مشاهده تراز',
  btnLogs: '📋 سوابق تراکنش',
  btnAdd: '➕ افزودن تراکنش',
  btnAddAnother: '➕ افزودن تراکنش دیگر',
  btnCancel: '❌ لغو',
  btnSkipNote: '⏭ رد کردن یادداشت',
  btnBack: '↩️ بازگشت',
  btnBackContacts: '👥 بازگشت به مخاطبین',
  btnSetCurrency: '💱 تغییر ارز',
  btnChangeLang: '🌐 تغییر زبان',
  btnInviteFriend: '📨 دعوت دوست',
  btnAccounts: '🏦 حساب‌های بانکی من',
  btnAddAccount: '➕ افزودن حساب',
  btnWithdrawalInfo: '💳 اطلاعات برداشت',
  btnProfile: '👤 پروفایل',

  // Profile
  profileTitle: '👤 *پروفایل شما*',
  profileInfo: (name, lang) => `*نام:* ${name}\n*زبان:* ${lang}`,
  profileBtnBankAccounts: (n) => `🏦 حساب‌های بانکی (${n})`,

  // Common errors
  errCannotIdentify: 'شناسایی کاربر ممکن نیست. لطفاً دوباره تلاش کنید.',
  errSomethingWrong: '❌ مشکلی پیش آمد. لطفاً دوباره تلاش کنید.',
  errNoContact:
    '⚠️ مخاطبی انتخاب نشده. لطفاً ابتدا از /contacts یک مخاطب انتخاب کنید.',
  errUserNotFound:
    '❌ کاربر یافت نشد. لطفاً ابتدا /start را ارسال کنید.',
  errNoRelationship:
    '⚠️ ارتباطی با این مخاطب وجود ندارد. ابتدا آن‌ها را با /invite دعوت کنید.',

  // Language
  langPickerPrompt:
    '🌐 Choose your language:\n\nزبان خود را انتخاب کنید:',
  langUpdated: '✅ زبان به فارسی تغییر یافت.',

  // Start
  startWelcome: (name) =>
    `سلام *${name}*! 👋 به *DebtMate* خوش آمدید!\n\nبدهی و قرض با دوستانتان را به‌راحتی پیگیری کنید.\n\n*دستورات:*\n/invite — لینک دعوت شما\n/contacts — مخاطبین و تراز\n/balance — تراز مخاطب فعال\n/add — افزودن تراکنش\n/logs — سوابق اخیر\n/help — راهنما`,
  startWelcomeBack: (name) =>
    `سلام دوباره *${name}*! 👋 خوشحالیم که برگشتید.`,
  startInviteInvalid: (name) =>
    `به *DebtMate* خوش آمدید، *${name}*! 👋\n\nلینک دعوت نامعتبر به نظر می‌رسد، اما حساب شما آماده است.\nاز /invite برای ارتباط با دوستانتان استفاده کنید!`,
  startConnected: (name, inviterName) =>
    `به *DebtMate* خوش آمدید، *${name}*! 👋\n\nشما با *${inviterName}* متصل شدید!\nاکنون می‌توانید بدهی و قرض بین خودتان را پیگیری کنید.`,
  startAlreadyConnected: (name, inviterName) =>
    `سلام دوباره *${name}*! 👋\n\nشما قبلاً با *${inviterName}* متصل شده‌اید.`,
  startInviterNotified: (joinerName) =>
    `🎉 *${joinerName}* دعوت شما را پذیرفت و در DebtMate با شما متصل شد!\n\nاز /contacts می‌توانید ارتباطات خود را ببینید.`,

  // Help
  helpText:
    `❓ *DebtMate — راهنما*\n\n` +
    `*دستورات:*\n` +
    `/start — ثبت‌نام و خوش‌آمدگویی\n` +
    `/invite — لینک دعوت شخصی شما\n` +
    `/contacts — مخاطبین و تراز\n` +
    `/balance — تراز با مخاطب فعال\n` +
    `/add — افزودن بدهی یا قرض\n` +
    `/logs — سوابق اخیر\n` +
    `/help — این پیام راهنما\n\n` +
    `*نحوه استفاده:*\n` +
    `۱. با /invite لینک خود را دریافت کنید\n` +
    `۲. لینک را با دوستتان به اشتراک بگذارید\n` +
    `۳. از /contacts مخاطب را انتخاب کنید\n` +
    `۴. با /add تراکنش ثبت کنید\n` +
    `۵. با /balance تراز را ببینید\n\n` +
    `*انواع تراکنش:*\n` +
    `💰 *وام* — شما قرض دادید (طلبکار هستید)\n` +
    `💸 *بدهی* — شما قرض گرفتید (بدهکار هستید)`,

  // Invite
  inviteText: (link) =>
    `📨 *لینک دعوت شما*\n\nاین لینک را با دوستتان به اشتراک بگذارید تا در DebtMate متصل شوید:\n\n${link}\n\nوقتی لینک را بزنند و ربات را شروع کنند، به‌طور خودکار متصل می‌شوید!`,

  // Contacts
  contactsTitle: '👥 *مخاطبین شما*',
  contactsEmpty:
    'هنوز مخاطبی ندارید. از /invite برای اتصال به دوستانتان استفاده کنید.',
  contactsSelectPrompt: 'یک مخاطب را برای مشاهده جزئیات انتخاب کنید:',
  contactsBalanceSettled: '✅ تسویه',
  contactsBalanceOwed: (sym, amount) => `🟢 طلبکار ${sym}${amount}`,
  contactsBalanceOwes: (sym, amount) => `🔴 بدهکار ${sym}${amount}`,

  // Select
  selectActiveContact: (name) =>
    `✅ *مخاطب فعال: ${name}*\n\nچه کاری می‌خواهید انجام دهید؟`,

  // Balance
  balanceSettled: (name) =>
    `✅ *تسویه کامل!*\n\nشما و *${name}* با هم تسویه هستید.`,
  balanceOwed: (name, sym, amount) =>
    `💚 *شما طلبکار هستید!*\n\n*${name}* به شما *${sym}${amount}* بدهکار است.`,
  balanceOwes: (name, sym, amount) =>
    `❤️ *شما بدهکار هستید*\n\nشما به *${name}* *${sym}${amount}* بدهکار هستید.`,

  // Logs
  logsTitle: (name) => `📋 *سوابق اخیر با ${name}*`,
  logsEmpty: (name) =>
    `📋 *سوابق تراکنش با ${name}*\n\nهنوز تراکنشی ثبت نشده. اولین تراکنش را اضافه کنید!`,
  logLoan: 'وام',
  logDebt: 'بدهی',
  logAddedByYou: 'شما',

  // Add Transaction
  txNoContact:
    '⚠️ مخاطبی انتخاب نشده. لطفاً ابتدا از /contacts یک مخاطب انتخاب کنید.',
  txTypeQuestion: (name) =>
    `در حال افزودن تراکنش با *${name}*.\n\nنوع تراکنش چیست؟`,
  txTypeBorrow: '🔴 قرض گرفتم',
  txTypeLend: '🟢 قرض دادم',
  txUseButtons: 'لطفاً از دکمه‌های بالا نوع تراکنش را انتخاب کنید.',
  txSelectedType: (label, sym) =>
    `انتخاب شد: *${label}*\n\nمبلغ را به ${sym} وارد کنید (مثلاً 25.50):`,
  txEnterAmount: 'لطفاً یک عدد معتبر وارد کنید (مثلاً 25.50):',
  txInvalidAmount:
    '⚠️ مبلغ نامعتبر. لطفاً یک عدد مثبت وارد کنید (مثلاً 25.50):',
  txAmountConfirm: (sym, amount) =>
    `مبلغ: *${sym}${amount}*\n\nآیا می‌خواهید یادداشتی اضافه کنید؟`,
  txNoteOrSkip: 'لطفاً یادداشت بنویسید یا «رد کردن یادداشت» را بزنید:',
  txNoteSkipped: 'بدون یادداشت.',
  txCancelled: 'تراکنش لغو شد.',
  txSomethingWrong:
    '❌ مشکلی پیش آمد. لطفاً دوباره با /add امتحان کنید.',
  txTypeLabelDebt: '💸 بدهی (قرض گرفتم)',
  txTypeLabelLoan: '💰 وام (قرض دادم)',
  txSaved: (typeLabel, sym, amount, contactName, note) =>
    `✅ *تراکنش ذخیره شد!*\n\nنوع: ${typeLabel}\nمبلغ: *${sym}${amount}*\nبا: ${contactName}` +
    (note ? `\nیادداشت: ${note}` : ''),

  // Notifications
  notifyBorrowed: (name, sym, amount) =>
    `💸 *${name}* یک تراکنش با شما ثبت کرد:\nآن‌ها *${sym}${amount}* از شما قرض گرفتند.`,
  notifyLent: (name, sym, amount) =>
    `💰 *${name}* یک تراکنش با شما ثبت کرد:\nآن‌ها *${sym}${amount}* به شما قرض دادند.`,
  notifyNote: (note) => `یادداشت: ${note}`,

  // Feedback
  btnSendFeedback: '💬 ارسال بازخورد',
  btnSkipFeedback: '⏭ رد کردن',
  feedbackPrompt: (name) =>
    `💬 یک پیام بازخورد به *${name}* ارسال کنید.\n\nمی‌توانید متن، تصویر، GIF یا استیکر بفرستید.\nاگر نمی‌خواهید چیزی بفرستید، *رد کردن* را بزنید.`,
  feedbackSkipped: 'بازخورد رد شد.',
  feedbackSent: '✅ بازخورد شما ارسال شد!',
  feedbackReceived: (name) => `💬 *${name}* یک پیام بازخورد برای شما فرستاد:`,

  // Bank accounts
  acctTitle: '🏦 *حساب‌های بانکی شما*',
  acctEmpty: 'هنوز حساب بانکی ثبت نشده. یک حساب اضافه کنید تا مخاطبین بتوانند پرداخت کنند.',
  acctItem: (i, bankName, name, card) =>
    `${i}. *${bankName}*\n   👤 ${name}  💳 ${card}`,
  acctEnterName: '👤 نام صاحب حساب را وارد کنید:',
  acctEnterCardNumber: '💳 شماره کارت را وارد کنید (۱۶ رقم):',
  acctInvalidCardNumber: '⚠️ شماره کارت نامعتبر. لطفاً دقیقاً ۱۶ رقم وارد کنید:',
  acctEnterAccountNumber: '🏦 شماره حساب یا شبا را وارد کنید (برای ریال با IR شروع می‌شود):',
  acctEnterBankName: '🏛️ نام بانک را وارد کنید:',
  acctSaved: '✅ حساب بانکی با موفقیت ذخیره شد!',
  acctUpdated: '✅ حساب بانکی با موفقیت به‌روزرسانی شد!',
  acctDeleted: '🗑️ حساب بانکی حذف شد.',
  acctConfirmDelete: (bankName, name) =>
    `🗑️ حذف *${bankName}* (${name})؟\n\nاین عملیات قابل بازگشت نیست.`,
  acctCancelled: 'لغو شد.',

  // Withdrawal info
  withdrawalTitle: (contactName) =>
    `💳 *حساب‌های بانکی ${contactName}*`,
  withdrawalEmpty: (contactName) =>
    `${contactName} هنوز حساب بانکی ثبت نکرده است.`,
  withdrawalItem: (bankName, name, card, account) =>
    `🏛️ *${bankName}*\n👤 ${name}\n💳 شماره کارت: \`${card}\`\n🔢 شماره حساب: \`${account}\``,

  // Currency
  currencyPickerTitle: (name) =>
    `💱 ارز تراکنش‌ها با *${name}* را انتخاب کنید:`,
  currencyPickerDesc:
    'تمام تراکنش‌های موجود و آینده با این مخاطب با ارز انتخابی نمایش داده می‌شوند.',
  currencyUpdated: (label, name, sym) =>
    `✅ ارز به *${label}* تغییر یافت\n\nتمام تراکنش‌ها با *${name}* از این به بعد به ${sym} نمایش داده می‌شوند.`,
};
