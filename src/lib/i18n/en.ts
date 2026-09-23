import type { Translated } from './translated';
import { publicPagesEn, type PublicPagesDict } from './dict/publicPages';
import { memberCoreEn, type MemberCoreDict } from './dict/memberCore';
import { memberCasesEn, type MemberCasesDict } from './dict/memberCases';
import { memberProEn, type MemberProDict } from './dict/memberPro';
import { adminEn, type AdminDict } from './dict/admin';
import { feedEn, type FeedDict } from './dict/feed';
import { labelsEn, type LabelsDict } from './dict/labels';
import { requirementsEn, type RequirementsDict } from './dict/requirements';
import { emergencyEn, type EmergencyDict } from './dict/emergency';

const baseEn = {
  language: { label: 'Language', change: 'Change language' },

  /**
   * The six lines a bank transfer is quoted on. Their English wording is the
   * wording `bankTransferLines` has always produced, kept exactly.
   */
  bankTransfer: {
    accountName: 'Account name',
    bank: 'Bank',
    iban: 'IBAN',
    accountNumber: 'Account number',
    swift: 'SWIFT / BIC',
    branch: 'Branch',
  },

  brand: {
    /** The line under the name in the lockup used on receipts, printouts and signs. */
    tagline: 'Verified lawyers and legal firms, worldwide',
  },

  /**
   * The default tab title and search description, for every page that does not
   * set its own. The brand name stays in Latin script in both languages.
   */
  meta: {
    title: 'Legal Dash — verified lawyers and legal firms',
    description:
      'Find lawyers and legal firms wherever you are, filter by area of law and location, and see which profiles have been verified against their official documents.',
  },

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
    badge: 'Available worldwide',
    heroTitle: 'Find a lawyer you can actually check.',
    heroBody:
      'Legal Dash connects you with lawyers and legal firms wherever you are — with their credentials verified against official identity documents, your case tracked from the first message to the last, and everything that matters kept in one place.',
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
    professionalsSectionTitle: 'Are you a legal firm or a legal representative?',
    professionalsSectionBody: 'Publish a verified practice, take the cases you want, and run the diary, the clients and the rooms from one place.',
    emergencyEyebrow: 'Emergency representation',
    emergencyTitle: 'When you cannot wait until Monday',
    emergencyBody: 'Raise an urgent request and it is pushed straight to every lawyer and firm who takes emergencies. The first to answer opens a case and steps into a video room with you.',
    emergencyNote: 'Legal Dash connects you to a lawyer. It does not dispatch emergency services — if somebody is in danger, call your local emergency number.',
    emergencyCta: 'Get urgent help',
    emergencyForProfessionals: 'Take emergency cases',
    emergencyStepsHeading: 'How it reaches someone',
    emergencyStep1: 'You describe what has happened and give a number.',
    emergencyStep2: 'It is pushed to every professional who has opted into emergencies.',
    emergencyStep3: 'The first to take it gets a case opened and assigned, and you are told who.',
    enquiryTitle: 'Not sure who to ask?',
    enquiryBody: 'Send a general enquiry and it goes into a shared pool that every registered lawyer and firm can read. The first to pick it up gets your details.',
    privacyTitle: 'Privacy is not a feature here. It is the product.',
    privacyBody1: 'Your identity documents are readable by you and by the reviewer checking them — nobody else, and never by an administrator.',
    privacyBody2: 'Conversations between a lawyer and a client may be privileged, so they are not opened by the platform. Not read, not searched, not watchable.',
    closingTitle: 'Stop guessing. Start checking.',
    closingBody: 'Search the directory for free, or create an account to send your first case.',
    howItWorks: 'How getting a lawyer works',
    howStep1Title: 'Find someone',
    howStep1Body: 'Filter by area of law and location. Compare what each professional publishes, including their licence and whether a reviewer has approved it.',
    howStep2Title: 'Send your case',
    howStep2Body: 'Name it, describe it, attach the papers. It arrives as a request the professional can accept or decline.',
    howStep3Title: 'Agree and talk',
    howStep3Body: 'Once accepted, message them inside the case. Meet by video or at their office.',
    verificationSectionTitle: 'What verification involves',
    lawyerCardTitle: 'I am a lawyer',
    lawyerCardBody: 'Publish your practice, take the cases you want, and run your diary, your clients and your rooms here.',
    lawyerCardCta: 'Create a lawyer account',
    firmCardTitle: 'I run a legal firm',
    firmCardBody: 'List your firm and its lawyers, oversee every case on one calendar, and designate an emergency contact.',
    firmCardCta: 'Create a firm account',
    documentsNeeded: '{count} documents needed to verify, including the permit to provide legal representation.',
    documentsNeededOne: 'One document needed to verify, including the permit to provide legal representation.',
    step1Title: 'Search',
    step1Body: 'Filter by area of law and location. Compare what each professional publishes, including their licence and practice address.',
    step2Title: 'Send your case',
    step2Body: 'Name it, describe it, attach the papers. It arrives as a request the professional can accept or decline.',
    step3Title: 'Agree and talk',
    step3Body: 'Once accepted, message them inside the case. Meet by video or at their office.',
    step4Title: 'Keep the record',
    step4Body: 'Every message, document, meeting and fee stays in the case, for both of you, for as long as you need it.',
    enquiryAlertTitle: 'An account gets you a faster, better answer',
    enquiryAlertBody: 'A general enquiry is worked by whoever picks it up, so it can take longer to be reviewed. With a free account you choose the professional yourself, attach your documents, follow the case and keep every message and fee in one place.',
    enquirySend: 'Send an enquiry',
    enquirySubmit: 'Send my enquiry',
    enquiryPoolNote: 'Your enquiry goes into a shared pool that every registered lawyer and firm can see, and the first to pick it up contacts you directly.',
    enquiryEmergencyLead: 'In an emergency, do not send an enquiry —',
    enquiryEmergencyLink: 'get a lawyer on video now',
    enquiryEmergencyTail: ', with no account at all.',
    emergencyPageTitle: 'Get a lawyer on video now',
    verifiedByHand: 'Reviewed by a person, never by a machine',
    clientsIntro: 'Most people find a lawyer through a friend and hope for the best. Legal Dash gives you the details to judge for yourself, and a record of everything afterwards. Everything below is what you get as a client — searching is free, and it stays free.',
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

  directory: {
    title: 'Directory of lawyers and legal firms',
    intro:
      'Every profile below belongs to a real registered member. Use the filters to narrow by area of law and emirate. What the badges mean',
    results: 'Results',
    filterHeading: 'Filter the directory',
    verifiedOnly: 'Verified members only',
    nothingMatches: 'No profile matches these filters',
    nothingMatchesBody: 'Try removing a filter or widening the area of law.',
    pagination: 'Pagination',
    areYouListed: 'Are you listed here?',
    switchedOff: 'The directory is switched off',
    profileCount: '{count} profiles in the directory',
    matching: 'match your filters',
    inDirectory: 'in the directory',
    emirates: 'Emirates',
    languages: 'Languages',
    contact: 'Contact',
    areasOfLaw: 'Areas of law',
    viewProfile: 'View profile',
    getInTouch: 'Get in touch',
    noReviewsYet: 'No reviews yet',
    experience: 'Experience',
    years: '{count} years',
  },

  auth: {
    signInFailed: 'Sign-in failed',
    signingIn: 'Signing in…',
    forgotPassword: 'Forgot your password?',
    signInIntro: 'Welcome back. Sign in to manage your profile, documents and verification.',
    signInTitle: 'Sign in',
    email: 'Email address',
    password: 'Password',
    fullName: 'Your full name',
    fullNameHint: 'As it appears on your identification, so a reviewer can match it.',
    phone: 'Phone number',
    phoneHint: 'How the other side of a case reaches you, and how you are told about a reply.',
    accountType: 'How will you use Legal Dash?',
    accountTypeHint:
      'This decides what you must provide to become verified, and cannot be changed later. Your identity details and documents are asked for in the verification tab, where a reviewer reads them.',
    createAccountTitle: 'Create your account',
    haveAccount: 'Already have an account?',
    noAccount: 'New to Legal Dash?',
  },

  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    back: 'Back',
    next: 'Next',
    close: 'Close',
    loading: 'Loading…',
    readMore: 'Read more',
    comingSoon: 'Coming soon',
    search: 'Search',
    filter: 'Filter',
    filters: 'Filters',
    clear: 'Clear',
    apply: 'Apply',
    edit: 'Edit',
    view: 'View',
    open: 'Open',
    send: 'Send',
    submit: 'Submit',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    optional: 'Optional',
    notSpecified: 'Not specified',
    /** How long ago something happened, for a feed or an alert list. */
    /** The line a printed page carries in its letterhead. */
    printedFrom: 'Printed from Legal Dash',
    justNow: 'just now',
    minuteAgo: '{count} minute ago',
    minutesAgo: '{count} minutes ago',
    hourAgo: '{count} hour ago',
    hoursAgo: '{count} hours ago',
    /** Appended to the label of a field nobody has to fill in. */
    optionalSuffix: '(optional)',
    /** The name of the section list, read aloud by a screen reader and never shown. */
    sections: 'Sections',
    required: 'Required',
    status: 'Status',
    actions: 'Actions',
    date: 'Date',
    time: 'Time',
    amount: 'Amount',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    country: 'Country',
    none: 'None',
    all: 'All',
    of: 'of',
    and: 'and',
    language: 'Language',
    comingSoonNote: 'Still being translated',
  },

  dashboard: {
    title: 'Dashboard',
    greeting: 'Welcome back, {name}',
    todayDiary: 'Today’s diary',
    nothingToday: 'Nothing in the diary today.',
    waitingForYou: 'Waiting for you',
    lawyersRegistered: 'Lawyers registered',
    yourCases: 'Your cases',
    openCase: 'Open case',
    noCasesYet: 'You have not sent a case yet',
    noCasesBody:
      'Open a lawyer or firm in the directory and choose “Get in touch” to send your first case.',
    verification: 'Verification',
    stillOutstanding: 'Still outstanding',
    emiratesId: 'Emirates ID',
    documentsOnFile: 'Documents on file',
    verificationRequests: 'Verification requests',
    yourListing: 'Your directory listing',
    noListing: 'You do not have a directory listing yet',
    noListingBody:
      'Create one so that people searching by area of law and emirate can find you and send you a case. You choose when to publish it.',
    commonTasks: 'Common tasks',
    reviewerAccess: 'You have reviewer access',
    editProfile: 'Edit my profile',
    legalDetails: 'Edit my legal details',
    myClients: 'My clients',
    browseDirectory: 'Browse the directory',
    manageDocuments: 'Manage my documents',
    inquiries: 'Inquiries',
    community: 'Community — ask, answer, recommend',
    upcoming: 'Coming up',
    pendingReview: 'Cases pending review',
    activeCases: 'Active cases',
  },

  badges: {
    USER: 'Verified account',
    LAWYER: 'Verified lawyer',
    FIRM: 'Verified legal firm',
  },

  /** The five states a verification request or a profile can be in. */
  verificationStatus: {
    UNVERIFIED: 'Not verified',
    PENDING: 'Submitted, awaiting review',
    UNDER_REVIEW: 'Under review',
    APPROVED: 'Verified',
    REJECTED: 'Not approved',
  },

  room: {
    you: 'You',
    recording: 'Recording',
    recordingNow: 'Recording this room',
  },

  footer: {
    disclaimer:
      'Legal Dash is not a law firm and does not give legal advice. Information in the directory is supplied by its members. Always confirm that a professional is licensed before instructing them.',
  },
} as const;

/**
 * The per-area dictionaries, folded into the one object the app reads.
 *
 * They live in separate files so that a large area — the member area, the admin
 * console, the public pages — can be extended or translated without several
 * people editing one 350-line object at once. Each file enforces its own
 * completeness against its own English; spreading them here means the
 * whole-dictionary check covers them too, so nothing can be half-translated.
 */
export const dictionary: Translated<typeof baseEn> & {
  publicPages: PublicPagesDict;
  memberCore: MemberCoreDict;
  memberCases: MemberCasesDict;
  memberPro: MemberProDict;
  admin: AdminDict;
  feed: FeedDict;
  labels: LabelsDict;
  requirements: RequirementsDict;
  emergency: EmergencyDict;
} = {
  ...baseEn,
  publicPages: publicPagesEn,
  memberCore: memberCoreEn,
  memberCases: memberCasesEn,
  memberPro: memberProEn,
  admin: adminEn,
  feed: feedEn,
  labels: labelsEn,
  requirements: requirementsEn,
  emergency: emergencyEn,
};

export type Dictionary = Translated<typeof dictionary>;
