import type { Dictionary } from './en';

/**
 * Arabic.
 *
 * Written right to left, which the root layout sets on `<html dir>`. The
 * translations are of the meaning rather than of the English words: an Emirates
 * ID is «الهوية الإماراتية», verification is «التوثيق», and a legal firm is
 * «مكتب محاماة» rather than a literal "legal company".
 */
export const ar: Dictionary = {
  language: { label: 'اللغة', change: 'تغيير اللغة' },

  nav: {
    menu: 'القائمة',
    closeMenu: 'إغلاق القائمة',
    openMenu: 'فتح القائمة',
    directory: 'دليل المحامين',
    community: 'المجتمع',
    howVerificationWorks: 'كيف يعمل التوثيق',
    emergency: 'مساعدة عاجلة',
    signIn: 'تسجيل الدخول',
    createAccount: 'إنشاء حساب',
    signOut: 'تسجيل الخروج',
    skipToContent: 'الانتقال إلى المحتوى',
  },

  groups: {
    explore: 'استكشف',
    yourCases: 'قضاياك',
    findHelp: 'ابحث عن مساعدة',
    yourAccount: 'حسابك',
    yourPractice: 'مكتبك',
    yourProfile: 'ملفك',
    communityAndHelp: 'المجتمع والدعم',
    console: 'لوحة الإدارة',
    public: 'عام',
  },

  items: {
    dashboard: 'لوحة التحكم',
    myCases: 'قضاياي',
    fees: 'الأتعاب والإيصالات',
    rooms: 'غرف الاجتماعات',
    reviews: 'التقييمات',
    inquiries: 'الاستفسارات',
    verification: 'التوثيق',
    support: 'الدعم',
    alerts: 'التنبيهات',
    myProfile: 'ملفي الشخصي',
    accountSecurity: 'الحساب والأمان',
    publicDirectory: 'الدليل العام',
    portfolio: 'ملف أعمالي',
    pending: 'قضايا بانتظار المراجعة',
    clients: 'العملاء',
    calendar: 'التقويم',
    emergencyDesk: 'مكتب الحالات العاجلة',
    enquiryPool: 'مجمع الاستفسارات',
    legalDetails: 'البيانات القانونية',
    listing: 'بطاقة الدليل',
    receiptLayout: 'تنسيق الإيصال',
    firmLawyers: 'المحامون المسجلون',
    invitations: 'دعوات المكتب',
    practiceOversight: 'إشراف المكتب',
    myDetails: 'بياناتي',
    myAlerts: 'تنبيهاتي',
    pushNotifications: 'الإشعارات الفورية',
    activityRegister: 'سجل النشاط',
    settings: 'الإعدادات',
    accounts: 'الحسابات',
    verificationQueue: 'قائمة التوثيق',
    casesOversight: 'القضايا (إشراف)',
    emergencies: 'الحالات العاجلة',
    meetings: 'الاجتماعات والغرف',
    payments: 'المدفوعات',
  },

  tabs: { home: 'الرئيسية', community: 'المجتمع', allBoards: 'جميع الأقسام' },

  landing: {
    badge: 'الإمارات العربية المتحدة',
    heroTitle: 'ابحث عن محامٍ يمكنك التحقق منه فعلاً.',
    heroBody:
      'يربطك دبي ليجال بمحامين ومكاتب محاماة في جميع الإمارات: مؤهلات موثّقة، وقضية تتابعها من أول رسالة إلى آخرها، وكل ما يهم في مكان واحد.',
    findLawyer: 'ابحث عن محامٍ',
    iAmProfessional: 'أنا محامٍ أو مكتب محاماة',
    urgentHelp: 'مساعدة عاجلة، بدون حساب',
    legalFirms: 'مكاتب المحاماة',
    lawyers: 'المحامون',
    clientReviews: 'تقييمات العملاء',
  },

  community: {
    heading: 'اسأل من مرّ بالتجربة من قبل',
    intro:
      'إجابات حقيقية من أعضاء مرّوا بالتجربة: ما تتضمنه الإجراءات، وكم كلّفت، ومن ساعد. يستطيع الجميع القراءة، والحساب هو ما يتيح لك التفاعل أو الرد أو طرح سؤالك.',
    readOnlyTitle: 'اقرأ كل شيء؛ وسجّل الدخول للمشاركة',
    readOnlyBody:
      'كل منشور وردّ هنا متاح للجميع. للتفاعل أو التعليق أو طرح سؤالك، سجّل الدخول أو أنشئ حساباً — وستعود مباشرة إلى هذه الصفحة.',
    writePost: 'اكتب منشوراً',
    writePostHelp:
      'اطرح سؤالاً، أو أوصِ بمهني تعاملت معه، أو اكتب ما حدث. يقرأه مشرف أولاً، وهدفه الأساسي التحقق من أن السؤال لم يُطرح ويُجب من قبل.',
    empty:
      'لم يُنشر شيء بعد. القسم فارغ بدل أن يُملأ بأمثلة: التوصيات هنا من عملاء حقيقيين، وأولها سيكون حقيقياً كذلك.',
    browseBoards: 'تصفّح الأقسام',
    createToPost: 'أنشئ حساباً للنشر',
    openFull: 'افتح المجتمع كاملاً',
    writeComment: 'اكتب تعليقاً…',
    reply: 'رد',
    comment: 'تعليق',
    reactions: { like: 'إعجاب', love: 'أحببته', surprised: 'مفاجأة' },
  },

  auth: {
    signInTitle: 'تسجيل الدخول',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    fullName: 'اسمك الكامل',
    fullNameHint: 'كما هو مكتوب في إثبات الهوية، ليتمكن المراجع من مطابقته.',
    phone: 'رقم الهاتف',
    phoneHint: 'كيف يصل إليك الطرف الآخر في القضية، وكيف يتم إبلاغك بالرد.',
    accountType: 'كيف ستستخدم دبي ليجال؟',
    accountTypeHint:
      'يحدد هذا ما يجب تقديمه للتوثيق، ولا يمكن تغييره لاحقاً. تُطلب بيانات هويتك ومستنداتك في تبويب التوثيق، حيث يقرأها المراجع.',
    createAccountTitle: 'أنشئ حسابك',
    haveAccount: 'لديك حساب بالفعل؟',
    noAccount: 'جديد على دبي ليجال؟',
    forgotPassword: 'نسيت كلمة المرور؟',
  },

  common: {
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    back: 'رجوع',
    loading: 'جارٍ التحميل…',
    readMore: 'اقرأ المزيد',
    comingSoon: 'قيد التطوير',
  },

  footer: {
    disclaimer:
      'دبي ليجال ليست مكتب محاماة ولا تقدّم استشارات قانونية. المعلومات في الدليل يقدّمها أعضاؤه. تحقق دائماً من ترخيص المهني قبل تكليفه.',
  },
};
