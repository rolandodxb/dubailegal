/**
 * English — the source of truth.
 *
 * Every other language is typed against this object, so a missing translation is
 * a build error rather than an English sentence appearing in the middle of a
 * French page.
 */
export const en = {
  language: { label: 'Language', change: 'Change language' },

  nav: {
    menu: 'Menu',
    closeMenu: 'Close menu',
    openMenu: 'Open menu',
    directory: 'Directory',
    community: 'Community',
    howVerificationWorks: 'How verification works',
    emergency: 'Emergency help',
    signIn: 'Sign in',
    createAccount: 'Create account',
    signOut: 'Sign out',
    skipToContent: 'Skip to content',
  },

  groups: {
    explore: 'Explore',
    yourCases: 'Your cases',
    findHelp: 'Find help',
    yourAccount: 'Your account',
    yourPractice: 'Your practice',
    yourProfile: 'Your profile',
    communityAndHelp: 'Community and help',
    console: 'Console',
    public: 'Public',
  },

  items: {
    dashboard: 'Dashboard',
    myCases: 'My cases',
    fees: 'Fees & receipts',
    rooms: 'Conference rooms',
    reviews: 'Reviews',
    inquiries: 'Inquiries',
    verification: 'Verification',
    support: 'Support',
    alerts: 'Alerts',
    myProfile: 'My profile',
    accountSecurity: 'Account & security',
    publicDirectory: 'Public directory',
    portfolio: 'My portfolio',
    pending: 'Cases pending review',
    clients: 'Clients',
    calendar: 'Calendar',
    emergencyDesk: 'Emergency desk',
    enquiryPool: 'Enquiry pool',
    legalDetails: 'Legal details',
    listing: 'Directory listing',
    receiptLayout: 'Receipt layout',
    firmLawyers: 'Lawyers registered',
    invitations: 'Firm invitations',
    practiceOversight: 'Practice oversight',
    myDetails: 'My details',
    myAlerts: 'My alerts',
    pushNotifications: 'Push notifications',
    activityRegister: 'Activity register',
    settings: 'Settings',
    accounts: 'Accounts',
    verificationQueue: 'Verification queue',
    casesOversight: 'Cases (oversight)',
    emergencies: 'Emergencies',
    meetings: 'Meetings and rooms',
    payments: 'Payments',
  },

  tabs: { home: 'Home', community: 'Community', allBoards: 'All boards' },

  landing: {
    badge: 'United Arab Emirates',
    heroTitle: 'Find a lawyer you can actually check.',
    heroBody:
      'Dubai Legal connects you with lawyers and legal firms across the Emirates — with their credentials verified, your case tracked from the first message to the last, and everything that matters kept in one place.',
    findLawyer: 'Find a lawyer',
    iAmProfessional: 'I am a lawyer or a firm',
    urgentHelp: 'Urgent help, no account',
    legalFirms: 'Legal firms',
    lawyers: 'Lawyers',
    clientReviews: 'Client reviews',
    publishedProfiles: 'published profiles, of which',
    isVerified: 'is verified',
    areVerified: 'are verified',
    emptyDirectory:
      'The directory is empty right now. Nothing here is invented to make the page look busy — profiles appear as real lawyers and firms join.',
    beFirst: 'Be the first to list',
    badgeHeading: 'What a badge means',
    badgeNote:
      'Issued only after a named reviewer approves the documents — never automatically, and withdrawn if the evidence behind it changes.',
    clientsTitle: 'Are you looking for legal assistance?',
    clientsBody:
      'Find a lawyer or firm you can check, send your case, and follow it to the end. Free, with no obligation and no fee to search.',
    clientsCta: 'What you get',
    professionalsTitle: 'Are you a lawyer or a law firm?',
    professionalsBody:
      'A profile that shows what a reviewer actually checked, cases that arrive with the paperwork attached, and meetings, documents and fees in one place.',
    professionalsCta: 'See what is included',
    clientsHeading: 'For clients',
    professionalsHeading: 'For lawyers and firms',
    communityEyebrow: 'Community',
    verifiedByHand: 'Reviewed by a person, never by a machine',
    clientsIntro: 'Most people find a lawyer through a friend and hope for the best. Dubai Legal gives you the details to judge for yourself, and a record of everything afterwards. Everything below is what you get as a client — searching is free, and it stays free.',
    needLawyer: 'I need a lawyer',
    needLawyerBody: 'An account is what turns a directory listing into a case you can follow. It needs your identity documents to verify you, and your number is never published.',
    createFreeAccount: 'Create a free account',
    searchFirst: 'Search first',
    professionalsIntro: 'Your next client is looking at your profile right now, deciding whether to trust you. What they find here is a record a reviewer actually checked — and a practice that answers.',
  },

  community: {
    heading: 'Ask the people who have been through it',
    intro:
      'Real answers from members who have been through it: what a process involves, what it cost, who helped. Anyone can read it; an account is what lets you react, reply or ask your own question.',
    readOnlyTitle: 'Read it all; sign in to take part',
    readOnlyBody:
      'Every post and reply here is open to anyone. To react, comment or ask your own question, sign in or create an account — you will come straight back to this page.',
    writePost: 'Write a post',
    writePostHelp:
      'Ask something, recommend a professional you used, or write down what happened. A moderator reads it first — mostly to check the question has not been answered already.',
    empty:
      'Nothing has been posted yet. The feed is empty rather than filled with examples — recommendations here come from real clients, and the first one will be real too.',
    browseBoards: 'Browse the boards',
    createToPost: 'Create an account to post',
    openFull: 'Open the full community',
    writeComment: 'Write a comment…',
    reply: 'Reply',
    comment: 'Comment',
    reactions: { like: 'Like', love: 'Love', surprised: 'Surprised' },
  },

  auth: {
    signInTitle: 'Sign in',
    email: 'Email address',
    password: 'Password',
    fullName: 'Your full name',
    fullNameHint: 'As it appears on your identification, so a reviewer can match it.',
    phone: 'Phone number',
    phoneHint: 'How the other side of a case reaches you, and how you are told about a reply.',
    accountType: 'How will you use Dubai Legal?',
    accountTypeHint:
      'This decides what you must provide to become verified, and cannot be changed later. Your identity details and documents are asked for in the verification tab, where a reviewer reads them.',
    createAccountTitle: 'Create your account',
    haveAccount: 'Already have an account?',
    noAccount: 'New to Dubai Legal?',
    forgotPassword: 'Forgot your password?',
  },

  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    back: 'Back',
    loading: 'Loading…',
    readMore: 'Read more',
    comingSoon: 'Being developed',
  },

  footer: {
    disclaimer:
      'Dubai Legal is not a law firm and does not give legal advice. Information in the directory is supplied by its members. Always confirm that a professional is licensed before instructing them.',
  },
} as const;

/**
 * The shape every language must fill.
 *
 * The English object is `as const` so its keys are known exactly; this widens the
 * *values* to `string` while keeping the structure, which is what lets another
 * language satisfy it. A missing key or a wrong nesting is a build error, so a
 * French page can never quietly contain an English sentence.
 */
type Translated<T> = { [K in keyof T]: T[K] extends string ? string : Translated<T[K]> };

export type Dictionary = Translated<typeof en>;
