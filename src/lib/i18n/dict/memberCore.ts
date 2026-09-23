import type { Translated } from '../translated';

/**
 * Member Core — the strings, in English first.
 *
 * English is the source of truth: the Spanish object below is typed against it,
 * so a key that exists here and not there is a build error rather than an
 * English sentence on a Spanish page.
 *
 * This is the signed-in member area: the dashboard and the account pages, and
 * the client components they hand their wording down to. Anything the shared
 * dictionary already says — the nav labels, the common verbs, the badge and
 * verification-status words, and the code-to-word vocabulary under `t.labels` —
 * is read from there instead of repeated here.
 */
export const memberCoreEn = {
  /**
   * The account types as the subject of a sentence: "… account · email".
   *
   * The bare names come from the shared `t.labels.accountType` vocabulary; this
   * is only the phrase form, which each language builds its own way.
   */
  accountTypeLines: {
    USER: 'Individual account',
    LAWYER: 'Lawyer account',
    FIRM: 'Legal firm account',
  },

  dashboard: {
    notices: {
      emailConfirmed: 'Your email address is confirmed.',
      reviewerOnly: 'That area is only available to accounts with reviewer access.',
      professionalsOnly: 'That area is for lawyer and legal-firm accounts.',
    },
    hello: 'Hello, {name}',
    reviewerConsoleBody:
      'Decide verification requests, manage accounts and read the outbox in the reviewer console.',
    openReviewerConsole: 'Open the reviewer console',
    inMyPortfolio: 'In my portfolio',
    pendingReview: 'Pending review',
    clients: 'Clients',
    meetingsToday: 'Meetings today',
    noMeetingsToday: 'No meetings booked for today.',
    openTheCalendar: 'Open the calendar',
    seeAll: 'See all',
    reviewTheCase: 'Review the case',
    firmLawyersBody:
      'Only a lawyer registered with your firm can accept a case submitted to it. Add your professionals so nothing sits unaccepted.',
    manageLawyers: 'Manage lawyers registered',
    myCases: 'My cases',
    seeAllAndMeetings: 'See all and my meetings',
    alertsUnreadOne: '{count} unread alert.',
    alertsUnreadMany: '{count} unread alerts.',
    readMyAlerts: 'Read my alerts',
    approvedOn: 'Your documents were approved on {date}. Your profile carries the {badge} badge.',
    pendingQueue: 'Your request is in the queue and has not been picked up yet.',
    underReview: 'A reviewer is examining your documents now.',
    rejected:
      'Your last request was not approved. Read the reviewer’s reason, fix it, and submit again.',
    incomplete:
      'Complete your profile, your legal details and your documents, then submit for review.',
    viewMyDocuments: 'View my documents',
    continueVerification: 'Continue verification',
    notProvided: 'Not provided',
    listingPublished: 'is published and visible to everyone.',
    listingDraft: 'is saved as a private draft. Nobody else can see it yet.',
    editListing: 'Edit listing',
    viewInDirectory: 'View it in the directory',
    createMyListing: 'Create my listing',
  },

  account: {
    metaTitle: 'Account and security',
    sessionsRevoked: 'Every other device has been signed out.',
    intro: 'Your sign-in details, active sessions and verification state.',
    heading: 'Account',
    accountType: 'Account type',
    badge: 'Badge',
    noBadge: 'No badge — your documents have not been approved',
    emailConfirmed: 'Email confirmed',
    lastSignedIn: 'Last signed in',
    reviewerAccess: 'Reviewer access',
    openReviewerConsole: 'open the reviewer console',
    changePassword: 'Change password',
    changePasswordBody: 'Changing your password signs out every other device.',
    activeSessions: 'Active sessions',
    devicesSignedInOne: '{count} device is signed in.',
    devicesSignedInMany: '{count} devices are signed in.',
    signOutOtherDevices: 'Sign out other devices',
    unknownDevice: 'Unknown device',
    thisDevice: 'This device',
    lastActiveExpires: 'Last active {lastActive} · expires {expires}',
    twoFactor: 'Two-factor authentication',
    notifications: 'Notifications',
    billingReceipts: 'Billing receipts',
    billingReceiptsBody:
      'Every fee you raise produces a receipt the client can print. It carries the standard Legal Dash layout until you choose a letterhead of your own.',
    chooseReceiptLayout: 'Choose my receipt layout',
    emailInstallationTitle: 'About email from this installation',
  },

  /**
   * The words for the security forms on the account page.
   *
   * `PasswordForms` and `TwoFactorForms` have no wording of their own — their
   * author took the English out and made `labels` required, so the page that
   * renders them supplies it. This is that supply, kept here until those strings
   * have a home of their own.
   */
  securityForms: {
    changePassword: {
      currentPassword: 'Current password',
      newPassword: 'New password',
      passwordHint: 'At least {count} characters, including a letter and a number.',
      confirmNewPassword: 'Confirm new password',
      pending: 'Updating…',
      submit: 'Change password',
    },
    twoFactor: {
      codeLabel: 'Authentication code',
      codeHint:
        'The six digits from your authenticator app, or one of your recovery codes.',
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
      disableConfirm: 'Turn off two-factor authentication? Your password alone will sign you in.',
      turningOff: 'Turning off…',
      disableSubmit: 'Turn off two-factor',
    },
  },

  profile: {
    missingTitle: 'Profile missing',
    missingBody: 'Your profile record could not be loaded. Please sign out and in again.',
    intro:
      'These are the basics every account must supply. Only your work description, education and country of residence appear on a public listing — your Emirates ID, date of birth and place of birth are never published.',
    picture: 'Profile picture',
    yourAccount: 'Your account',
    onFile: 'What you have on file',
    accountType: 'Account type',
    fullName: 'Full name',
    age: 'Age',
    ageFromDob: '{age} (from date of birth)',
    dobNotProvided: 'Date of birth not provided',
    dateOfBirth: 'Date of birth',
    placeOfBirth: 'Place of birth',
    countryOfResidence: 'Country of residence',
    nationality: 'Nationality',
    notProvided: 'Not provided',
    editDetails: 'Edit your details',
    nextStep: 'Next step',
    firmRegistration: 'Add your firm’s legal registration details, then upload your documents.',
    licence: 'Add your legal licence details, then upload your documents.',
    editLegalDetails: 'Edit legal details',
    goToDocuments: 'Go to documents',
    uploadEmiratesId: 'Upload your Emirates ID to submit your account for verification.',
  },

  notifications: {
    noUnread: 'You have no unread alerts.',
    unreadOne: '{count} unread alert.',
    unreadMany: '{count} unread alerts.',
    deliveryNote:
      'Alerts are delivered here because this installation has no email provider configured.',
    emptyTitle: 'No alerts yet',
    emptyBody:
      'You will be told here when a case changes state, someone messages you, or a meeting is booked with you.',
    unreadSuffix: ' · unread',
  },

  support: {
    intro:
      'Report a problem and talk it through with the people who run Legal Dash. A ticket goes to platform administrators only — never to the other side of a case. Each one is closed once an administrator marks it solved.',
    opened: 'opened',
    from: 'from',
    member: 'Member',
    staff: 'Support',
    allMyTickets: '← All my tickets',
    reportTitle: 'Report a problem',
    reportBody:
      'Describe what happened. Support can see your account, so you do not need to explain who you are.',
    myTickets: 'My tickets ({count})',
    emptyTitle: 'You have not contacted support',
    emptyBody:
      'When you report a problem, the ticket and the whole conversation about it appear here.',
    messagesOne: '{count} message',
    messagesMany: '{count} messages',
    updated: 'updated',
    solvedTitle: 'This ticket is solved and closed',
    closedWarning:
      'Closed {date}{closedBy}. If the problem comes back, raise a new ticket and quote {reference}.',
    closedBy: ' by {email}',
  },

  portfolio: {
    introFirm: 'Cases that one of your registered lawyers has accepted and is working on.',
    introLawyer: 'Every case you have accepted and are responsible for.',
    ongoing: 'Ongoing',
    completed: 'Completed',
    totalAccepted: 'Total accepted',
    emptyTitle: 'No ongoing cases',
    emptyBody: 'Cases you accept from the pending queue appear here.',
  },

  pending: {
    introFirm:
      'Open a case, decide it is a fit, then release it to your registered lawyers. They each choose to take it or pass, and the first to take it is assigned.',
    introLawyer:
      'New cases sent to you that nobody has picked up, and the ones you have opened for review.',
    howReachTitle: 'How cases reach your lawyers',
    howReachBefore:
      'A case submitted to {name} lands here first. Open it and, if you have a lawyer who fits the work, press ',
    howReachAction: 'Accept and send to our lawyers',
    howReachAfter: ' — every registered lawyer is then offered it and decides for themselves.',
    waitingForDecision: 'Waiting for your decision',
    waitingToBePickedUp: 'Waiting to be picked up',
    nothingWaiting: 'Nothing waiting',
    emptyFirm: 'Cases sent to your firm appear here until one of your lawyers accepts them.',
    emptyLawyer: 'Cases sent to you from your directory listing appear here.',
    yourFirm: 'your firm',
    openAndReview: 'Open and review',
    reviewTheCase: 'Review the case',
    withYourLawyers: 'With your lawyers ({count})',
    withYourLawyersBody:
      'Released and waiting for one of them to answer. Open a case to see who has passed and who has not replied.',
    seeWhoAnswered: 'See who answered',
    openedForReview: 'Opened for review ({count})',
    continueReview: 'Continue review',
    notLawyerTitle: 'Not a lawyer yourself?',
    notLawyerBody:
      'A firm account cannot accept a case — only a registered lawyer can. Add your lawyers so they can pick cases up.',
  },

  invitations: {
    title: 'Invitations',
    onlyLawyers: 'Only lawyer accounts can join a firm. You are signed in as a {type} account.',
    legalFirm: 'legal firm',
    individual: 'individual',
    intro:
      'Firms that have invited you to join as one of their registered lawyers. Accepting links your licence to the firm and lets you accept cases submitted to it.',
    emptyTitle: 'No pending invitations',
    emptyBody: 'When a firm registers you as a professional, the invitation appears here.',
    backToDashboard: 'Back to my dashboard',
    invited: 'Invited {date} · trade licence {licence}{emirate}',
    emirateSuffix: ' · {emirate}',
    /** The accept/decline buttons, used by the shared invitation form. */
    response: {
      joining: 'Joining…',
      acceptAndJoin: 'Accept and join {firm}',
      declining: 'Declining…',
      decline: 'Decline',
    },
  },

  clients: {
    intro:
      'Everyone you have an accepted case with. Open a client to see their details and the cases you share, or book a meeting from the calendar.',
    emptyTitle: 'No clients yet',
    emptyBody: 'A client appears here once you accept a case from them.',
    phone: 'Phone {phone}',
    residentIn: 'Resident in {country}',
    work: 'Work:',
    casesCount: 'Cases ({count})',
    updated: 'updated',
  },

  inquiries: {
    intro:
      'Messages sent through the directory. Replies stay here as a record, and a copy of each message is recorded for the recipient’s email address.',
    sentNotice: 'Your inquiry has been sent.',
    statuses: {
      NEW: 'New',
      READ: 'Read',
      RESPONDED: 'Replied',
      CLOSED: 'Closed',
    },
    receivedTab: 'Received ({count})',
    sentTab: 'Sent ({count})',
    emptyReceivedTitle: 'No inquiries received yet',
    emptySentTitle: 'You have not sent any inquiries',
    emptyReceivedBodyUser: 'Nobody has contacted you through Legal Dash.',
    emptyReceivedBodyPro:
      'When someone contacts you from your directory listing, their message appears here.',
    emptySentBody: 'Find a lawyer or firm in the directory and send them a message.',
    from: 'From {name}',
    to: 'To {name}',
    unknownMember: 'Unknown member',
    listing: 'listing:',
    yourReply: 'Your reply',
    replyFromProfessional: 'Reply from the professional',
    markAsRead: 'Mark as read',
    close: 'Close',
    closeConfirm: 'Close this inquiry?',
  },

  profileForm: {
    notSpecified: 'Not specified',
    errorTitle: 'Your profile was not saved',
    fullName: 'Full name',
    dateOfBirth: 'Date of birth',
    ageShown: 'Your age is shown as {age}.',
    ageHint: 'Used to show your age.',
    countryOfBirth: 'Country of birth',
    countryOfBirthHint:
      'The country that issued your birth documents. This decides which identity document you are asked for.',
    nationality: 'Nationality',
    nationalityHint:
      'Whose passport you hold. It can differ from where you were born, and often does.',
    countryOfResidence: 'Country of residence',
    countryOfResidenceHint:
      'Where you actually live. If it is not where your nationality is from, a residence permit is asked for as well.',
    placeOfBirth: 'Place of birth, as written',
    placeOfBirthHint: 'The town or city, shown to reviewers and never published.',
    placeOfBirthPlaceholder: 'e.g. Rosario',
    phone: 'Phone number',
    phoneHint: 'Include the country code, for example +971 50 123 4567.',
    emiratesId: 'Emirates ID',
    emiratesIdBody:
      'Required for every account type. One Emirates ID can verify only one Legal Dash account. It is never shown publicly — reviewers see the full number, everyone else sees it masked.',
    emiratesIdNumber: 'Emirates ID number',
    emiratesIdNumberHint: '15 digits, in the form 784-YYYY-NNNNNNN-C.',
    emiratesIdNumberPlaceholder: '784-1990-1234567-1',
    emiratesIdExpiry: 'Emirates ID expiry',
    work: 'Your work',
    workHint: 'Briefly describe what you actually do. Lawyers and firms: describe your practice.',
    education: 'Education background',
    educationHint: 'Degrees, institutions and years. This is shown on your public profile.',
    saving: 'Saving…',
    saveProfile: 'Save profile',
  },

  profilePhoto: {
    replaceYourPhoto: 'Replace your photo',
    addAPhoto: 'Add a photo',
    hint: 'JPEG, PNG or WebP up to 10 MB. A square image works best. Your photo is saved and shown immediately — nothing reviews it.',
    uploading: 'Uploading…',
    replacePhoto: 'Replace photo',
    uploadPhoto: 'Upload photo',
    removeConfirm: 'Remove your profile picture?',
    removing: 'Removing…',
    removePhoto: 'Remove photo',
    privacyNote:
      'Your photo is private until you publish a directory listing. It is also shown to a reviewer checking your documents, and to anyone you have a case with.',
  },

  pushNotifications: {
    heading: 'Browser notifications',
    status: {
      checking: 'Checking…',
      on: 'On for this browser',
      off: 'Off',
      denied: 'Blocked by the browser',
      unsupported: 'Not supported here',
      unconfigured: 'Not configured',
    },
    bodyOn:
      'Case updates, new messages, emergencies and meeting requests will reach this device even when Legal Dash is closed.',
    bodyDenied:
      'This browser has blocked notifications for this site. Allow them in the browser’s site settings, then reload this page.',
    bodyUnsupported:
      'This browser does not support push notifications. In-app alerts still appear under Alerts.',
    bodyUnconfigured:
      'This installation has no VAPID key pair, so browser push cannot be offered. In-app alerts still appear under Alerts.',
    bodyOff:
      'Turn notifications on to be told about case updates, new messages, emergencies and meeting requests on this device.',
    subscriptionOne: '{count} browser currently receive notifications for your account.',
    subscriptionMany: '{count} browsers currently receive notifications for your account.',
    turningOff: 'Turning off…',
    turnOff: 'Turn off',
    turnOn: 'Turn on notifications',
  },

  notificationButtons: {
    markRead: 'Mark read',
    marking: 'Marking…',
    markAllRead: 'Mark all as read',
  },

  supportForms: {
    problem: 'What is the problem?',
    problemHint: 'One line, so it can be told apart from everything else in the queue.',
    problemPlaceholder: 'I cannot upload my Emirates ID',
    about: 'What is it about?',
    describe: 'Describe it',
    describeHint:
      'What you were doing, what happened, and what you expected. Support sees your account, so you do not need to repeat your details.',
    sendingToSupport: 'Sending to support…',
    sendToSupport: 'Send to support',
    privacyNote:
      'Support goes to platform administrators only. It is not shown to the other side of any case.',
    closedTicket: 'This ticket is closed.',
    message: 'Message',
    replyPlaceholderAdmin: 'Reply to the reporter…',
    replyPlaceholder: 'Add to this ticket…',
    sending: 'Sending…',
    sendReply: 'Send reply',
    sendMessage: 'Send message',
    solveConfirm:
      'Mark {reference} solved and close it? Neither side can post to it afterwards, and the reporter has to raise a new ticket if the problem comes back.',
    closing: 'Closing…',
    markSolved: 'Mark solved and close',
  },

  inquiryForm: {
    subject: 'Subject',
    subjectPlaceholder: 'e.g. Advice on a commercial lease dispute',
    message: 'Message',
    messageHint: 'Describe your situation briefly. At least 20 characters. This goes to {name}.',
    sending: 'Sending…',
    sendInquiry: 'Send inquiry',
    privacyNote:
      'Your name and the email address on your account are shared with the recipient so they can reply. Your Emirates ID is never shared through the directory.',
  },

  inquiryReply: {
    yourReply: 'Your reply',
    sending: 'Sending…',
    sendReply: 'Send reply',
    markAsRead: 'Mark as read',
    close: 'Close',
    closeConfirm: 'Close this inquiry?',
  },

  officeRequest: {
    confirming: 'Confirming…',
    willAttend: 'I will attend',
    sending: 'Sending…',
    cannotCome: 'I cannot come',
  },
};

