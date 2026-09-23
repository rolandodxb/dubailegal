import type { Translated } from '../translated';

/**
 * Public Pages — the strings, in English first.
 *
 * English is the source of truth: the Spanish object below is typed against it,
 * so a key that exists here and not there is a build error rather than an
 * English sentence on a Spanish page.
 *
 * The wording here is exactly the wording the pages and components used before
 * it was moved, so the English rendering is unchanged. A few phrases the pages
 * share with the shell (the navigation, the directory vocabulary, the common
 * verbs, the account wording) are deliberately not repeated here: they already
 * live in the main dictionary and are read from there.
 */
export const publicPagesEn = {
  // ── Chrome the public pages share ─────────────────────────────────────
  shell: {
    browseDirectory: 'Browse the directory',
    breadcrumb: 'Breadcrumb',
    or: 'or',
  },

  siteHeader: {
    mainNav: 'Main',
    footerNav: 'Footer',
    alertsUnread: 'Alerts, {count} unread',
    alertsNone: 'Alerts, none unread',
    accountLabel: '{kind} account',
  },

  authLayout: {
    disclaimer: 'Legal Dash is not a law firm and does not give legal advice.',
  },

  notFound: {
    title: 'We could not find that page',
    body: 'The page may have moved, or the profile you are looking for may have been removed from the directory by its owner.',
    goHome: 'Go home',
  },

  offline: {
    metaTitle: 'No connection',
    title: 'You are offline',
    body: 'The app could not reach the server. Anything already on this device still works — the pages you have visited. Everything else comes back with the connection.',
    tryAgain: 'Try again',
    openCommunity: 'Open the community',
  },

  maintenance: {
    label: 'Maintenance mode',
    title: 'Legal Dash is temporarily unavailable',
    accountAndSecurity: 'Account and security',
    note: 'Administrators with reviewer access can still sign in and reach the reviewer console to switch maintenance mode back off.',
  },

  securityNotice: {
    defaultSubject: 'Documents and conversations',
    title: '{subject} are encrypted',
    body: 'Every file you upload, every file sent through a case conversation and every message is encrypted with AES-256-GCM before it is written to disk or to the database. A copy of the storage directory or a database dump is not a copy of your papers or your conversations. Access is separate from encryption: only you and the people on your case can open them, and an administrator cannot read a case conversation at all.',
    atRest: 'This is encryption at rest, not end-to-end encryption. The server holds the key, because it has to hand your own file back to you.',
    derivedWarningLead:
      'This installation is running on a key derived from APP_SECRET. Set ',
    derivedWarningTail:
      ' before going live, and keep a copy of it somewhere safe: without it, uploaded files and messages cannot be read again.',
  },

  // ── How verification works ────────────────────────────────────────────
  howVerification: {
    metaTitle: 'How verification works',
    metaDescription:
      'What each Legal Dash badge means, which documents every account type must supply, and how a reviewer reaches a decision.',
    title: 'How verification works',
    intro:
      'A verification badge on Legal Dash is a statement that a named reviewer looked at specific documents and approved them. It is never issued automatically, and it is withdrawn if the evidence behind it changes.',
    badgesHeading: 'The three badges',
    userBadgeBody:
      'Issued to an individual once their government ID and profile details have been reviewed.',
    lawyerBadgeBody:
      'Issued to a lawyer once their government ID and their permit to provide legal representation have been reviewed.',
    firmBadgeBody:
      'Issued to a legal firm once its government ID, legal permit and trade licence have been reviewed.',
    unverifiedNoteLead:
      'An unverified member is not hidden, but their profile is labelled plainly — never dressed up as verified. You can restrict results to verified members only from the ',
    unverifiedNoteTail: '.',
    requirementsHeading: 'What each account must supply',
    accountUser: 'Individual account',
    accountLawyer: 'Lawyer account',
    accountFirm: 'Legal firm account',
    profileTerm: 'Profile',
    profileDetail:
      'Name, date of birth, place of birth, country of residence, phone number, a description of your work and your education background. All of it is required before a reviewer can look at your file.',
    reviewerHeading: 'What a reviewer checks',
    reviewerName: 'That the name on the government ID matches the name on the profile.',
    reviewerReuse: 'That the government ID has not already been used to verify another account.',
    reviewerPermit:
      'That a lawyer’s permit to provide legal representation is current and matches the licensing authority.',
    reviewerLicence:
      'That a firm’s trade licence names the licensed legal activity and the signatory.',
    reviewerExpiry: 'That any expiry date shown on a document has not passed.',
    withdrawnHeading: 'If a badge is withdrawn',
    withdrawnBody:
      'Replacing an government ID, a legal permit, a trade licence or a required document after approval withdraws the badge and puts the account back in the review queue. This is deliberate: the badge described the documents that were reviewed, and those documents no longer describe the account.',
  },

  // ── Directory ─────────────────────────────────────────────────────────
  directoryPage: {
    metaDescription:
      'Browse lawyers and legal firms, filtered by area of law and location. Verification badges show which profiles have had their documents reviewed.',
    switchedOffBody:
      'An administrator has temporarily disabled the public directory. It will be back once they switch it on again.',
    introLead:
      'Every profile below belongs to a real registered member. Use the filters to narrow by area of law and emirate. A coloured check means a reviewer approved that member’s documents; profiles without one are labelled clearly. ',
    badgesMean: 'What the badges mean',
    activeCount: '{count} active',
    clearAll: 'Clear all',
    noPublishedProfiles: 'No published profiles yet',
    profileOne: 'profile',
    profileOther: 'profiles',
    clearFilters: 'Clear filters',
    unverifiedOne: 'One profile in these results has',
    unverifiedMany: '{count} profiles in these results have',
    unverifiedLead: 'not had documents reviewed yet. Tick ',
    unverifiedTail: ' to hide them.',
    emptyTitle: 'The directory is empty because nobody has published a profile yet',
    emptyBody:
      'Legal Dash does not invent placeholder lawyers or firms. Profiles appear here once a lawyer or legal firm registers, completes their legal information and publishes their listing.',
    registerAsLawyer: 'Register as a lawyer',
    registerFirm: 'Register a legal firm',
    clearAllFilters: 'Clear all filters',
    previous: '← Previous',
    next: 'Next →',
    pageOf: 'Page {page} of {pageCount}',
    signedInAs:
      'You are signed in as a {kind}. Manage how your profile appears, or publish it if it is still a draft.',
    kindLawyer: 'lawyer',
    kindFirm: 'legal firm',
    manageListing: 'Manage my listing',
  },

  // ── Directory filters ─────────────────────────────────────────────────
  directoryFilters: {
    searchHint: 'Matches a name, headline or description.',
    searchPlaceholder: 'e.g. arbitration, Al Habtoor, family law',
    whoFor: 'Who are you looking for?',
    lawyersAndFirms: 'Lawyers and firms',
    areaOfLaw: 'Area of law',
    areaHint: 'Select any number. Leave clear to include all.',
    noAreas: 'No published profile has listed an area of law yet.',
    country: 'Country',
    countryHint: 'Where the professional offers to work. Leave clear to include every country.',
    noCountries: 'No published profile has listed a country yet.',
    anywhere: 'Every country',
    emirate: 'Emirate',
    noEmirates: 'No published profile has listed an emirate yet.',
    refine: 'Refine',
    verifiedOnlyHint: 'Show only profiles whose documents have been approved by a reviewer.',
    acceptsNewClients: 'Accepting new clients',
    acceptsNewClientsHint: 'Hide members who have said they are not taking new instructions.',
    apply: 'Apply filters',
    clearAll: 'Clear all',
  },

  // ── One directory result ──────────────────────────────────────────────
  listingCard: {
    address: 'Address',
    published: 'published',
    notPublished: 'not published',
    moreCount: '+{count} more',
    notReviewed: 'This profile has not had its documents reviewed by a reviewer.',
  },


  // ── One directory profile ─────────────────────────────────────────────
  listing: {
    metaNotFound: 'Profile not found',
    metaDescription: 'Profile of {name} on Legal Dash.',
    tabs: {
      posts: 'Posts',
      about: 'About',
      reviews: 'Recommendations',
      contact: 'Contact',
    },
    noExpiry: 'No expiry date recorded',
    expired: '{date} — expired',
    expiresInOne: '{date} — expires in {count} day',
    expiresInOther: '{date} — expires in {count} days',
    currentlyValid: '{date} — currently valid',
    backToDirectory: '← Back to the directory',
    representedByFirm:
      'This lawyer is registered with a firm, so their public profile is on the firm’s page. You are seeing it because you may edit or check it.',
    privateDraft: 'This profile is a private draft. Nobody else can see it yet.',
    recommendationOne: '{count} recommendation',
    recommendationOther: '{count} recommendations',
    noRecommendations: 'No recommendations yet',
    aMember: 'A member',
    yearsExperience: '· {count} years’ experience',
    editMyPage: 'Edit my page',
    sendCase: 'Send a case',
    recommend: 'Recommend',
    signInToRecommend: 'Sign in to recommend',
    notReviewedLead: 'This profile has ',
    notReviewedStrong: 'not',
    notReviewedTail:
      ' had its documents reviewed. Legal Dash has confirmed only that the account exists. Check the professional’s licence with the relevant authority before instructing them.',
    verifiedLead: 'A reviewer approved this member’s documents',
    verifiedOn: ' on {date}',
    verifiedTail: '. This confirms the documents supplied, not the outcome of any matter.',
    intro: 'Intro',
    newClients: 'New clients',
    age: 'Age',
    notStated: 'Not stated',
    acceptingNewClients: 'Accepting new clients',
    notAtTheMoment: 'Not at the moment',
    seeFullProfile: 'See the full profile',
    pageInfo: 'Page info',
    noContactDetails:
      'This member has not published contact details. Send a case and they will reply inside it.',
    contactDetails: 'Contact details',
    workWithThem: 'Work with them',
    caseExplanation:
      'A case is a file with a reference, a status, the papers and a conversation.',
    getInTouchAboutCase: 'Get in touch about a case',
    casesSwitchedOff:
      'Sending new cases is switched off on this installation. Existing cases continue as normal.',
    signInToSend: 'Sign in to send a case or a message. An account is free.',
    postsOnPage: 'Posts on this page',
    postsAbout: 'Posts about {name}',
    postsOwnSubtitle: 'What you have posted, and what members have written about you.',
    postsOtherSubtitle:
      'What the practice has posted, and what members have written about them.',
    postToMyPage: 'Post to my page',
    writeRecommendation: 'Write a recommendation',
    noPosts:
      'Nobody has posted about {name} yet. A recommendation here comes from somebody who actually instructed them, so this is empty rather than filled with examples.',
    postedByPractice: 'Posted by the practice',
    recommendation: 'Recommendation',
    question: 'Question',
    experience: 'Experience',
    pointsOne: '{count} point',
    pointsOther: '{count} points',
    commentsOne: '{count} comment',
    commentsOther: '{count} comments',
    lawyersAtFirm: 'Lawyers at this firm ({count})',
    noLawyers: 'No lawyers are currently registered with this firm.',
    licence: 'Licence {number} · {authority}',
    practice: 'Practice',
    emiratesCovered: 'Emirates covered',
    notAcceptingNewClients: 'Not currently accepting new clients',
    legalConsultantRegistration: 'Legal consultant registration',
    legalLicence: 'Legal licence',
    licenceNumber: 'Licence number',
    authority: 'Authority',
    validUntil: 'Valid until',
    firmRegistration: 'Firm registration',
    tradeLicence: 'Trade licence',
    registeredEmirate: 'Registered emirate',
    verifiedDocuments: 'Verified documents',
    verifiedDocumentsBody:
      'What a reviewer checked. The documents themselves and the government ID number are never published.',
    emiratesIdVerified: 'government ID verified',
    documentVerified: 'Verified {date}',
    noDocumentRecords: 'No document records are attached to this approval.',
    legalRepresentative: 'Legal representative',
    legalRepresentativeBody:
      'The person accountable for this firm on Legal Dash and named as its authorised signatory.',
    authorisedSignatory: 'Authorised signatory',
    basedIn: 'Based in {country}',
    registeredName: 'Registered name',
    legalStructure: 'Legal structure',
    registeredAddress: 'Registered address',
    workAndEducation: 'Work and education',
    work: 'Work',
    education: 'Education',
    countryOfResidence: 'Country of residence',
    notProvided: 'Not provided',
    ageNote: 'Age {age}.',
    contactAndLocation: 'Contact and location',
    addressInUae: 'Address',
    website: 'Website',
    notPublishedUseGetInTouch: 'Not published — use “Get in touch”',
    notPublished: 'Not published',
    sendMessage: 'Send a message',
    sendMessageBody:
      'For a question that is not yet a case. It goes to their inbox and does not create a case file.',
    getInTouch: 'Get in touch',
    getInTouchBody:
      'Sign in to send {name} a case or a message. An account is free, and you keep a record of everything you send.',
  },

  // ── General enquiry ───────────────────────────────────────────────────
  enquiry: {
    metaDescription:
      'Send a general legal enquiry to lawyers and legal firms. No account needed — but an account is faster.',
    title: 'Send a general enquiry',
    intro:
      'No account needed. Your enquiry goes into a shared pool that every registered lawyer and firm can see, and the first to pick it up contacts you directly — your phone and email are shared with them.',
    alertTitle: 'An account is usually faster',
    alertBody:
      'A general enquiry is answered by whoever picks it up, and can take longer to be reviewed. With a free account you choose the lawyer or firm yourself, send the full details with your documents attached, follow the progress and keep every message and fee in one place.',
    browseDirectoryLink: 'browse the directory',
    instead: 'instead.',
    emergencyTail: ', no account needed.',
  },

  enquiryForm: {
    sentTitle: 'Enquiry sent',
    failedTitle: 'The enquiry was not sent',
    name: 'Your name',
    areaOfLaw: 'Area of law',
    notSure: 'Not sure / other',
    subject: 'Subject',
    subjectPlaceholder: 'e.g. Question about a tenancy deposit',
    question: 'Your question',
    questionHint: 'At least 20 characters. A lawyer reads this before replying.',
    pending: 'Sending…',
  },

  // ── Emergency ─────────────────────────────────────────────────────────
  emergency: {
    metaTitle: 'Urgent legal help',
    metaDescription:
      'Reach a lawyer on emergency call right now. No account, no password — go straight into a video call.',
    pill: 'Urgent',
    intro:
      'No account. No password. Tell us who you are and what is happening, and you go straight into a call with a lawyer on emergency duty.',
    dangerTitle: 'If somebody is in danger, call your local emergency number first',
    dangerBody:
      'Legal Dash connects you to a lawyer. It is not the police, an ambulance or the fire service, and it cannot send help to you.',
    yourRequest: 'Your urgent request',
    yourRequestBody:
      'Raised from your account, so you can follow it and the professional who takes it sees your history.',
    yourRequestsCount: 'Your urgent requests ({count})',
    raised: 'Raised {date} · call-back number {phone}',
    takenBy: 'Taken by {name}',
    caseReference: ' · case {reference}',
    offered:
      'Offered to every professional on emergency call. The first to take it has a case opened and assigned.',
    joinRoom: 'Join the video room',
    statusOpen: 'Open',
    statusTaken: 'Taken',
    statusClosed: 'Closed',
    noSignUp: 'No sign-up',
    noSignUpBody: 'Nothing to verify, nothing to remember. You are in a room in seconds.',
    realLawyer: 'A real lawyer',
    realLawyerOne: '{count} lawyer is on emergency duty right now. The first to answer joins you.',
    realLawyerOther:
      '{count} lawyers are on emergency duty right now. The first to answer joins you.',
    videoAndVoice: 'Video and voice',
    videoAndVoiceBody: 'The call is direct between you and the lawyer. Nothing is recorded.',
    notEmergency: 'Not an emergency?',
    notEmergencyBody:
      'For anything that can wait, an account gives you a much better experience: you can send the full details, attach documents, follow the case and message your lawyer. A general enquiry works too, but it goes into a shared pool and is answered more slowly.',
    backToDashboard: 'Back to my dashboard',
  },

  emergencyForm: {
    failedTitle: 'We could not send that',
    name: 'Your name',
    nameHint: 'A first name is enough.',
    phone: 'Number to call you on',
    phoneHint: 'A lawyer may call this before joining the room.',
    description: 'What is happening?',
    descriptionHint: 'A sentence is enough. The lawyer reads this as they join.',
    areaOfLaw: 'Area of law',
    emailHint: 'Optional. For a copy of what you sent.',
    pending: 'Finding a lawyer…',
    note: 'No account needed. You go straight to a video room where a lawyer on emergency call joins you. Keep the page open.',
  },

  emergencyRoom: {
    metaTitle: 'Urgent call',
    pill: 'Urgent call',
    lawyerJoined: 'A lawyer has joined',
    waiting: 'Waiting for a lawyer to join',
    raised: 'raised {time}',
    answeredByFirst: 'answered by the first lawyer to join',
    connectedTitle: 'You are connected to a lawyer',
    connectedBody: '{name} has answered your emergency and is in the room below.',
    goneTitle: 'Your request has gone to every lawyer on emergency call',
    goneBodyLead: 'Press ',
    goneBodyStrong: 'Join the call',
    goneBodyTail:
      ' below and stay on this page. The first lawyer to answer appears here. Keep this tab open.',
    callContext:
      'This is an urgent call. Stay on the page — a lawyer on emergency call will join shortly.',
    noLongerNeed: 'No longer need this?',
    noLongerNeedBody:
      'Withdrawing closes the room and tells every lawyer who saw the request that it is over.',
    recordingsTitle: 'Recordings of this call ({count})',
    recordingsBody:
      'The lawyer’s recording of your call, kept for you as well. It is encrypted and only the two of you can play it.',
    ifNobodyJoins: 'If nobody joins',
    emergencyLead: 'Call emergency services if you are in danger — your ',
    emergencyStrong: 'local emergency number',
    emergencyTail: '.',
    keepOpen:
      'Keep this page open — it is your only link to the room. Copy the address before you close the tab.',
    videoFails:
      'If the video will not connect, stay in the room: the lawyer can see that you are waiting and can call the number you gave.',
    raiseAnother: 'Raise another request',
    createAccountNextTime: 'Create an account for next time',
  },

  // ── Community ─────────────────────────────────────────────────────────
  blog: {
    metaDescription:
      'Ask what a process really involves, recommend the lawyer or firm you used, and read what other people were told — by topic.',
    intro:
      'Real answers from people who have been through it: what a process involves, what it cost, who helped. Pick a board, or write something of your own.',
    postOne: '{count} post',
    postOther: '{count} posts',
    commentOne: '{count} comment',
    commentOther: '{count} comments',
    neverAdvice: 'nothing here is legal advice',
    sortNav: 'Sort',
    mostUseful: 'Most useful',
    newest: 'Newest',
    waitingTitle: 'Waiting for a moderator',
    waitingBody:
      'A moderator checks whether the question has been asked already before it goes up. Nothing is lost in the meantime.',
    written: 'written {time}',
    boards: 'Boards',
    chooseBoard: 'Choose a board',
    writeHelp:
      'Ask something, recommend a professional you used, or write down what happened. A moderator reads it first — mostly to check that the question has not been asked and answered already, in which case they will point you at that thread.',
    signInTitle: 'Sign in to post or vote',
    signInBodyLead:
      'Reading is open to everyone. To ask a question, recommend a lawyer or vote, ',
    signInBodyTail: '.',
    everything: 'Everything ({count})',
    nothingOnTopic: 'Nothing on {topic} yet',
    nothingPosted: 'Nothing has been posted yet',
    emptyNewBoard:
      'This is a new board, so it is empty rather than filled with examples. The first post here will be a real one.',
    emptySignIn: 'Sign in to write the first post on this board.',
  },

  blogPost: {
    metaTitle: 'Post',
    backToCommunity: '← Community',
    waitingBody:
      'This post is not on the board yet. A moderator reads it first, mostly to check whether the question has been asked and answered already — in which case they will point you at that thread rather than leaving you with nothing.',
    mineOnly: ' Only you and the moderators can see it.',
    duplicateTitle: 'This has been asked already',
    duplicateLead: 'A moderator closed this as a repeat of ',
    duplicateTail: '. The answers are there.',
    hiddenTitle: 'This post is hidden from the board',
    removedTitle: 'This post was removed',
    removedBody: 'A moderator decided this post should not appear on the board.',
    recommended: 'Recommended',
    openProfile: 'Open their profile',
    readOnlyLead: 'Anyone can read the community. ',
    readOnlyTail: ' to react, comment or ask your own question — it comes back to this thread.',
  },

  // ── Signing in and accounts ───────────────────────────────────────────
  auth: {
    signedOut: 'You have been signed out.',
    passwordReset: 'Your password has been changed. Sign in with your new password.',
    suspended:
      'That account is suspended. Contact a reviewer if you believe this is a mistake.',
    twoFactorMetaTitle: 'Two-factor verification',
    twoFactorTitle: 'Two-factor verification',
    twoFactorBodyLead: 'Signed in as ',
    twoFactorBodyTail: '. Enter the code from your authenticator app to finish.',
    twoFactorLostPhone:
      'Lost your phone? Use one of the recovery codes you saved when you turned two-factor on. If you have none left, an administrator cannot recover them for you — that would defeat the point.',
    registerClosedTitle: 'Registration is closed',
    registerClosedLead:
      'New account registration is currently switched off by the administrators of this installation. If you already have an account you can still ',
    registerClosedTail: '.',
    registerInviteTitle: 'Join your firm on Legal Dash',
    registerTitle: 'Create your Legal Dash account',
    registerIntro:
      'One account type, chosen now. You can complete your profile and documents straight after.',
    invalidInvite:
      'That invitation link is no longer valid. It may have been used already or withdrawn by the firm. You can still register as a lawyer below.',
    forgotMetaTitle: 'Reset your password',
    forgotTitle: 'Reset your password',
    forgotBody:
      'Enter the email address on your account and we will record a reset link for it.',
    resetMetaTitle: 'Choose a new password',
    resetTitle: 'Choose a new password',
    resetNoToken:
      'This page needs a reset link. Open the link from your reset message, or request a new one.',
    resetRequestNew: 'Request a new reset link',
    resetIntro: 'Pick something you have not used on this account before.',
    verifyMetaTitle: 'Confirm your email address',
    verifyTitle: 'Confirm your email address',
    verifyBodyLead: 'We sent a confirmation link to ',
    verifyBodyTail: '. Your account is limited until the address is confirmed.',
    verifyCreated: 'Your account has been created.',
    verifyDeliveryTitle: 'About email delivery on this installation',
    verifyRecordedLead: 'The newest confirmation message for this account was recorded on ',
    verifyRecordedTail: ' UTC.',
    verifyOpenLink:
      'Open the confirmation link from the message we recorded, or request a fresh one below.',
    verifyNotReceived: 'Did not receive it, or the link expired?',
    verifyContinue: 'Continue to my dashboard',
  },

  registerForm: {
    invitedTitle: 'You have been invited to join {firm}',
    invitedLead: 'Create your lawyer account with ',
    invitedTail:
      ' and complete your licence details. You will be registered with the firm automatically once your legal details are saved.',
    failedTitle: 'We could not create your account',
    userOption: 'I am a user',
    lawyerOption: 'I am a lawyer',
    firmOption: 'I am a legal firm',
    passwordHint: 'At least {count} characters, including a letter and a number.',
    confirmPassword: 'Confirm password',
    terms:
      'I confirm the details I give are my own, and I understand that documents I upload are examined by a reviewer before any verification badge is issued.',
    pending: 'Creating your account…',
    emiratesIdNote:
      '{user}, {lawyer} and {firm} accounts all require an government ID before verification.',
  },

  passwordForms: {
    resetFailedTitle: 'Could not reset your password',
    newPassword: 'New password',
    confirmNewPassword: 'Confirm new password',
    pendingSending: 'Sending…',
    pendingSaving: 'Saving…',
    setNewPassword: 'Set new password',
    resetNote: 'Setting a new password signs out every device that was already signed in.',
    sendResetLink: 'Send reset link',
    backToSignIn: 'Back to sign in',
    resendPending: 'Requesting…',
    resendSubmit: 'Send the confirmation message again',
    currentPassword: 'Current password',
    changePending: 'Updating…',
    changeSubmit: 'Change password',
  },

  twoFactorForm: {
    codeLabel: 'Authentication code',
    codeHint: 'The six digits from your authenticator app, or one of your recovery codes.',
    verifyPending: 'Checking…',
    verifySubmit: 'Verify and sign in',
    cancelSignOut: 'Cancel and sign out',
    settingsTitle: 'Two-factor authentication',
    on: 'On',
    off: 'Off',
    enabledOne:
      'A code from your authenticator app is required every time you sign in. {count} recovery code left.',
    enabledOther:
      'A code from your authenticator app is required every time you sign in. {count} recovery codes left.',
    disabledBody:
      'Add a second step to signing in. Any authenticator app works — Google Authenticator, Authy, 1Password.',
    turnOn: 'Turn on two-factor',
    preparing: 'Preparing…',
    setUpHeading: 'Set up your authenticator app',
    qrAlt: 'Two-factor setup QR code',
    scanHint: 'Scan the code, or type this key into your app if you cannot scan:',
    confirmCodeLabel: 'Enter the six-digit code from your app',
    confirmCodeHint: 'This proves the app is set up before two-factor is switched on.',
    verifying: 'Verifying…',
    recoveryHeading: 'Save these recovery codes',
    recoveryBody:
      'Each works once, if you lose your phone. They are shown only now and cannot be retrieved later — store them somewhere safe and offline.',
    issueHeading: 'Issue new recovery codes',
    issueHint: 'Your password is required. This invalidates the codes you already have.',
    issuing: 'Issuing…',
    issueSubmit: 'Issue new recovery codes',
    disableHeading: 'Turn two-factor off',
    disableHint: 'Your password is required, so a borrowed session cannot remove it.',
    disableConfirm:
      'Turn off two-factor authentication? Your password alone will sign you in.',
    turningOff: 'Turning off…',
    disableSubmit: 'Turn off two-factor',
  },

  verifyEmailForm: {
    pending: 'Confirming…',
    submit: 'Confirm my email address',
  },
};

