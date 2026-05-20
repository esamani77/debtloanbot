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
  btnSplit: '🧾 دنگ',

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
    `/split — شروع تقسیم هزینه گروهی\n` +
    `/splits — مشاهده تقسیم‌های اخیر\n` +
    `/help — این پیام راهنما\n\n` +
    `*نحوه استفاده:*\n` +
    `۱. با /invite لینک خود را دریافت کنید\n` +
    `۲. لینک را با دوستتان به اشتراک بگذارید\n` +
    `۳. از /contacts مخاطب را انتخاب کنید\n` +
    `۴. با /add تراکنش ثبت کنید\n` +
    `۵. با /balance تراز را ببینید\n\n` +
    `*تقسیم هزینه:*\n` +
    `با /split هزینه‌های گروهی را عادلانه تقسیم کنید.\n` +
    `شرکت‌کنندگان را اضافه کنید، هزینه‌ها را وارد کنید\n` +
    `و یک لینک فقط‌خواندنی با گروهتان به اشتراک بگذارید.\n\n` +
    `*انواع تراکنش:*\n` +
    `💰 *وام* — شما قرض دادید (طلبکار هستید)\n` +
    `💸 *بدهی* — شما قرض گرفتید (بدهکار هستید)`,

  // Invite
  inviteText: (link) =>
    `📨 *لینک دعوت شما*\n\nاین لینک را با دوستتان به اشتراک بگذارید تا در DebtMate متصل شوید:\n\n\`${link}\`\n\nوقتی لینک را بزنند و ربات را شروع کنند، به‌طور خودکار متصل می‌شوید!`,

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

  // Settlement request
  btnSettlementRequest: '💸 درخواست تسویه',
  settlementRequestSent: (name) => `✅ درخواست تسویه به *${name}* ارسال شد!`,
  settlementRequestReceived: (name, sym, amount) =>
    `📢 *${name}* از شما درخواست تسویه بدهی کرده است.\n\nشما به آن‌ها *${sym}${amount}* بدهکار هستید.\n\nلطفاً در اسرع وقت مبلغ را پرداخت کنید.`,

  // Currency
  currencyPickerTitle: (name) =>
    `💱 ارز تراکنش‌ها با *${name}* را انتخاب کنید:`,
  currencyPickerDesc:
    'تمام تراکنش‌های موجود و آینده با این مخاطب با ارز انتخابی نمایش داده می‌شوند.',
  currencyUpdated: (label, name, sym) =>
    `✅ ارز به *${label}* تغییر یافت\n\nتمام تراکنش‌ها با *${name}* از این به بعد به ${sym} نمایش داده می‌شوند.`,

  // Bill Splitting
  splitAskName: '🧾 *شروع تقسیم هزینه*\n\nیک نام برای این جلسه بگذارید (مثلاً "سفر بارسلون"، "شام جمعه") یا رد کنید:',
  splitBtnSkipName: '⏭ رد کردن',
  splitAskCurrency: '💱 ارز این تقسیم را انتخاب کنید:',
  splitAskParticipantCount: '👥 چند نفر در این هزینه سهیم هستند؟ یک عدد بین ۲ تا ۲۰ وارد کنید:',
  splitInvalidCount: '⚠️ لطفاً یک عدد بین ۲ تا ۲۰ وارد کنید.',
  splitAskParticipantName: (i, total) => `👤 نام شرکت‌کننده ${i} از ${total} را وارد کنید:`,
  splitParticipantsDone: (names) => `✅ *شرکت‌کنندگان اضافه شدند:*\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\nحالا هزینه‌ها را اضافه کنید.`,
  splitAskBillName: '📝 این هزینه مربوط به چه بود؟ (مثلاً "هتل"، "شام"، "تاکسی")',
  splitAskBillAmount: (sym) => `💰 مبلغ را به ${sym} وارد کنید:`,
  splitInvalidAmount: '⚠️ لطفاً یک عدد مثبت معتبر وارد کنید.',
  splitAskPayer: '🙋 چه کسی این هزینه را پرداخت کرده؟',
  splitAskSplitType: '⚖️ نحوه تقسیم را انتخاب کنید:',
  splitBtnEqual: '⚖️ تقسیم مساوی',
  splitBtnByPercentage: '📊 بر اساس درصد',
  splitBtnCustomAmount: '💰 مبلغ دستی',
  splitAskShare: (name, sym, remaining, isPercent) =>
    isPercent
      ? `📊 درصد *${name}*:\n\n_(باقیمانده: ${remaining}٪)_`
      : `💰 مبلغ *${name}* (${sym}):\n\n_(باقیمانده: ${sym}${remaining})_`,
  splitShareValidationError: (got, expected, isPercent) =>
    isPercent
      ? `⚠️ مجموع درصدها ${got}٪ شد — باید برابر ۱۰۰٪ باشد. لطفاً دوباره شروع کنید.`
      : `⚠️ مجموع مبالغ ${got} شد — باید برابر ${expected} باشد. لطفاً دوباره شروع کنید.`,
  splitBillSummary: (bills, sym) =>
    `📋 *هزینه‌های ثبت‌شده:*\n\n${bills.map((b, i) => `${i + 1}. *${b.name}* — ${sym}${b.totalAmount.toFixed(2)} (پرداخت: ${b.paidBy})`).join('\n')}`,
  splitBtnAddBill: '➕ افزودن هزینه دیگر',
  splitBtnCalculate: '🧮 محاسبه',
  splitBalanceSummary: (participants, balances, sym) => {
    const lines = participants.map((p, i) => {
      const b = balances[i];
      if (b > 0.005) return `🟢 *${p}*: +${sym}${b.toFixed(2)} _(طلبکار)_`;
      if (b < -0.005) return `🔴 *${p}*: -${sym}${Math.abs(b).toFixed(2)} _(بدهکار)_`;
      return `⚪ *${p}*: تسویه`;
    });
    return `💰 *خلاصه تراز*\n\n${lines.join('\n')}`;
  },
  splitBtnSettlementPlan: '📋 نمایش برنامه تسویه',
  splitSettlementPlan: (transfers, sym, bankAccounts) => {
    if (transfers.length === 0) return '✅ *همه تسویه هستند — نیازی به انتقال نیست!*';
    const lines = transfers.map((t) => {
      let line = `• *${t.from}* → به *${t.to}*: ${sym}${t.amount.toFixed(2)}`;
      const accts = bankAccounts[t.to];
      if (accts && accts.length > 0) {
        const a = accts[0];
        line += `\n  🏛️ ${a.bankName} | 💳 \`${a.cardNumber}\``;
      }
      return line;
    });
    return `📋 *برنامه تسویه*\n\n${lines.join('\n\n')}`;
  },
  splitBtnShare: '🔗 اشتراک‌گذاری نتایج',
  splitShareLink: (link, sessionName) =>
    `🔗 *اشتراک‌گذاری این تقسیم${sessionName ? ` — ${sessionName}` : ''}*\n\n\`${link}\`\n\nهر کسی می‌تواند این لینک را باز کند و نتایج را ببیند.`,
  splitSessionExpired: '⏰ این جلسه تقسیم منقضی شده است (لینک‌ها ۹۰ روز اعتبار دارند).',
  splitSessionNotFound: '❌ جلسه تقسیم یافت نشد.',
  splitDraftFound: (name) =>
    `📋 شما یک تقسیم ناتمام${name ? ` (*${name}*)` : ''} در ۴۸ ساعت گذشته دارید.\n\nآیا می‌خواهید ادامه دهید یا جدید شروع کنید؟`,
  splitBtnResume: '▶️ ادامه',
  splitBtnStartNew: '🆕 شروع جدید',
  splitsList: (sessions) => {
    if (sessions.length === 0) return '📋 *تقسیم‌های شما*\n\nهنوز تقسیمی ندارید. از /split استفاده کنید.';
    const statusEmoji: Record<string, string> = { DRAFT: '🟡', CALCULATED: '🟢', SHARED: '🔵' };
    const lines = sessions.map((s, i) => {
      const emoji = statusEmoji[s.status] ?? '⚪';
      const name = s.name ?? 'بدون نام';
      const date = s.createdAt.toLocaleDateString('fa-IR');
      return `${i + 1}. ${emoji} *${name}* — ${s.billCount} هزینه · ${date}`;
    });
    return `📋 *تقسیم‌های اخیر شما*\n\n${lines.join('\n')}\n\n🟡 پیش‌نویس  🟢 محاسبه‌شده  🔵 اشتراک‌گذاری‌شده`;
  },
  splitCancelled: '❌ جلسه تقسیم لغو شد.',
  splitBtnCancel: '❌ لغو',
  splitZeroAmountError: '⚠️ مبلغ باید بیشتر از صفر باشد.',
  splitMinParticipantsError: '⚠️ حداقل به ۲ شرکت‌کننده نیاز دارید.',
  splitMenuTitle: '🧾 *تقسیم هزینه*\n\nیک تقسیم جدید شروع کنید یا ادامه دهید:',
  splitMenuNewSplit: '➕ تقسیم جدید',
  splitSessionDetail: (name, currency, participants, billCount, status, sym) => {
    const statusLabels: Record<string, string> = { DRAFT: '🟡 پیش‌نویس', CALCULATED: '🟢 محاسبه‌شده', SHARED: '🔵 اشتراک‌گذاری‌شده' };
    return `🧾 *${name ?? 'بدون نام'}*\n💱 ${currency} (${sym})\n👥 ${participants.join('، ')}\n📋 ${billCount} هزینه\n${statusLabels[status] ?? status}`;
  },
  splitBtnAddBillToSession: '➕ افزودن هزینه',
  splitBtnRecalculate: '🧮 محاسبه مجدد',
  splitBtnShareSession: '🔗 اشتراک‌گذاری',
  splitNoSessions: '🧾 *تقسیم هزینه*\n\nهنوز تقسیمی ندارید. همین الان شروع کنید!',
  splitAddingBillToSession: (name) => `➕ *افزودن هزینه به "${name ?? 'تقسیم'}"*\n\nاین هزینه مربوط به چه بود؟`,

  splitSharedSummary: (sessionName, currency, createdAt, participants, balances, transfers, sym, bankAccounts) => {
    const title = sessionName ? `*${sessionName}*` : '*خلاصه تقسیم*';
    const date = createdAt.toLocaleDateString('fa-IR');
    const balanceLines = participants.map((p, i) => {
      const b = balances[i];
      if (b > 0.005) return `🟢 *${p}*: +${sym}${b.toFixed(2)}`;
      if (b < -0.005) return `🔴 *${p}*: -${sym}${Math.abs(b).toFixed(2)}`;
      return `⚪ *${p}*: تسویه`;
    });
    let text = `${title}\n📅 ${date} · ${currency}\n\n*تراز:*\n${balanceLines.join('\n')}`;
    if (transfers.length > 0) {
      const tLines = transfers.map((t) => {
        let line = `• *${t.from}* → *${t.to}*: ${sym}${t.amount.toFixed(2)}`;
        const accts = bankAccounts[t.to];
        if (accts && accts.length > 0) line += `\n  🏛️ ${accts[0].bankName} | 💳 \`${accts[0].cardNumber}\``;
        return line;
      });
      text += `\n\n*برنامه تسویه:*\n${tLines.join('\n\n')}`;
    } else {
      text += '\n\n✅ همه تسویه هستند!';
    }
    return text;
  },
};