export type MemberCoreDict = Translated<typeof memberCoreEn>;

export const memberCoreEs: MemberCoreDict = {
  accountTypeLines: {
    USER: 'Cuenta de particular',
    LAWYER: 'Cuenta de abogado',
    FIRM: 'Cuenta de despacho',
  },

  dashboard: {
    notices: {
      emailConfirmed: 'Su dirección de correo electrónico está confirmada.',
      reviewerOnly: 'Esa área solo está disponible para cuentas con acceso de revisor.',
      professionalsOnly: 'Esa área es para cuentas de abogado y de despacho.',
    },
    hello: 'Hola, {name}',
    reviewerConsoleBody:
      'Decida solicitudes de verificación, gestione cuentas y lea la bandeja de salida en la consola del revisor.',
    openReviewerConsole: 'Abrir la consola del revisor',
    inMyPortfolio: 'En mi cartera',
    pendingReview: 'Pendientes de revisión',
    clients: 'Clientes',
    meetingsToday: 'Reuniones de hoy',
    noMeetingsToday: 'No hay reuniones reservadas para hoy.',
    openTheCalendar: 'Abrir la agenda',
    seeAll: 'Ver todo',
    reviewTheCase: 'Revisar el caso',
    firmLawyersBody:
      'Solo un abogado registrado en su despacho puede aceptar un caso enviado a él. Añada a sus profesionales para que ninguno se quede sin aceptar.',
    manageLawyers: 'Gestionar los abogados registrados',
    myCases: 'Mis casos',
    seeAllAndMeetings: 'Ver todo y mis reuniones',
    alertsUnreadOne: '{count} aviso sin leer.',
    alertsUnreadMany: '{count} avisos sin leer.',
    readMyAlerts: 'Leer mis avisos',
    approvedOn: 'Sus documentos se aprobaron el {date}. Su perfil muestra la insignia «{badge}».',
    pendingQueue: 'Su solicitud está en la cola y todavía no la ha tomado nadie.',
    underReview: 'Un revisor está examinando sus documentos ahora mismo.',
    rejected:
      'Su última solicitud no fue aprobada. Lea el motivo del revisor, corríjalo y vuelva a enviarla.',
    incomplete:
      'Complete su perfil, sus datos profesionales y sus documentos, y envíelos para revisión.',
    viewMyDocuments: 'Ver mis documentos',
    continueVerification: 'Continuar la verificación',
    notProvided: 'No facilitado',
    listingPublished: 'está publicada y visible para todos.',
    listingDraft: 'está guardada como borrador privado. Nadie más puede verla todavía.',
    editListing: 'Editar la ficha',
    viewInDirectory: 'Verla en el directorio',
    createMyListing: 'Crear mi ficha',
  },

  account: {
    metaTitle: 'Cuenta y seguridad',
    sessionsRevoked: 'Se ha cerrado la sesión en todos los demás dispositivos.',
    intro: 'Sus datos de acceso, sus sesiones activas y el estado de su verificación.',
    heading: 'Cuenta',
    accountType: 'Tipo de cuenta',
    badge: 'Insignia',
    noBadge: 'Sin insignia: sus documentos no han sido aprobados',
    emailConfirmed: 'Correo confirmado',
    lastSignedIn: 'Último acceso',
    reviewerAccess: 'Acceso de revisor',
    openReviewerConsole: 'abrir la consola del revisor',
    changePassword: 'Cambiar la contraseña',
    changePasswordBody:
      'Al cambiar su contraseña se cierra la sesión en todos los demás dispositivos.',
    activeSessions: 'Sesiones activas',
    devicesSignedInOne: '{count} dispositivo ha iniciado sesión.',
    devicesSignedInMany: '{count} dispositivos han iniciado sesión.',
    signOutOtherDevices: 'Cerrar la sesión en los demás dispositivos',
    unknownDevice: 'Dispositivo desconocido',
    thisDevice: 'Este dispositivo',
    lastActiveExpires: 'Última actividad {lastActive} · caduca {expires}',
    twoFactor: 'Autenticación en dos pasos',
    notifications: 'Notificaciones',
    billingReceipts: 'Recibos de honorarios',
    billingReceiptsBody:
      'Cada honorario que emite genera un recibo que el cliente puede imprimir. Lleva el formato estándar de Legal Dash hasta que elija un membrete propio.',
    chooseReceiptLayout: 'Elegir mi formato de recibo',
    emailInstallationTitle: 'Sobre el correo de esta instalación',
  },

  securityForms: {
    changePassword: {
      currentPassword: 'Contraseña actual',
      newPassword: 'Contraseña nueva',
      passwordHint: 'Al menos {count} caracteres, incluida una letra y un número.',
      confirmNewPassword: 'Confirmar la contraseña nueva',
      pending: 'Actualizando…',
      submit: 'Cambiar la contraseña',
    },
    twoFactor: {
      codeLabel: 'Código de autenticación',
      codeHint:
        'Los seis dígitos de su aplicación de autenticación o uno de sus códigos de recuperación.',
      verifyPending: 'Comprobando…',
      verifySubmit: 'Verificar e iniciar sesión',
      cancelSignOut: 'Cancelar y cerrar sesión',
      settingsTitle: 'Autenticación en dos pasos',
      on: 'Activada',
      off: 'Desactivada',
      enabledOne:
        'Se requiere un código de su aplicación de autenticación cada vez que inicia sesión. Queda {count} código de recuperación.',
      enabledOther:
        'Se requiere un código de su aplicación de autenticación cada vez que inicia sesión. Quedan {count} códigos de recuperación.',
      disabledBody:
        'Añada un segundo paso al iniciar sesión. Sirve cualquier aplicación de autenticación: Google Authenticator, Authy, 1Password.',
      turnOn: 'Activar la autenticación en dos pasos',
      preparing: 'Preparando…',
      setUpHeading: 'Configure su aplicación de autenticación',
      qrAlt: 'Código QR de configuración de la autenticación en dos pasos',
      scanHint: 'Escanee el código o escriba esta clave en su aplicación si no puede escanearlo:',
      confirmCodeLabel: 'Introduzca el código de seis dígitos de su aplicación',
      confirmCodeHint:
        'Esto demuestra que la aplicación está configurada antes de activar la autenticación en dos pasos.',
      verifying: 'Verificando…',
      recoveryHeading: 'Guarde estos códigos de recuperación',
      recoveryBody:
        'Cada uno funciona una vez, si pierde el teléfono. Solo se muestran ahora y no podrán recuperarse después: guárdelos en un lugar seguro y sin conexión.',
      issueHeading: 'Emitir nuevos códigos de recuperación',
      issueHint: 'Se requiere su contraseña. Esto invalida los códigos que ya tiene.',
      issuing: 'Emitiendo…',
      issueSubmit: 'Emitir nuevos códigos de recuperación',
      disableHeading: 'Desactivar la autenticación en dos pasos',
      disableHint:
        'Se requiere su contraseña, para que una sesión ajena no pueda desactivarla.',
      disableConfirm:
        '¿Desactivar la autenticación en dos pasos? Bastará con su contraseña para iniciar sesión.',
      turningOff: 'Desactivando…',
      disableSubmit: 'Desactivar la autenticación en dos pasos',
    },
  },

  profile: {
    missingTitle: 'Perfil no encontrado',
    missingBody: 'No se pudo cargar su registro de perfil. Cierre la sesión y vuelva a iniciarla.',
    intro:
      'Estos son los datos básicos que debe aportar toda cuenta. Solo su descripción del trabajo, su formación y su país de residencia aparecen en una ficha pública: su Emirates ID, su fecha de nacimiento y su lugar de nacimiento nunca se publican.',
    picture: 'Foto de perfil',
    yourAccount: 'Su cuenta',
    onFile: 'Lo que consta en su expediente',
    accountType: 'Tipo de cuenta',
    fullName: 'Nombre completo',
    age: 'Edad',
    ageFromDob: '{age} (a partir de la fecha de nacimiento)',
    dobNotProvided: 'Fecha de nacimiento no facilitada',
    dateOfBirth: 'Fecha de nacimiento',
    placeOfBirth: 'Lugar de nacimiento',
    countryOfResidence: 'País de residencia',
    nationality: 'Nacionalidad',
    notProvided: 'No facilitado',
    editDetails: 'Edite sus datos',
    nextStep: 'Siguiente paso',
    firmRegistration:
      'Añada los datos del registro legal de su despacho y después suba sus documentos.',
    licence: 'Añada los datos de su licencia profesional y después suba sus documentos.',
    editLegalDetails: 'Editar los datos profesionales',
    goToDocuments: 'Ir a los documentos',
    uploadEmiratesId: 'Suba su Emirates ID para enviar su cuenta a verificación.',
  },

  notifications: {
    noUnread: 'No tiene avisos sin leer.',
    unreadOne: '{count} aviso sin leer.',
    unreadMany: '{count} avisos sin leer.',
    deliveryNote:
      'Los avisos llegan aquí porque esta instalación no tiene configurado ningún proveedor de correo.',
    emptyTitle: 'Todavía no hay avisos',
    emptyBody:
      'Aquí se le avisará cuando un caso cambie de estado, alguien le escriba o se reserve una reunión con usted.',
    unreadSuffix: ' · sin leer',
  },

  support: {
    intro:
      'Notifique un problema y coméntelo con las personas que gestionan Legal Dash. Un tique llega solo a los administradores de la plataforma, nunca a la otra parte de un caso. Cada uno se cierra cuando un administrador lo marca como resuelto.',
    opened: 'abierto el',
    from: 'desde',
    member: 'Miembro',
    staff: 'Soporte',
    allMyTickets: '← Todos mis tiques',
    reportTitle: 'Notificar un problema',
    reportBody:
      'Describa lo que ha ocurrido. Soporte puede ver su cuenta, así que no hace falta que explique quién es.',
    myTickets: 'Mis tiques ({count})',
    emptyTitle: 'No ha contactado con soporte',
    emptyBody:
      'Cuando notifique un problema, el tique y toda la conversación sobre él aparecerán aquí.',
    messagesOne: '{count} mensaje',
    messagesMany: '{count} mensajes',
    updated: 'actualizado el',
    solvedTitle: 'Este tique está resuelto y cerrado',
    closedWarning:
      'Cerrado el {date}{closedBy}. Si el problema vuelve, cree un tique nuevo y cite {reference}.',
    closedBy: ' por {email}',
  },

  portfolio: {
    introFirm:
      'Casos que ha aceptado uno de sus abogados registrados y en los que está trabajando.',
    introLawyer: 'Todos los casos que ha aceptado y de los que es responsable.',
    ongoing: 'En curso',
    completed: 'Completados',
    totalAccepted: 'Total aceptados',
    emptyTitle: 'No hay casos en curso',
    emptyBody: 'Los casos que acepte de la cola de pendientes aparecerán aquí.',
  },

  pending: {
    introFirm:
      'Abra un caso, decida si encaja y distribúyalo después entre sus abogados registrados. Cada uno decide si lo toma o lo rechaza, y se asigna al primero que lo tome.',
    introLawyer:
      'Casos nuevos que le han enviado y que nadie ha tomado, y los que ha abierto para revisar.',
    howReachTitle: 'Cómo llegan los casos a sus abogados',
    howReachBefore:
      'Un caso enviado a {name} llega primero aquí. Ábralo y, si tiene un abogado que encaje con el trabajo, pulse ',
    howReachAction: 'Aceptar y enviar a nuestros abogados',
    howReachAfter:
      ' — a todos los abogados registrados se les ofrece entonces y deciden por sí mismos.',
    waitingForDecision: 'Esperando su decisión',
    waitingToBePickedUp: 'Esperando a que alguien lo tome',
    nothingWaiting: 'No hay nada en espera',
    emptyFirm:
      'Los casos enviados a su despacho aparecerán aquí hasta que uno de sus abogados los acepte.',
    emptyLawyer: 'Los casos que le envíen desde su ficha del directorio aparecerán aquí.',
    yourFirm: 'su despacho',
    openAndReview: 'Abrir y revisar',
    reviewTheCase: 'Revisar el caso',
    withYourLawyers: 'Con sus abogados ({count})',
    withYourLawyersBody:
      'Distribuidos y esperando la respuesta de uno de ellos. Abra un caso para ver quién lo ha rechazado y quién no ha respondido.',
    seeWhoAnswered: 'Ver quién ha respondido',
    openedForReview: 'Abiertos para revisar ({count})',
    continueReview: 'Continuar la revisión',
    notLawyerTitle: '¿No es abogado?',
    notLawyerBody:
      'Una cuenta de despacho no puede aceptar un caso: solo puede hacerlo un abogado registrado. Añada a sus abogados para que puedan tomarlos.',
  },

  invitations: {
    title: 'Invitaciones',
    onlyLawyers:
      'Solo las cuentas de abogado pueden unirse a un despacho. Ha iniciado sesión con una cuenta de {type}.',
    legalFirm: 'despacho',
    individual: 'particular',
    intro:
      'Despachos que le han invitado a unirse como uno de sus abogados registrados. Al aceptar, su licencia queda vinculada al despacho y podrá aceptar los casos que se le envíen.',
    emptyTitle: 'No hay invitaciones pendientes',
    emptyBody: 'Cuando un despacho le registre como profesional, la invitación aparecerá aquí.',
    backToDashboard: 'Volver a mi panel',
    invited: 'Invitado el {date} · licencia comercial {licence}{emirate}',
    emirateSuffix: ' · {emirate}',
    response: {
      joining: 'Uniéndose…',
      acceptAndJoin: 'Aceptar y unirse a {firm}',
      declining: 'Rechazando…',
      decline: 'Rechazar',
    },
  },

  clients: {
    intro:
      'Todas las personas con las que tiene un caso aceptado. Abra un cliente para ver sus datos y los casos que comparten, o reserve una reunión desde la agenda.',
    emptyTitle: 'Todavía no hay clientes',
    emptyBody: 'Un cliente aparece aquí en cuanto acepte un caso suyo.',
    phone: 'Teléfono {phone}',
    residentIn: 'Residente en {country}',
    work: 'Trabajo:',
    casesCount: 'Casos ({count})',
    updated: 'actualizado el',
  },

  inquiries: {
    intro:
      'Mensajes enviados a través del directorio. Las respuestas quedan aquí como registro, y se guarda una copia de cada mensaje para la dirección de correo electrónico del destinatario.',
    sentNotice: 'Su consulta se ha enviado.',
    statuses: {
      NEW: 'Nueva',
      READ: 'Leída',
      RESPONDED: 'Respondida',
      CLOSED: 'Cerrada',
    },
    receivedTab: 'Recibidas ({count})',
    sentTab: 'Enviadas ({count})',
    emptyReceivedTitle: 'Todavía no ha recibido consultas',
    emptySentTitle: 'No ha enviado ninguna consulta',
    emptyReceivedBodyUser: 'Nadie se ha puesto en contacto con usted a través de Legal Dash.',
    emptyReceivedBodyPro:
      'Cuando alguien le contacte desde su ficha del directorio, su mensaje aparecerá aquí.',
    emptySentBody: 'Busque un abogado o un despacho en el directorio y envíele un mensaje.',
    from: 'De {name}',
    to: 'Para {name}',
    unknownMember: 'Miembro desconocido',
    listing: 'ficha:',
    yourReply: 'Su respuesta',
    replyFromProfessional: 'Respuesta del profesional',
    markAsRead: 'Marcar como leída',
    close: 'Cerrar',
    closeConfirm: '¿Cerrar esta consulta?',
  },

  profileForm: {
    notSpecified: 'Sin especificar',
    errorTitle: 'No se guardó su perfil',
    fullName: 'Nombre completo',
    dateOfBirth: 'Fecha de nacimiento',
    ageShown: 'Su edad se muestra como {age}.',
    ageHint: 'Se usa para mostrar su edad.',
    countryOfBirth: 'País de nacimiento',
    countryOfBirthHint:
      'El país que emitió sus documentos de nacimiento. Esto determina qué documento de identidad se le solicita.',
    nationality: 'Nacionalidad',
    nationalityHint:
      'De qué país es el pasaporte que tiene. Puede ser distinto de donde nació, y a menudo lo es.',
    countryOfResidence: 'País de residencia',
    countryOfResidenceHint:
      'Donde vive realmente. Si no es el país de su nacionalidad, también se solicita un permiso de residencia.',
    placeOfBirth: 'Lugar de nacimiento, tal como se escribe',
    placeOfBirthHint: 'La localidad o ciudad, visible para los revisores y nunca publicada.',
    placeOfBirthPlaceholder: 'p. ej. Rosario',
    phone: 'Número de teléfono',
    phoneHint: 'Incluya el prefijo del país, por ejemplo +971 50 123 4567.',
    emiratesId: 'Emirates ID',
    emiratesIdBody:
      'Obligatorio para todos los tipos de cuenta. Un Emirates ID solo puede verificar una cuenta de Legal Dash. Nunca se muestra públicamente: los revisores ven el número completo y los demás lo ven enmascarado.',
    emiratesIdNumber: 'Número de Emirates ID',
    emiratesIdNumberHint: '15 dígitos, con el formato 784-AAAA-NNNNNNN-C.',
    emiratesIdNumberPlaceholder: '784-1990-1234567-1',
    emiratesIdExpiry: 'Caducidad del Emirates ID',
    work: 'Su trabajo',
    workHint:
      'Describa brevemente lo que hace realmente. Abogados y despachos: describan su actividad.',
    education: 'Formación académica',
    educationHint: 'Títulos, instituciones y años. Se muestra en su perfil público.',
    saving: 'Guardando…',
    saveProfile: 'Guardar el perfil',
  },

  profilePhoto: {
    replaceYourPhoto: 'Sustituir su foto',
    addAPhoto: 'Añadir una foto',
    hint: 'JPEG, PNG o WebP de hasta 10 MB. Una imagen cuadrada funciona mejor. Su foto se guarda y se muestra de inmediato: nada la revisa.',
    uploading: 'Subiendo…',
    replacePhoto: 'Sustituir la foto',
    uploadPhoto: 'Subir la foto',
    removeConfirm: '¿Quitar su foto de perfil?',
    removing: 'Quitando…',
    removePhoto: 'Quitar la foto',
    privacyNote:
      'Su foto es privada hasta que publique una ficha en el directorio. También la ve un revisor que compruebe sus documentos y cualquiera con quien tenga un caso.',
  },

  pushNotifications: {
    heading: 'Notificaciones del navegador',
    status: {
      checking: 'Comprobando…',
      on: 'Activadas en este navegador',
      off: 'Desactivadas',
      denied: 'Bloqueadas por el navegador',
      unsupported: 'No compatibles aquí',
      unconfigured: 'Sin configurar',
    },
    bodyOn:
      'Las novedades de sus casos, los mensajes nuevos, las urgencias y las solicitudes de reunión llegarán a este dispositivo incluso cuando Legal Dash esté cerrado.',
    bodyDenied:
      'Este navegador ha bloqueado las notificaciones para este sitio. Permítalas en la configuración del sitio del navegador y vuelva a cargar esta página.',
    bodyUnsupported:
      'Este navegador no admite notificaciones push. Los avisos dentro de la aplicación siguen apareciendo en Avisos.',
    bodyUnconfigured:
      'Esta instalación no tiene par de claves VAPID, así que no se pueden ofrecer notificaciones push del navegador. Los avisos dentro de la aplicación siguen apareciendo en Avisos.',
    bodyOff:
      'Active las notificaciones para que se le informe en este dispositivo de las novedades de sus casos, los mensajes nuevos, las urgencias y las solicitudes de reunión.',
    subscriptionOne: '{count} navegador recibe actualmente notificaciones de su cuenta.',
    subscriptionMany: '{count} navegadores reciben actualmente notificaciones de su cuenta.',
    turningOff: 'Desactivando…',
    turnOff: 'Desactivar',
    turnOn: 'Activar las notificaciones',
  },

  notificationButtons: {
    markRead: 'Marcar como leído',
    marking: 'Marcando…',
    markAllRead: 'Marcar todo como leído',
  },

  supportForms: {
    problem: '¿Cuál es el problema?',
    problemHint: 'Una línea, para poder distinguirlo del resto de la cola.',
    problemPlaceholder: 'No puedo subir mi Emirates ID',
    about: '¿Sobre qué es?',
    describe: 'Descríbalo',
    describeHint:
      'Qué estaba haciendo, qué ocurrió y qué esperaba. Soporte ve su cuenta, así que no hace falta que repita sus datos.',
    sendingToSupport: 'Enviando a soporte…',
    sendToSupport: 'Enviar a soporte',
    privacyNote:
      'Soporte llega solo a los administradores de la plataforma. No se muestra a la otra parte de ningún caso.',
    closedTicket: 'Este tique está cerrado.',
    message: 'Mensaje',
    replyPlaceholderAdmin: 'Responder al autor…',
    replyPlaceholder: 'Añadir a este tique…',
    sending: 'Enviando…',
    sendReply: 'Enviar respuesta',
    sendMessage: 'Enviar mensaje',
    solveConfirm:
      '¿Marcar {reference} como resuelto y cerrarlo? Después ninguna de las dos partes podrá escribir en él, y el autor tendrá que crear un tique nuevo si el problema vuelve.',
    closing: 'Cerrando…',
    markSolved: 'Marcar como resuelto y cerrar',
  },

  inquiryForm: {
    subject: 'Asunto',
    subjectPlaceholder: 'p. ej. Asesoramiento sobre un litigio de arrendamiento comercial',
    message: 'Mensaje',
    messageHint: 'Describa brevemente su situación. Al menos 20 caracteres. Esto llega a {name}.',
    sending: 'Enviando…',
    sendInquiry: 'Enviar la consulta',
    privacyNote:
      'Su nombre y la dirección de correo electrónico de su cuenta se comparten con el destinatario para que pueda responder. Su Emirates ID nunca se comparte a través del directorio.',
  },

  inquiryReply: {
    yourReply: 'Su respuesta',
    sending: 'Enviando…',
    sendReply: 'Enviar respuesta',
    markAsRead: 'Marcar como leída',
    close: 'Cerrar',
    closeConfirm: '¿Cerrar esta consulta?',
  },

  officeRequest: {
    confirming: 'Confirmando…',
    willAttend: 'Asistiré',
    sending: 'Enviando…',
    cannotCome: 'No podré ir',
  },
};