export type PublicPagesDict = Translated<typeof publicPagesEn>;

export const publicPagesEs: PublicPagesDict = {

  // ── Directory filters ─────────────────────────────────────────────────
  directoryFilters: {
    searchHint: 'Coincide con un nombre, un titular o una descripción.',
    searchPlaceholder: 'p. ej., arbitraje, Al Habtoor, derecho de familia',
    whoFor: '¿A quién busca?',
    lawyersAndFirms: 'Abogados y despachos',
    areaOfLaw: 'Área del derecho',
    areaHint: 'Seleccione las que quiera. Déjelo vacío para incluirlas todas.',
    noAreas: 'Ningún perfil publicado ha indicado todavía un área del derecho.',
    country: 'País',
    countryHint: 'Donde el profesional ofrece trabajar. Déjelo vacío para incluir todos los países.',
    noCountries: 'Ningún perfil publicado ha indicado todavía un país.',
    anywhere: 'Todos los países',
    emirate: 'Emirato',
    noEmirates: 'Ningún perfil publicado ha indicado todavía un emirato.',
    refine: 'Refinar',
    verifiedOnlyHint:
      'Mostrar solo los perfiles cuyos documentos ha aprobado un revisor.',
    acceptsNewClients: 'Acepta nuevos clientes',
    acceptsNewClientsHint:
      'Ocultar a los miembros que han indicado que no aceptan nuevos encargos.',
    apply: 'Aplicar los filtros',
    clearAll: 'Borrar todo',
  },

  // ── One directory result ──────────────────────────────────────────────
  listingCard: {
    address: 'Dirección',
    published: 'publicado',
    notPublished: 'no publicado',
    moreCount: '+{count} más',
    notReviewed: 'Un revisor no ha revisado los documentos de este perfil.',
  },
  shell: {
    browseDirectory: 'Explorar el directorio',
    breadcrumb: 'Ruta de navegación',
    or: 'o',
  },

  siteHeader: {
    mainNav: 'Principal',
    footerNav: 'Pie de página',
    alertsUnread: 'Avisos, {count} sin leer',
    alertsNone: 'Avisos, ninguno sin leer',
    accountLabel: 'Cuenta de {kind}',
  },

  authLayout: {
    disclaimer:
      'Legal Dash no es un despacho de abogados y no ofrece asesoramiento jurídico.',
  },

  notFound: {
    title: 'No hemos podido encontrar esa página',
    body: 'Puede que la página se haya trasladado, o que el perfil que busca lo haya retirado del directorio su titular.',
    goHome: 'Ir al inicio',
  },

  offline: {
    metaTitle: 'Sin conexión',
    title: 'Está sin conexión',
    body: 'La aplicación no ha podido alcanzar el servidor. Todo lo que ya está en este dispositivo sigue funcionando: las páginas que ha visitado. El resto volverá con la conexión.',
    tryAgain: 'Reintentar',
    openCommunity: 'Abrir la comunidad',
  },

  maintenance: {
    label: 'Modo de mantenimiento',
    title: 'Legal Dash no está disponible temporalmente',
    accountAndSecurity: 'Cuenta y seguridad',
    note: 'Los administradores con acceso de revisor todavía pueden iniciar sesión y entrar en la consola de revisión para desactivar el modo de mantenimiento.',
  },

  securityNotice: {
    defaultSubject: 'Los documentos y las conversaciones',
    title: '{subject} están cifrados',
    body: 'Todos los archivos que sube, todos los que se envían por la conversación de un caso y todos los mensajes se cifran con AES-256-GCM antes de escribirse en el disco o en la base de datos. Una copia del directorio de almacenamiento o un volcado de la base de datos no es una copia de sus documentos ni de sus conversaciones. El acceso es independiente del cifrado: solo usted y las personas de su caso pueden abrirlos, y un administrador no puede leer la conversación de un caso.',
    atRest:
      'Se trata de cifrado en reposo, no de cifrado de extremo a extremo. El servidor guarda la clave, porque tiene que devolverle su propio archivo.',
    derivedWarningLead:
      'Esta instalación funciona con una clave derivada de APP_SECRET. Defina ',
    derivedWarningTail:
      ' antes de entrar en producción y guarde una copia en un lugar seguro: sin ella, los archivos y mensajes subidos no se podrán volver a leer.',
  },

  howVerification: {
    metaTitle: 'Cómo funciona la verificación',
    metaDescription:
      'Qué significa cada insignia de Legal Dash, qué documentos debe aportar cada tipo de cuenta y cómo llega un revisor a una decisión.',
    title: 'Cómo funciona la verificación',
    intro:
      'Una insignia de verificación en Legal Dash declara que un revisor identificado examinó documentos concretos y los aprobó. Nunca se emite de forma automática y se retira si las pruebas que la sostienen cambian.',
    badgesHeading: 'Las tres insignias',
    userBadgeBody:
      'Se emite para una persona física una vez revisados su documento oficial de identidad y los datos de su perfil.',
    lawyerBadgeBody:
      'Se emite para un abogado una vez revisados su documento oficial de identidad y su permiso para ejercer la representación legal.',
    firmBadgeBody:
      'Se emite para un despacho una vez revisados su documento oficial de identidad, su permiso legal y su licencia comercial.',
    unverifiedNoteLead:
      'Un miembro sin verificar no se oculta, pero su perfil se etiqueta con claridad: nunca se presenta como verificado. Puede limitar los resultados a miembros verificados desde el ',
    unverifiedNoteTail: '.',
    requirementsHeading: 'Qué debe aportar cada cuenta',
    accountUser: 'Cuenta individual',
    accountLawyer: 'Cuenta de abogado',
    accountFirm: 'Cuenta de despacho',
    profileTerm: 'Perfil',
    profileDetail:
      'Nombre, fecha de nacimiento, lugar de nacimiento, país de residencia, número de teléfono, una descripción de su trabajo y su formación académica. Todo ello es obligatorio antes de que un revisor pueda examinar su expediente.',
    reviewerHeading: 'Qué comprueba un revisor',
    reviewerName: 'Que el nombre del documento oficial de identidad coincide con el nombre del perfil.',
    reviewerReuse: 'Que el documento oficial de identidad no se ha utilizado ya para verificar otra cuenta.',
    reviewerPermit:
      'Que el permiso de un abogado para ejercer la representación legal está vigente y coincide con la autoridad de licencias.',
    reviewerLicence:
      'Que la licencia comercial de un despacho indica la actividad jurídica autorizada y al firmante.',
    reviewerExpiry: 'Que ninguna fecha de caducidad que figure en un documento haya pasado.',
    withdrawnHeading: 'Si se retira una insignia',
    withdrawnBody:
      'Sustituir un documento oficial de identidad, un permiso legal, una licencia comercial o un documento obligatorio después de la aprobación retira la insignia y devuelve la cuenta a la cola de revisión. Es deliberado: la insignia describía los documentos que se revisaron, y esos documentos ya no describen la cuenta.',
  },

  directoryPage: {
    metaDescription:
      'Consulte abogados y despachos, filtrando por área del derecho y ubicación. Las insignias de verificación muestran qué perfiles tienen los documentos revisados.',
    switchedOffBody:
      'Un administrador ha desactivado temporalmente el directorio público. Volverá cuando lo active de nuevo.',
    introLead:
      'Todos los perfiles que figuran a continuación pertenecen a miembros registrados reales. Utilice los filtros para acotar por área del derecho y ubicación. Una marca de color significa que un revisor aprobó los documentos de ese miembro; los perfiles que no la tienen se etiquetan con claridad. ',
    badgesMean: 'Qué significan las insignias',
    activeCount: '{count} activos',
    clearAll: 'Borrar todo',
    noPublishedProfiles: 'Todavía no hay perfiles publicados',
    profileOne: 'perfil',
    profileOther: 'perfiles',
    clearFilters: 'Borrar los filtros',
    unverifiedOne: 'Un perfil de estos resultados todavía no tiene',
    unverifiedMany: '{count} perfiles de estos resultados todavía no tienen',
    unverifiedLead: 'los documentos revisados. Marque ',
    unverifiedTail: ' para ocultarlos.',
    emptyTitle: 'El directorio está vacío porque nadie ha publicado un perfil todavía',
    emptyBody:
      'Legal Dash no inventa abogados ni despachos de ejemplo. Los perfiles aparecen aquí cuando un abogado o un despacho se registra, completa su información jurídica y publica su ficha.',
    registerAsLawyer: 'Registrarse como abogado',
    registerFirm: 'Registrar un despacho',
    clearAllFilters: 'Borrar todos los filtros',
    previous: '← Anterior',
    next: 'Siguiente →',
    pageOf: 'Página {page} de {pageCount}',
    signedInAs:
      'Ha iniciado sesión como {kind}. Gestione cómo aparece su perfil o publíquelo si todavía es un borrador.',
    kindLawyer: 'abogado',
    kindFirm: 'despacho',
    manageListing: 'Gestionar mi ficha',
  },

  listing: {
    metaNotFound: 'Perfil no encontrado',
    metaDescription: 'Perfil de {name} en Legal Dash.',
    tabs: {
      posts: 'Publicaciones',
      about: 'Acerca de',
      reviews: 'Recomendaciones',
      contact: 'Contacto',
    },
    noExpiry: 'No consta fecha de caducidad',
    expired: '{date} — caducado',
    expiresInOne: '{date} — caduca en {count} día',
    expiresInOther: '{date} — caduca en {count} días',
    currentlyValid: '{date} — vigente',
    backToDirectory: '← Volver al directorio',
    representedByFirm:
      'Este abogado está registrado con un despacho, por lo que su perfil público figura en la página del despacho. Usted lo ve porque puede editarlo o comprobarlo.',
    privateDraft: 'Este perfil es un borrador privado. Nadie más puede verlo todavía.',
    recommendationOne: '{count} recomendación',
    recommendationOther: '{count} recomendaciones',
    noRecommendations: 'Todavía sin recomendaciones',
    aMember: 'Un miembro',
    yearsExperience: '· {count} años de experiencia',
    editMyPage: 'Editar mi página',
    sendCase: 'Enviar un caso',
    recommend: 'Recomendar',
    signInToRecommend: 'Inicie sesión para recomendar',
    notReviewedLead: 'Los documentos de este perfil ',
    notReviewedStrong: 'no',
    notReviewedTail:
      ' se han revisado. Legal Dash solo ha confirmado que la cuenta existe. Compruebe la licencia del profesional ante la autoridad competente antes de contratarlo.',
    verifiedLead: 'Un revisor aprobó los documentos de este miembro',
    verifiedOn: ' el {date}',
    verifiedTail:
      '. Esto confirma los documentos aportados, no el resultado de ningún asunto.',
    intro: 'Presentación',
    newClients: 'Nuevos clientes',
    age: 'Edad',
    notStated: 'No indicado',
    acceptingNewClients: 'Acepta nuevos clientes',
    notAtTheMoment: 'No por el momento',
    seeFullProfile: 'Ver el perfil completo',
    pageInfo: 'Información de la página',
    noContactDetails:
      'Este miembro no ha publicado datos de contacto. Envíele un caso y le responderá dentro de él.',
    contactDetails: 'Datos de contacto',
    workWithThem: 'Trabajar con este profesional',
    caseExplanation:
      'Un caso es un expediente con una referencia, un estado, los documentos y una conversación.',
    getInTouchAboutCase: 'Contactar por un caso',
    casesSwitchedOff:
      'El envío de casos nuevos está desactivado en esta instalación. Los casos existentes continúan con normalidad.',
    signInToSend:
      'Inicie sesión para enviar un caso o un mensaje. La cuenta es gratuita.',
    postsOnPage: 'Publicaciones en esta página',
    postsAbout: 'Publicaciones sobre {name}',
    postsOwnSubtitle:
      'Lo que usted ha publicado y lo que los miembros han escrito sobre usted.',
    postsOtherSubtitle:
      'Lo que ha publicado el despacho y lo que los miembros han escrito sobre él.',
    postToMyPage: 'Publicar en mi página',
    writeRecommendation: 'Escribir una recomendación',
    noPosts:
      'Nadie ha publicado nada sobre {name} todavía. Una recomendación aquí procede de alguien que realmente lo contrató, así que esto está vacío en lugar de lleno de ejemplos.',
    postedByPractice: 'Publicado por el despacho',
    recommendation: 'Recomendación',
    question: 'Pregunta',
    experience: 'Experiencia',
    pointsOne: '{count} punto',
    pointsOther: '{count} puntos',
    commentsOne: '{count} comentario',
    commentsOther: '{count} comentarios',
    lawyersAtFirm: 'Abogados en este despacho ({count})',
    noLawyers: 'Actualmente no hay abogados registrados en este despacho.',
    licence: 'Licencia {number} · {authority}',
    practice: 'Actividad',
    emiratesCovered: 'Emiratos cubiertos',
    notAcceptingNewClients: 'Actualmente no acepta nuevos clientes',
    legalConsultantRegistration: 'Registro de consultor jurídico',
    legalLicence: 'Licencia jurídica',
    licenceNumber: 'Número de licencia',
    authority: 'Autoridad',
    validUntil: 'Válida hasta',
    firmRegistration: 'Registro del despacho',
    tradeLicence: 'Licencia comercial',
    registeredEmirate: 'Emirato de registro',
    verifiedDocuments: 'Documentos verificados',
    verifiedDocumentsBody:
      'Lo que comprobó un revisor. Los documentos en sí y el número del documento oficial de identidad nunca se publican.',
    emiratesIdVerified: 'documento oficial de identidad verificado',
    documentVerified: 'Verificado el {date}',
    noDocumentRecords: 'No hay registros de documentos asociados a esta aprobación.',
    legalRepresentative: 'Representante legal',
    legalRepresentativeBody:
      'La persona responsable de este despacho ante Legal Dash y designada como su firmante autorizado.',
    authorisedSignatory: 'Firmante autorizado',
    basedIn: 'Con sede en {country}',
    registeredName: 'Denominación registrada',
    legalStructure: 'Forma jurídica',
    registeredAddress: 'Domicilio registrado',
    workAndEducation: 'Trabajo y formación',
    work: 'Trabajo',
    education: 'Formación',
    countryOfResidence: 'País de residencia',
    notProvided: 'No facilitado',
    ageNote: 'Edad: {age}.',
    contactAndLocation: 'Contacto y ubicación',
    addressInUae: 'Dirección',
    website: 'Sitio web',
    notPublishedUseGetInTouch: 'No publicado — use «Contactar»',
    notPublished: 'No publicado',
    sendMessage: 'Enviar un mensaje',
    sendMessageBody:
      'Para una consulta que todavía no es un caso. Llega a su bandeja de entrada y no crea ningún expediente.',
    getInTouch: 'Contactar',
    getInTouchBody:
      'Inicie sesión para enviar a {name} un caso o un mensaje. La cuenta es gratuita y conserva un registro de todo lo que envía.',
  },

  enquiry: {
    metaDescription:
      'Envíe una consulta jurídica general a abogados y despachos de los EAU. No necesita cuenta, pero con cuenta es más rápido.',
    title: 'Enviar una consulta general',
    intro:
      'No necesita cuenta. Su consulta entra en un fondo común que pueden ver todos los abogados y despachos registrados, y el primero que la recoja se pone en contacto con usted: su teléfono y su correo se comparten con esa persona.',
    alertTitle: 'Una cuenta suele ser más rápida',
    alertBody:
      'Una consulta general la responde quien la recoja y puede tardar más en revisarse. Con una cuenta gratuita usted elige al abogado o al despacho, envía todos los detalles con sus documentos adjuntos, sigue el progreso y guarda cada mensaje y cada honorario en un mismo lugar.',
    browseDirectoryLink: 'explorar el directorio',
    instead: 'en su lugar.',
    emergencyTail: ', sin necesidad de cuenta.',
  },

  enquiryForm: {
    sentTitle: 'Consulta enviada',
    failedTitle: 'La consulta no se ha enviado',
    name: 'Su nombre',
    areaOfLaw: 'Área del derecho',
    notSure: 'No estoy seguro / otra',
    subject: 'Asunto',
    subjectPlaceholder: 'p. ej., pregunta sobre la fianza de un alquiler',
    question: 'Su consulta',
    questionHint: 'Al menos 20 caracteres. Un abogado la lee antes de responder.',
    pending: 'Enviando…',
  },

  emergency: {
    metaTitle: 'Ayuda jurídica urgente',
    metaDescription:
      'Contacte ahora mismo con un abogado de guardia de urgencias. Sin cuenta y sin contraseña: entre directamente en una videollamada.',
    pill: 'Urgente',
    intro:
      'Sin cuenta. Sin contraseña. Díganos quién es y qué está ocurriendo, y entrará directamente en una llamada con un abogado de guardia de urgencias.',
    dangerTitle: 'Si alguien está en peligro, llame primero al número de emergencias local',
    dangerBody:
      'Legal Dash le conecta con un abogado. No es la policía, ni una ambulancia, ni los bomberos, y no puede enviarle ayuda.',
    yourRequest: 'Su solicitud urgente',
    yourRequestBody:
      'Se presenta desde su cuenta, así que puede seguirla y el profesional que la acepte verá su historial.',
    yourRequestsCount: 'Sus solicitudes urgentes ({count})',
    raised: 'Presentada {date} · número de devolución de llamada {phone}',
    takenBy: 'Aceptada por {name}',
    caseReference: ' · caso {reference}',
    offered:
      'Ofrecida a todos los profesionales de guardia de urgencias. Al primero que la acepta se le abre y se le asigna un caso.',
    joinRoom: 'Entrar en la sala de vídeo',
    statusOpen: 'Abierta',
    statusTaken: 'Aceptada',
    statusClosed: 'Cerrada',
    noSignUp: 'Sin registro',
    noSignUpBody:
      'Nada que verificar, nada que recordar. Estará en una sala en segundos.',
    realLawyer: 'Un abogado real',
    realLawyerOne:
      '{count} abogado está de guardia de urgencias ahora mismo. El primero que responda se une a usted.',
    realLawyerOther:
      '{count} abogados están de guardia de urgencias ahora mismo. El primero que responda se une a usted.',
    videoAndVoice: 'Vídeo y voz',
    videoAndVoiceBody: 'La llamada es directa entre usted y el abogado. No se graba nada.',
    notEmergency: '¿No es una urgencia?',
    notEmergencyBody:
      'Para todo lo que pueda esperar, una cuenta le ofrece una experiencia mucho mejor: puede enviar todos los detalles, adjuntar documentos, seguir el caso y escribir a su abogado. Una consulta general también sirve, pero entra en un fondo común y se responde más despacio.',
    backToDashboard: 'Volver a mi panel',
  },

  emergencyForm: {
    failedTitle: 'No hemos podido enviarlo',
    name: 'Su nombre',
    nameHint: 'Basta con el nombre.',
    phone: 'Número en el que llamarle',
    phoneHint: 'Puede que un abogado llame antes de entrar en la sala.',
    description: '¿Qué está ocurriendo?',
    descriptionHint: 'Basta con una frase. El abogado la lee mientras se incorpora.',
    areaOfLaw: 'Área del derecho',
    emailHint: 'Opcional. Para recibir una copia de lo que ha enviado.',
    pending: 'Buscando un abogado…',
    note: 'No necesita cuenta. Entra directamente en una sala de vídeo en la que se le une un abogado de guardia de urgencias. Mantenga la página abierta.',
  },

  emergencyRoom: {
    metaTitle: 'Llamada urgente',
    pill: 'Llamada urgente',
    lawyerJoined: 'Se ha unido un abogado',
    waiting: 'Esperando a que se una un abogado',
    raised: 'presentada {time}',
    answeredByFirst: 'la responde el primer abogado que se une',
    connectedTitle: 'Está conectado con un abogado',
    connectedBody: '{name} ha respondido a su urgencia y está en la sala de abajo.',
    goneTitle: 'Su solicitud ha llegado a todos los abogados de guardia de urgencias',
    goneBodyLead: 'Pulse ',
    goneBodyStrong: 'Entrar en la llamada',
    goneBodyTail:
      ' abajo y permanezca en esta página. El primer abogado que responda aparecerá aquí. Mantenga esta pestaña abierta.',
    callContext:
      'Esta es una llamada urgente. Permanezca en la página: un abogado de guardia de urgencias se unirá en breve.',
    noLongerNeed: '¿Ya no la necesita?',
    noLongerNeedBody:
      'Retirarla cierra la sala y avisa a todos los abogados que vieron la solicitud de que ha terminado.',
    recordingsTitle: 'Grabaciones de esta llamada ({count})',
    recordingsBody:
      'La grabación de su llamada hecha por el abogado, guardada también para usted. Está cifrada y solo vosotros dos podéis reproducirla.',
    ifNobodyJoins: 'Si no se une nadie',
    emergencyLead:
      'Llame a los servicios de emergencia si está en peligro: su ',
    emergencyStrong: 'número de emergencias local',
    emergencyTail: '.',
    keepOpen:
      'Mantenga esta página abierta: es su único enlace con la sala. Copie la dirección antes de cerrar la pestaña.',
    videoFails:
      'Si el vídeo no conecta, quédese en la sala: el abogado puede ver que está esperando y puede llamar al número que facilitó.',
    raiseAnother: 'Presentar otra solicitud',
    createAccountNextTime: 'Crear una cuenta para la próxima vez',
  },

  blog: {
    metaDescription:
      'Pregunte en qué consiste realmente un trámite, recomiende el abogado o el despacho que utilizó y lea lo que respondieron a otras personas, por tema.',
    intro:
      'Respuestas reales de quienes ya pasaron por ello: en qué consiste un trámite, cuánto costó y quién ayudó. Elija un tablero o escriba algo propio.',
    postOne: '{count} publicación',
    postOther: '{count} publicaciones',
    commentOne: '{count} comentario',
    commentOther: '{count} comentarios',
    neverAdvice: 'nada de esto es asesoramiento jurídico',
    sortNav: 'Ordenar',
    mostUseful: 'Más útil',
    newest: 'Más reciente',
    waitingTitle: 'Esperando a un moderador',
    waitingBody:
      'Un moderador comprueba si la pregunta ya se ha formulado antes de publicarla. Mientras tanto no se pierde nada.',
    written: 'escrita {time}',
    boards: 'Tableros',
    chooseBoard: 'Elija un tablero',
    writeHelp:
      'Pregunte algo, recomiende a un profesional que haya utilizado o cuente lo que ocurrió. Un moderador lo lee primero, sobre todo para comprobar que la pregunta no se haya formulado y respondido ya, en cuyo caso le remitirá a ese hilo.',
    signInTitle: 'Inicie sesión para publicar o votar',
    signInBodyLead:
      'La lectura está abierta a todo el mundo. Para hacer una pregunta, recomendar a un abogado o votar, ',
    signInBodyTail: '.',
    everything: 'Todo ({count})',
    nothingOnTopic: 'Todavía no hay nada sobre {topic}',
    nothingPosted: 'Todavía no se ha publicado nada',
    emptyNewBoard:
      'Este es un tablero nuevo, así que está vacío en lugar de lleno de ejemplos. La primera publicación será real.',
    emptySignIn: 'Inicie sesión para escribir la primera publicación de este tablero.',
  },

  blogPost: {
    metaTitle: 'Publicación',
    backToCommunity: '← Comunidad',
    waitingBody:
      'Esta publicación todavía no está en el tablero. Un moderador la lee primero, sobre todo para comprobar si la pregunta ya se ha formulado y respondido, en cuyo caso le remitirá a ese hilo en lugar de dejarle sin nada.',
    mineOnly: ' Solo usted y los moderadores pueden verla.',
    duplicateTitle: 'Esto ya se ha preguntado',
    duplicateLead: 'Un moderador la cerró por repetir ',
    duplicateTail: '. Allí están las respuestas.',
    hiddenTitle: 'Esta publicación está oculta en el tablero',
    removedTitle: 'Esta publicación se ha eliminado',
    removedBody: 'Un moderador decidió que esta publicación no debía aparecer en el tablero.',
    recommended: 'Recomendado',
    openProfile: 'Abrir su perfil',
    readOnlyLead: 'Cualquiera puede leer la comunidad. ',
    readOnlyTail:
      ' para reaccionar, comentar o plantear su propia pregunta: volverá a este hilo.',
  },

  auth: {
    signedOut: 'Ha cerrado la sesión.',
    passwordReset: 'Su contraseña se ha cambiado. Inicie sesión con la nueva contraseña.',
    suspended:
      'Esa cuenta está suspendida. Contacte con un revisor si cree que es un error.',
    twoFactorMetaTitle: 'Verificación en dos pasos',
    twoFactorTitle: 'Verificación en dos pasos',
    twoFactorBodyLead: 'Ha iniciado sesión como ',
    twoFactorBodyTail:
      '. Introduzca el código de su aplicación de autenticación para terminar.',
    twoFactorLostPhone:
      '¿Ha perdido el teléfono? Utilice uno de los códigos de recuperación que guardó al activar la verificación en dos pasos. Si no le queda ninguno, un administrador no puede recuperarlos por usted: eso anularía su finalidad.',
    registerClosedTitle: 'El registro está cerrado',
    registerClosedLead:
      'Los administradores de esta instalación han desactivado por ahora el registro de cuentas nuevas. Si ya tiene una cuenta, todavía puede ',
    registerClosedTail: '.',
    registerInviteTitle: 'Únase a su despacho en Legal Dash',
    registerTitle: 'Cree su cuenta de Legal Dash',
    registerIntro:
      'Un tipo de cuenta, elegido ahora. Puede completar su perfil y sus documentos justo después.',
    invalidInvite:
      'Ese enlace de invitación ya no es válido. Puede que se haya utilizado ya o que el despacho lo haya retirado. Todavía puede registrarse como abogado a continuación.',
    forgotMetaTitle: 'Restablecer su contraseña',
    forgotTitle: 'Restablecer su contraseña',
    forgotBody:
      'Introduzca la dirección de correo de su cuenta y registraremos un enlace de restablecimiento para ella.',
    resetMetaTitle: 'Elija una contraseña nueva',
    resetTitle: 'Elija una contraseña nueva',
    resetNoToken:
      'Esta página necesita un enlace de restablecimiento. Abra el enlace de su mensaje de restablecimiento o solicite uno nuevo.',
    resetRequestNew: 'Solicitar un enlace de restablecimiento nuevo',
    resetIntro: 'Elija algo que no haya utilizado antes en esta cuenta.',
    verifyMetaTitle: 'Confirme su dirección de correo',
    verifyTitle: 'Confirme su dirección de correo',
    verifyBodyLead: 'Hemos enviado un enlace de confirmación a ',
    verifyBodyTail: '. Su cuenta está limitada hasta que se confirme la dirección.',
    verifyCreated: 'Su cuenta se ha creado.',
    verifyDeliveryTitle: 'Sobre el envío de correo en esta instalación',
    verifyRecordedLead:
      'El mensaje de confirmación más reciente para esta cuenta se registró el ',
    verifyRecordedTail: ' UTC.',
    verifyOpenLink:
      'Abra el enlace de confirmación del mensaje que registramos o solicite uno nuevo abajo.',
    verifyNotReceived: '¿No lo ha recibido o el enlace ha caducado?',
    verifyContinue: 'Continuar a mi panel',
  },

  registerForm: {
    invitedTitle: 'Le han invitado a unirse a {firm}',
    invitedLead: 'Cree su cuenta de abogado con ',
    invitedTail:
      ' y complete los datos de su licencia. Se le registrará en el despacho automáticamente en cuanto se guarden sus datos profesionales.',
    failedTitle: 'No hemos podido crear su cuenta',
    userOption: 'Soy un usuario',
    lawyerOption: 'Soy abogado',
    firmOption: 'Soy un despacho',
    passwordHint: 'Al menos {count} caracteres, incluida una letra y un número.',
    confirmPassword: 'Confirmar la contraseña',
    terms:
      'Confirmo que los datos que facilito son míos y entiendo que los documentos que suba los examina un revisor antes de emitir cualquier insignia de verificación.',
    pending: 'Creando su cuenta…',
    emiratesIdNote:
      'Las cuentas de {user}, {lawyer} y {firm} requieren un documento oficial de identidad antes de la verificación.',
  },

  passwordForms: {
    resetFailedTitle: 'No se ha podido restablecer su contraseña',
    newPassword: 'Contraseña nueva',
    confirmNewPassword: 'Confirmar la contraseña nueva',
    pendingSending: 'Enviando…',
    pendingSaving: 'Guardando…',
    setNewPassword: 'Establecer la contraseña nueva',
    resetNote:
      'Establecer una contraseña nueva cierra la sesión en todos los dispositivos que la tuvieran abierta.',
    sendResetLink: 'Enviar el enlace de restablecimiento',
    backToSignIn: 'Volver al inicio de sesión',
    resendPending: 'Solicitando…',
    resendSubmit: 'Enviar de nuevo el mensaje de confirmación',
    currentPassword: 'Contraseña actual',
    changePending: 'Actualizando…',
    changeSubmit: 'Cambiar la contraseña',
  },

  twoFactorForm: {
    codeLabel: 'Código de autenticación',
    codeHint:
      'Los seis dígitos de su aplicación de autenticación, o uno de sus códigos de recuperación.',
    verifyPending: 'Comprobando…',
    verifySubmit: 'Verificar e iniciar sesión',
    cancelSignOut: 'Cancelar y cerrar sesión',
    settingsTitle: 'Autenticación en dos pasos',
    on: 'Activada',
    off: 'Desactivada',
    enabledOne:
      'Se requiere un código de su aplicación de autenticación cada vez que inicie sesión. Le queda {count} código de recuperación.',
    enabledOther:
      'Se requiere un código de su aplicación de autenticación cada vez que inicie sesión. Le quedan {count} códigos de recuperación.',
    disabledBody:
      'Añada un segundo paso al iniciar sesión. Sirve cualquier aplicación de autenticación: Google Authenticator, Authy, 1Password.',
    turnOn: 'Activar la verificación en dos pasos',
    preparing: 'Preparando…',
    setUpHeading: 'Configure su aplicación de autenticación',
    qrAlt: 'Código QR de configuración en dos pasos',
    scanHint:
      'Escanee el código o escriba esta clave en su aplicación si no puede escanearlo:',
    confirmCodeLabel: 'Introduzca el código de seis dígitos de su aplicación',
    confirmCodeHint:
      'Esto demuestra que la aplicación está configurada antes de activar la verificación en dos pasos.',
    verifying: 'Verificando…',
    recoveryHeading: 'Guarde estos códigos de recuperación',
    recoveryBody:
      'Cada uno sirve una vez, si pierde el teléfono. Solo se muestran ahora y no se pueden recuperar después: guárdelos en un lugar seguro y sin conexión.',
    issueHeading: 'Emitir códigos de recuperación nuevos',
    issueHint: 'Se requiere su contraseña. Esto invalida los códigos que ya tiene.',
    issuing: 'Emitiendo…',
    issueSubmit: 'Emitir códigos de recuperación nuevos',
    disableHeading: 'Desactivar la verificación en dos pasos',
    disableHint:
      'Se requiere su contraseña, para que una sesión prestada no pueda desactivarla.',
    disableConfirm:
      '¿Desactivar la autenticación en dos pasos? Bastará con su contraseña para iniciar sesión.',
    turningOff: 'Desactivando…',
    disableSubmit: 'Desactivar la verificación en dos pasos',
  },

  verifyEmailForm: {
    pending: 'Confirmando…',
    submit: 'Confirmar mi dirección de correo',
  },
};
