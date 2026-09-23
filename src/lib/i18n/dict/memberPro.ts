import type { Translated } from '../translated';

/**
 * Member Pro — the strings, in English first.
 *
 * English is the source of truth: the Spanish object below is typed against it,
 * so a key that exists here and not there is a build error rather than an
 * English sentence on a Spanish page.
 *
 * This is the professional side of the member area: the directory listing,
 * legal details, verification, the firm roster and oversight, and the emergency
 * desk. Where a phrase already lives in the shared dictionary — `t.common`,
 * `t.items`, `t.badges`, `t.verificationStatus` — the pages reuse it rather than
 * carrying a second copy here.
 */
export const memberProEn = {
  listing: {
    intro:
      'This is what people see when they search the directory. Your practice areas and emirates are what the filters match on, so keep them accurate.',
    noticeUnpublished: 'Your listing has been removed from the public directory. It is still saved.',
    representedTitle: 'You are represented by {firm}',
    representedBefore: 'Your account was created by that firm, so you are shown under ',
    representedAfter:
      ' on the firm’s profile rather than as a separate entry in the directory. This listing is kept as a draft; if you leave the firm it becomes your own and you can publish it.',
    addAddressTitle: 'Add your practice address',
    addAddressBody:
      'Clients check where a professional actually is. Adding a UAE address — and a phone number and email — makes your profile far easier to trust.',
    published: 'Published',
    notPublishedYet: 'Not published yet',
    live: 'Your listing is live in the public directory.',
    viewPublicProfile: 'View your public profile',
    draftBody:
      'Your listing is saved as a private draft. Tick "Publish this listing" below when you are ready for it to appear in the directory.',
    emptyBody:
      'You have not created a listing yet. Fill in the form below and publish it when you are ready.',
    notVerifiedTitle: 'Your account is not verified yet',
    notVerifiedBody:
      'You can publish your listing now, but it will be shown in the directory marked as not verified, and it will appear below verified {type} profiles until a reviewer approves your documents. Verified members show the {badge} badge.',
    takeDownTitle: 'Take my listing down',
    takeDownBody:
      'Removes the listing from the public directory. Nothing is deleted — you can publish it again at any time.',
    takeDownButton: 'Unpublish my listing',

    formNotSavedTitle: 'Your listing was not saved',
    displayName: 'Display name',
    displayNameHintFirm: 'Your firm name as it should appear in the directory.',
    displayNameHint: 'Your name as you wish to be listed.',
    headline: 'Headline',
    headlineHint: 'One line under your name, for example “Criminal defence · your city”.',
    about: 'About',
    aboutHint: 'Appears on your public {type} profile.',
    mainEmirate: 'Main emirate',
    yearsOfExperience: 'Years of experience',
    emiratesCovered: 'Emirates covered',
    emiratesHelp: 'Used by the directory’s emirate filter. Must include your main emirate.',
    areasOfLaw: 'Areas of law',
    areasHelp:
      'Used by the directory’s legal-type filter. Select every area you actually practise.',
    languages: 'Languages',
    languagesHint: 'Separate with commas, for example: Arabic, English, French.',
    languagesDefault: 'Arabic, English',
    contactEmail: 'Contact email',
    contactEmailHint: 'Published. Leave blank to keep your account email private.',
    contactPhone: 'Contact phone',
    practiceAddress: 'Practice address in the UAE',
    practiceAddressHint:
      'Published, so a client can see where you actually are. For example: Office 1204, Sample Tower, 100 Example Street.',
    visibility: 'Visibility',
    acceptingClients: 'I am accepting new clients',
    acceptingClientsHint: 'Uncheck to show visitors that you are not taking new instructions.',
    publishListing: 'Publish this listing in the public directory',
    publishListingHint: 'Leave unchecked to keep it as a private draft only you can see.',
    saveListing: 'Save listing',
    saving: 'Saving…',
  },

  credentials: {
    firmTitle: 'Firm legal registration',
    lawyerTitle: 'Your legal licence',
    firmIntro:
      'A legal firm must be able to show both its own registration and the licence of the legal professional through whom it provides representation.',
    lawyerIntro: 'Your permission to provide legal representation in the United Arab Emirates.',
    checkedTitle: 'These details are checked against your documents',
    checkedBody:
      'A reviewer compares what you enter here with the documents you upload. If the number changes after your account is approved, the badge is withdrawn and the account is reviewed again.',

    licenceNotSavedTitle: 'Your licence details were not saved',
    licenceNumber: 'Licence number',
    licenceNumberHint:
      'The number on your permit or licence to provide legal representation in the UAE.',
    licensingAuthority: 'Licensing authority',
    licensingAuthorityHintLawyer:
      'For example the Legal Dash Affairs Department, or the UAE Ministry of Justice.',
    issuedOn: 'Issued on',
    validUntil: 'Valid until',
    validUntilHint: 'Shown on your public profile once verified.',
    yearsOfExperience: 'Years of experience',
    barAssociationNumber: 'Bar association number',
    licenceUploadNote:
      'You must also upload the licence itself under Documents. Changing the licence number after approval withdraws your verified badge.',
    saveLicence: 'Save licence details',
    saving: 'Saving…',

    firmNotSavedTitle: 'Your firm details were not saved',
    legalName: 'Registered legal name',
    legalNameHint: 'Exactly as it appears on the trade licence.',
    tradeLicenceNumber: 'Trade licence number',
    licensingAuthorityHintFirm:
      'For example a bar association, or the authority that issued the licence.',
    legalStructure: 'Legal structure',
    legalStructureHint: 'For example LLC, Sole Establishment, Civil Company.',
    registeredEmirate: 'Registered emirate',
    notStated: 'Not stated',
    numberOfLawyers: 'Number of lawyers',
    authorisedSignatory: 'Authorised signatory',
    authorisedSignatoryHint: 'The person named on the licence who may act for the firm.',
    registeredAddress: 'Registered address',
    website: 'Website',
    websiteHint: 'Optional. Shown on your public profile once verified.',
    firmUploadNote:
      'You must also upload the trade licence and the licence of the legal professional through whom the firm provides representation. Changing the trade licence number after approval withdraws your verified badge.',
    saveFirm: 'Save firm details',

    bankTitle: 'Bank details for fee requests',
    bankIntro:
      'Shown to a client on a fee request, and printed on the receipt. Nothing here is published in the directory.',
    bankAccountNumberHint: 'Only if the client should use this instead of the IBAN.',
    bankInstructionsHint:
      'Anything the client should quote or know, such as the reference to use.',
  },

  verification: {
    intro:
      'Upload the documents a reviewer needs, then submit. Nothing is verified automatically — a person examines each document and records the decision.',
    currentStatus: 'Current status',
    emiratesIdOnFile: 'Emirates ID on file',
    notProvidedYet: 'Not provided yet',
    requestedTypes: '{present} of {total} requested types',
    requestsSubmitted: 'Requests submitted',
    openRequest: 'Open request',
    roundSubmitted: 'Round {round}, submitted {date}',
    encryptionSubject: 'Identity documents',
    checkDigitTitle: 'About your Emirates ID number',
    notApprovedTitle: 'Why your last request was not approved',
    notApprovedBody:
      'Fix what is described, then submit again. Uploading a replacement document does not require a new account.',
    verifiedTitle: 'Your account is verified',
    verifiedBody:
      'Approved by a reviewer on {date}. Replacing a required document withdraws the badge until it is reviewed again.',
    stillNeeded: 'What is still needed',
    emailConfirmed: 'Email address confirmed',
    profileComplete: 'Profile complete',
    missing: 'Missing: {items}',
    openMyProfile: 'Open my profile',
    firmRegistrationAdded: 'Firm legal registration added',
    legalLicenceAdded: 'Legal licence added',
    openLegalDetails: 'Open legal details',
    requiredDocumentsUploaded: 'Required documents uploaded',
    uploadBelow: 'Upload below',
    yourDocuments: 'Your documents',
    documentsPrivacy:
      'Documents are stored privately. Only you and the reviewer examining your case can open them.',
    withReviewerTitle: 'Your documents are with a reviewer',
    withReviewerBody:
      'Documents cannot be changed while a request is being reviewed. Withdraw the request below if you need to replace something.',
    requestInProgress: 'Request in progress',
    submitForVerification: 'Submit for verification',
    submissionOff:
      'Submitting documents for verification is currently switched off. You can still upload and review your documents, and submit once it is switched back on.',
    history: 'History',
    roundStatus: 'Round {round} · {status}',
    submittedOn: 'Submitted {date}',
    decidedOn: '· decided {date}',
    withdrawnByYou: 'Withdrawn by you.',
    reviewedBy: 'Reviewed by {email}',
    completeSr: ' — complete',
    outstandingSr: ' — outstanding',

    beforeSubmitTitle: 'Before you can submit',
    submitting: 'Submitting…',
    buttonActive: 'The button becomes active once every item above is complete.',
    withdrawConfirm:
      'Withdraw your verification request? You will be able to change your documents, then submit again.',
    withdrawing: 'Withdrawing…',
    withdrawRequest: 'Withdraw request',
    withdrawNote: 'While a request is with a reviewer, your documents cannot be changed.',
  },

  documents: {
    title: 'Upload a document',
    type: 'Document type',
    requiredMark: ' — required',
    optionalMark: ' — optional',
    file: 'File',
    fileHint:
      'PDF, JPEG, PNG or WebP, up to 10 MB. The type is confirmed from the file’s contents, not its name.',
    documentNumber: 'Number on the document',
    documentNumberHint: 'Optional. Helps the reviewer match it.',
    expiryDate: 'Expiry date',
    uploading: 'Uploading…',
    upload: 'Upload document',
    notUploadedTitle: 'The document was not uploaded',

    empty:
      'No documents uploaded yet. Every account must upload an Emirates ID before it can be verified.',
    statusAwaitingReview: 'Waiting to be reviewed',
    statusApproved: 'Accepted',
    statusRejected: 'Not accepted',
    statusSuperseded: 'Replaced',
    view: 'View',
    reviewerSaid: 'Reviewer said: {notes}',
    remove: 'Remove',
    removeConfirm: 'Remove this document? You will need to upload it again.',
    removing: 'Removing…',
  },

  firm: {
    recordTitle: 'Firm record missing',
    recordBody:
      'Your firm registration details could not be loaded. Please add them under Legal details.',
    noLawyersTitle: 'No lawyers registered yet',
    registerProfessional: 'Register a professional',
    lawyersAtThisFirm: 'Lawyers at this firm',
  },

  firmLawyers: {
    wrongAccountBody:
      'This page belongs to legal-firm accounts. If you are a lawyer and want to join a firm, check your invitations.',
    myInvitations: 'My invitations',
    emergencyContactTitle: 'Emergency contact designated',
    emergencyContactBody:
      'Urgent requests that reach your firm are assigned directly to {name}. You can change this under any lawyer below.',
    intro:
      'The professionals who may act for {firm}. Only a lawyer registered here can review and accept a case submitted to the firm.',
    createTitle: 'Create a lawyer account',
    createBody:
      'Use this when you are hiring and want the lawyer on your roster now. The account is created active and affiliated to {firm} immediately, and can be listed in the public directory straight away. You are given a password once to pass on.',
    inviteSummary: 'Or invite an existing lawyer by email',
    inviteBody:
      'Use this when the lawyer already has a Legal Dash account. If they do, the invitation appears in their dashboard to accept. If they do not, you are given a registration link to send them, because this installation cannot send email itself.',
    pendingInvitations: 'Pending invitations ({count})',
    invitedBy: 'Invited {date} by {email}',
    shareLink: 'Share link:',
    registeredLawyers: 'Registered lawyers ({count})',
    noLawyersDescription:
      'Until a lawyer joins, cases submitted to your firm will sit unaccepted, because a firm account cannot accept them itself.',
    unnamedLawyer: 'Unnamed lawyer',
    createdByFirm: 'Account created by your firm',
    joinedByInvitation: 'Joined through an invitation',
    licence: 'Licence',
    authority: 'Authority',
    validUntil: 'Valid until',
    casesWithFirm: 'Cases with the firm',
    firmRegisteredIn: 'Firm registered in {emirate} · trade licence {number}',
  },

  oversight: {
    wrongAccountBefore:
      'This page is for legal-firm administrator accounts. Your own cases are under ',
    wrongAccountAfter: '.',
    intro:
      'Every case {firm} holds, which lawyer is working it, how far each has got, and the firm’s diary. Supervision only — accepting and progressing a case stays with the lawyer who took it.',
    casesInProgress: 'Cases in progress',
    completedCases: 'Completed cases',
    awaitingALawyer: 'Awaiting a lawyer',
    needLawyerTitle: '{count} case(s) still need a lawyer',
    needLawyerBodyBefore:
      'A firm account cannot accept a case — one of your registered lawyers must. They are listed under ',
    needLawyerBodyAfter: '.',
    lawyersCaseload: 'Your lawyers and their caseload',
    noLawyersDescription:
      'Register your professionals so they can take cases submitted to the firm.',
    registerProfessional: 'Register a professional',
    licence: 'Licence',
    validUntilSuffix: ' · valid until {date}',
    open: 'Open',
    completed: 'Completed',
    meetingsAhead: 'Meetings ahead',
    moreOpenCases: '+{count} more open case(s)',
    noOpenCases: 'No open cases right now.',
    firmDiary: 'Firm diary',
    noMeetings: 'No meetings are booked across the firm.',
    withLawyer: '{client} with {lawyer}',
    aLawyer: 'a lawyer',
    diaryNoteBefore: 'A lawyer books into their own diary from ',
    theCalendar: 'the calendar',
    diaryNoteAfter: '. This list is for supervision.',
    allCases: 'All cases at the firm ({count})',
    noCases: 'No cases have been submitted to {firm} yet.',
    reference: 'Reference',
    case: 'Case',
    client: 'Client',
    lawyer: 'Lawyer',
    progress: 'Progress',
    updated: 'Updated',
    caseMeta: '{area} · {files} file(s) · {messages} message(s)',
    assigned: 'assigned {date}',
  },

  emergencyDesk: {
    intro:
      'People asking for urgent legal help appear here, and are pushed to every professional who has opted into emergencies. The first to take one has a case opened and assigned to them. Nothing is dispatched to the police, an ambulance or the fire service — for that, call your local emergency number.',
    professionalSideTitle: 'You are seeing the professional side',
    professionalSideBody:
      'This page shows urgent requests to answer. It is not the form for asking for help: the public emergency page is for people who need a lawyer, and it is open to anyone without an account.',
    openRequests: 'Open urgent requests ({count})',
    noRequestsTitle: 'No open urgent requests',
    noRequestsBody:
      'When somebody raises an emergency, it appears here and is pushed to the professionals who take them.',
    urgent: 'Urgent',
    memberOfPublic: 'A member of the public',
    guestNoAccount: '{name} (no account)',
    callBack: 'Call back: {phone}',
    waitingRoomBody:
      'They are already waiting in a video room. Joining it answers the emergency and records you as the lawyer who took it.',
    joinCall: 'Join the call now',
    raisedUntil: 'Raised {raised} · offered until {expires}',
    noAccount: 'No account',
    availabilityTitle: 'My emergency availability',
    firmAvailabilityBody:
      'A firm account does not take emergency calls itself — one of your lawyers does. Name a lawyer as your firm’s emergency contact and urgent requests that reach {firm} are assigned to them directly.',
    currentContact: 'Current emergency contact:',
    noContact:
      'No emergency contact is designated. Until one is, urgent requests to your firm sit in the queue like any other case.',
    manageInLawyers: 'Manage in Lawyers registered',
    lawyerAvailabilityBody:
      'Turning this on means urgent requests are pushed to you directly, at any hour. Only do so if you can answer.',
    alsoFirmContact: 'You are also your firm’s designated emergency contact.',
    noLawyerProfile: 'Emergency availability is set on a lawyer profile.',
    takenRequests: 'Urgent requests I took ({count})',
    takenOn: '· taken {date}',
  },

  firmForms: {
    lawyerEmail: 'Lawyer’s email address',
    inviting: 'Inviting…',
    registerProfessional: 'Register a professional',
    withdraw: 'Withdraw',
    removeConfirm:
      'Remove {name} from your firm? Their account and any open cases assigned to them are untouched.',
    removeFromFirm: 'Remove from firm',
    removing: 'Removing…',
    joining: 'Joining…',
    acceptAndJoin: 'Accept and join {firm}',
    declining: 'Declining…',
    decline: 'Decline',
    createdTitle: 'Lawyer account created',
    notCreatedTitle: 'The account was not created',
    fullName: 'Full name',
    emailAddress: 'Email address',
    emailHint: 'They will use this to sign in.',
    tempPassword: 'Temporary password',
    tempPasswordHint:
      'At least {min} characters with a letter and a number. Shown once on creation.',
    licenceExpires: 'Licence expires',
    whereAppearsTitle: 'Where this lawyer will appear',
    whereAppearsBefore: 'Under ',
    whereAppearsAfter:
      ' on your firm’s public profile, alongside your other lawyers — not as a separate entry in the directory. Only lawyers who register themselves through the public signup form are listed on their own.',
    creatingAccount: 'Creating account…',
    createLawyerAccount: 'Create lawyer account',
    createLawyerNote:
      'The account is created active and affiliated to your firm immediately. Verification is separate: a reviewer must still examine the lawyer’s own Emirates ID and licence.',
  },
};

export type MemberProDict = Translated<typeof memberProEn>;

export const memberProEs: MemberProDict = {
  listing: {
    intro:
      'Esto es lo que ven los usuarios cuando buscan en el directorio. Los filtros comparan sus áreas del derecho y sus emiratos, así que manténgalos correctos.',
    noticeUnpublished: 'Su ficha se ha retirado del directorio público. Sigue guardada.',
    representedTitle: 'Le representa {firm}',
    representedBefore: 'Esa firma creó su cuenta, así que aparece en ',
    representedAfter:
      ' dentro del perfil del despacho y no como una ficha aparte en el directorio. Esta ficha se conserva como borrador; si deja el despacho, pasa a ser suya y podrá publicarla.',
    addAddressTitle: 'Añada la dirección de su despacho',
    addAddressBody:
      'Los clientes comprueban dónde está realmente un profesional. Añadir una dirección en los EAU, junto con un teléfono y un correo electrónico, hace que su perfil inspire mucha más confianza.',
    published: 'Publicada',
    notPublishedYet: 'Todavía sin publicar',
    live: 'Su ficha ya está publicada en el directorio público.',
    viewPublicProfile: 'Ver su perfil público',
    draftBody:
      'Su ficha está guardada como borrador privado. Marque «Publique esta ficha» abajo cuando quiera que aparezca en el directorio.',
    emptyBody:
      'Todavía no ha creado ninguna ficha. Rellene el formulario de abajo y publíquela cuando esté listo.',
    notVerifiedTitle: 'Su cuenta aún no está verificada',
    notVerifiedBody:
      'Puede publicar su ficha ahora, pero aparecerá en el directorio marcada como no verificada y figurará por debajo de los perfiles de {type} que sí están verificados hasta que un revisor apruebe sus documentos. Los miembros verificados muestran la insignia de {badge}.',
    takeDownTitle: 'Retirar mi ficha',
    takeDownBody:
      'Retira la ficha del directorio público. No se elimina nada: puede volver a publicarla en cualquier momento.',
    takeDownButton: 'Dejar de publicar mi ficha',

    formNotSavedTitle: 'No se guardó su ficha',
    displayName: 'Nombre público',
    displayNameHintFirm: 'El nombre de su despacho tal como debe aparecer en el directorio.',
    displayNameHint: 'Su nombre tal como desea figurar en el directorio.',
    headline: 'Titular',
    headlineHint: 'Una línea bajo su nombre, por ejemplo «Defensa penal · su ciudad».',
    about: 'Sobre usted',
    aboutHint: 'Aparece en su perfil público de {type}.',
    mainEmirate: 'Emirato principal',
    yearsOfExperience: 'Años de experiencia',
    emiratesCovered: 'Emiratos cubiertos',
    emiratesHelp:
      'Lo usa el filtro por emirato del directorio. Debe incluir su emirato principal.',
    areasOfLaw: 'Áreas del derecho',
    areasHelp:
      'Lo usa el filtro por tipo de asunto del directorio. Seleccione todas las áreas que ejerza realmente.',
    languages: 'Idiomas',
    languagesHint: 'Sepárelos con comas, por ejemplo: árabe, inglés, francés.',
    languagesDefault: 'Árabe, inglés',
    contactEmail: 'Correo electrónico de contacto',
    contactEmailHint:
      'Se publica. Déjelo en blanco para mantener privado el correo de su cuenta.',
    contactPhone: 'Teléfono de contacto',
    practiceAddress: 'Dirección del despacho en los EAU',
    practiceAddressHint:
      'Se publica, para que un cliente vea dónde está realmente. Por ejemplo: Oficina 1204, Sample Tower, 100 Example Street.',
    visibility: 'Visibilidad',
    acceptingClients: 'Acepto nuevos clientes',
    acceptingClientsHint:
      'Desmarque esta opción para indicar a los visitantes que no acepta nuevos encargos.',
    publishListing: 'Publique esta ficha en el directorio público',
    publishListingHint:
      'Déjelo sin marcar para mantenerla como borrador privado que solo usted puede ver.',
    saveListing: 'Guardar la ficha',
    saving: 'Guardando…',
  },

  credentials: {
    firmTitle: 'Registro legal del despacho',
    lawyerTitle: 'Su licencia profesional',
    firmIntro:
      'Un despacho de abogados debe poder acreditar tanto su propio registro como la licencia del profesional jurídico a través del cual presta la representación.',
    lawyerIntro:
      'Su autorización para ejercer la representación legal en los Emiratos Árabes Unidos.',
    checkedTitle: 'Estos datos se cotejan con sus documentos',
    checkedBody:
      'Un revisor compara lo que introduce aquí con los documentos que sube. Si el número cambia después de aprobarse su cuenta, se retira la insignia y la cuenta vuelve a revisarse.',

    licenceNotSavedTitle: 'No se guardaron los datos de su licencia',
    licenceNumber: 'Número de licencia',
    licenceNumberHint:
      'El número de su permiso o licencia para ejercer la representación legal en los EAU.',
    licensingAuthority: 'Autoridad otorgante',
    licensingAuthorityHintLawyer:
      'Por ejemplo, un colegio de abogados o la autoridad que expidió la licencia.',
    issuedOn: 'Fecha de expedición',
    validUntil: 'Válida hasta',
    validUntilHint: 'Se muestra en su perfil público una vez verificado.',
    yearsOfExperience: 'Años de experiencia',
    barAssociationNumber: 'Número de colegiación',
    licenceUploadNote:
      'También debe subir la propia licencia en Documentos. Cambiar el número de licencia después de la aprobación retira su insignia de verificación.',
    saveLicence: 'Guardar los datos de la licencia',
    saving: 'Guardando…',

    firmNotSavedTitle: 'No se guardaron los datos de su despacho',
    legalName: 'Denominación social registrada',
    legalNameHint: 'Exactamente como figura en la licencia comercial.',
    tradeLicenceNumber: 'Número de licencia comercial',
    licensingAuthorityHintFirm:
      'Por ejemplo, Dubai Economy and Tourism o una autoridad de zona franca.',
    legalStructure: 'Forma jurídica',
    legalStructureHint: 'Por ejemplo, LLC, establecimiento unipersonal o sociedad civil.',
    registeredEmirate: 'Emirato de registro',
    notStated: 'Sin especificar',
    numberOfLawyers: 'Número de abogados',
    authorisedSignatory: 'Firmante autorizado',
    authorisedSignatoryHint:
      'La persona que figura en la licencia y que puede actuar en nombre del despacho.',
    registeredAddress: 'Domicilio registrado',
    website: 'Sitio web',
    websiteHint: 'Opcional. Se muestra en su perfil público una vez verificado.',
    firmUploadNote:
      'También debe subir la licencia comercial y la licencia del profesional jurídico a través del cual el despacho presta la representación. Cambiar el número de licencia comercial después de la aprobación retira su insignia de verificación.',
    saveFirm: 'Guardar los datos del despacho',

    bankTitle: 'Datos bancarios para solicitudes de honorarios',
    bankIntro:
      'Se muestran al cliente en una solicitud de honorarios y se imprimen en el recibo. Nada de esto se publica en el directorio.',
    bankAccountNumberHint: 'Solo si el cliente debe usarlo en lugar del IBAN.',
    bankInstructionsHint:
      'Cualquier dato que el cliente deba indicar o conocer, como la referencia que debe usar.',
  },

  verification: {
    intro:
      'Suba los documentos que necesita un revisor y envíelos. Nada se verifica de forma automática: una persona examina cada documento y deja constancia de la decisión.',
    currentStatus: 'Estado actual',
    emiratesIdOnFile: 'Emirates ID en el expediente',
    notProvidedYet: 'Aún no facilitado',
    requestedTypes: '{present} de {total} tipos solicitados',
    requestsSubmitted: 'Solicitudes enviadas',
    openRequest: 'Solicitud abierta',
    roundSubmitted: 'Ronda {round}, enviada el {date}',
    encryptionSubject: 'Documentos de identidad',
    checkDigitTitle: 'Sobre su número de Emirates ID',
    notApprovedTitle: 'Por qué no se aprobó su última solicitud',
    notApprovedBody:
      'Corrija lo que se indica y vuelva a enviarla. Subir un documento de sustitución no requiere una cuenta nueva.',
    verifiedTitle: 'Su cuenta está verificada',
    verifiedBody:
      'Aprobada por un revisor el {date}. Sustituir un documento obligatorio retira la insignia hasta que se revise de nuevo.',
    stillNeeded: 'Lo que aún falta',
    emailConfirmed: 'Correo electrónico confirmado',
    profileComplete: 'Perfil completo',
    missing: 'Falta: {items}',
    openMyProfile: 'Abrir mi perfil',
    firmRegistrationAdded: 'Registro legal del despacho añadido',
    legalLicenceAdded: 'Licencia profesional añadida',
    openLegalDetails: 'Abrir los datos profesionales',
    requiredDocumentsUploaded: 'Documentos obligatorios subidos',
    uploadBelow: 'Subir más abajo',
    yourDocuments: 'Sus documentos',
    documentsPrivacy:
      'Los documentos se guardan de forma privada. Solo usted y el revisor que examina su expediente pueden abrirlos.',
    withReviewerTitle: 'Sus documentos están con un revisor',
    withReviewerBody:
      'Los documentos no pueden modificarse mientras se revisa una solicitud. Retire la solicitud de abajo si necesita sustituir algo.',
    requestInProgress: 'Solicitud en curso',
    submitForVerification: 'Enviar para verificación',
    submissionOff:
      'El envío de documentos para verificación está desactivado en este momento. Puede seguir subiendo y revisando sus documentos, y enviarlos cuando se vuelva a activar.',
    history: 'Historial',
    roundStatus: 'Ronda {round} · {status}',
    submittedOn: 'Enviada el {date}',
    decidedOn: '· resuelta el {date}',
    withdrawnByYou: 'Retirada por usted.',
    reviewedBy: 'Revisada por {email}',
    completeSr: ' — completado',
    outstandingSr: ' — pendiente',

    beforeSubmitTitle: 'Antes de poder enviar',
    submitting: 'Enviando…',
    buttonActive: 'El botón se activa cuando se completa cada punto anterior.',
    withdrawConfirm:
      '¿Retirar su solicitud de verificación? Podrá cambiar sus documentos y volver a enviarla.',
    withdrawing: 'Retirando…',
    withdrawRequest: 'Retirar la solicitud',
    withdrawNote: 'Mientras una solicitud está con un revisor, sus documentos no pueden modificarse.',
  },

  documents: {
    title: 'Subir un documento',
    type: 'Tipo de documento',
    requiredMark: ' — obligatorio',
    optionalMark: ' — opcional',
    file: 'Archivo',
    fileHint:
      'PDF, JPEG, PNG o WebP, hasta 10 MB. El tipo se confirma a partir del contenido del archivo, no de su nombre.',
    documentNumber: 'Número que figura en el documento',
    documentNumberHint: 'Opcional. Ayuda al revisor a cotejarlo.',
    expiryDate: 'Fecha de caducidad',
    uploading: 'Subiendo…',
    upload: 'Subir documento',
    notUploadedTitle: 'No se subió el documento',

    empty:
      'Todavía no se ha subido ningún documento. Toda cuenta debe subir un Emirates ID antes de poder verificarse.',
    statusAwaitingReview: 'Pendiente de revisión',
    statusApproved: 'Aceptado',
    statusRejected: 'No aceptado',
    statusSuperseded: 'Sustituido',
    view: 'Ver',
    reviewerSaid: 'El revisor indicó: {notes}',
    remove: 'Quitar',
    removeConfirm: '¿Quitar este documento? Tendrá que volver a subirlo.',
    removing: 'Quitando…',
  },

  firm: {
    recordTitle: 'Falta el registro del despacho',
    recordBody:
      'No se pudieron cargar los datos de registro de su despacho. Añádalos en Datos profesionales.',
    noLawyersTitle: 'Todavía no hay abogados registrados',
    registerProfessional: 'Registrar a un profesional',
    lawyersAtThisFirm: 'Abogados de este despacho',
  },

  firmLawyers: {
    wrongAccountBody:
      'Esta página pertenece a las cuentas de despacho. Si es abogado y quiere incorporarse a un despacho, consulte sus invitaciones.',
    myInvitations: 'Mis invitaciones',
    emergencyContactTitle: 'Contacto de urgencia designado',
    emergencyContactBody:
      'Las solicitudes urgentes que llegan a su despacho se asignan directamente a {name}. Puede cambiarlo en cualquiera de los abogados de abajo.',
    intro:
      'Los profesionales que pueden actuar en nombre de {firm}. Solo un abogado registrado aquí puede revisar y aceptar un caso enviado al despacho.',
    createTitle: 'Crear una cuenta de abogado',
    createBody:
      'Use esto cuando esté contratando y quiera que el abogado figure ya en su plantilla. La cuenta se crea activa y vinculada a {firm} de inmediato, y puede figurar en el directorio público desde ese momento. Se le entrega una contraseña una sola vez para que la transmita.',
    inviteSummary: 'O invitar por correo electrónico a un abogado que ya existe',
    inviteBody:
      'Use esto cuando el abogado ya tenga una cuenta de Legal Dash. Si la tiene, la invitación aparece en su panel para que la acepte. Si no la tiene, se le entrega un enlace de registro para que se lo envíe, porque esta instalación no puede enviar correo por sí misma.',
    pendingInvitations: 'Invitaciones pendientes ({count})',
    invitedBy: 'Invitación enviada el {date} por {email}',
    shareLink: 'Enlace para compartir:',
    registeredLawyers: 'Abogados registrados ({count})',
    noLawyersDescription:
      'Hasta que se incorpore un abogado, los casos enviados a su despacho quedarán sin aceptar, porque una cuenta de despacho no puede aceptarlos por sí misma.',
    unnamedLawyer: 'Abogado sin nombre',
    createdByFirm: 'Cuenta creada por su despacho',
    joinedByInvitation: 'Se incorporó mediante una invitación',
    licence: 'Licencia',
    authority: 'Autoridad',
    validUntil: 'Válida hasta',
    casesWithFirm: 'Casos con el despacho',
    firmRegisteredIn: 'Despacho registrado en {emirate} · licencia comercial {number}',
  },

  oversight: {
    wrongAccountBefore:
      'Esta página es para cuentas de administrador de despacho. Sus propios casos están en ',
    wrongAccountAfter: '.',
    intro:
      'Todos los casos que lleva {firm}, qué abogado trabaja en cada uno, en qué punto está y la agenda del despacho. Solo supervisión: aceptar y hacer avanzar un caso corresponde al abogado que lo asumió.',
    casesInProgress: 'Casos en curso',
    completedCases: 'Casos completados',
    awaitingALawyer: 'Pendiente de abogado',
    needLawyerTitle: '{count} caso(s) aún necesitan un abogado',
    needLawyerBodyBefore:
      'Una cuenta de despacho no puede aceptar un caso: debe hacerlo uno de sus abogados registrados. Figuran en ',
    needLawyerBodyAfter: '.',
    lawyersCaseload: 'Sus abogados y su carga de casos',
    noLawyersDescription:
      'Registre a sus profesionales para que puedan aceptar los casos enviados al despacho.',
    registerProfessional: 'Registrar a un profesional',
    licence: 'Licencia',
    validUntilSuffix: ' · válida hasta {date}',
    open: 'Abiertos',
    completed: 'Completados',
    meetingsAhead: 'Próximas reuniones',
    moreOpenCases: '+{count} caso(s) abiertos más',
    noOpenCases: 'No hay casos abiertos ahora mismo.',
    firmDiary: 'Agenda del despacho',
    noMeetings: 'No hay reuniones reservadas en el despacho.',
    withLawyer: '{client} con {lawyer}',
    aLawyer: 'un abogado',
    diaryNoteBefore: 'Un abogado reserva en su propia agenda desde ',
    theCalendar: 'la agenda',
    diaryNoteAfter: '. Esta lista es para supervisión.',
    allCases: 'Todos los casos del despacho ({count})',
    noCases: 'Todavía no se ha enviado ningún caso a {firm}.',
    reference: 'Referencia',
    case: 'Caso',
    client: 'Cliente',
    lawyer: 'Abogado',
    progress: 'Progreso',
    updated: 'Actualizado',
    caseMeta: '{area} · {files} archivo(s) · {messages} mensaje(s)',
    assigned: 'asignado el {date}',
  },

  emergencyDesk: {
    intro:
      'Aquí aparecen las personas que piden ayuda jurídica urgente, y la solicitud llega a todos los profesionales que atienden urgencias. Al primero que la acepta se le abre y se le asigna un caso. No se avisa a la policía, a una ambulancia ni a los bomberos: para eso, llame al número de emergencias local.',
    professionalSideTitle: 'Está viendo la parte profesional',
    professionalSideBody:
      'Esta página muestra las solicitudes urgentes que hay que atender. No es el formulario para pedir ayuda: la página pública de urgencias es para quienes necesitan un abogado y está abierta a cualquiera sin cuenta.',
    openRequests: 'Solicitudes urgentes abiertas ({count})',
    noRequestsTitle: 'No hay solicitudes urgentes abiertas',
    noRequestsBody:
      'Cuando alguien plantea una urgencia, aparece aquí y llega a los profesionales que las atienden.',
    urgent: 'Urgente',
    memberOfPublic: 'Un miembro del público',
    guestNoAccount: '{name} (sin cuenta)',
    callBack: 'Llamar al: {phone}',
    waitingRoomBody:
      'La persona ya está esperando en una sala de vídeo. Entrar en ella atiende la urgencia y le registra como el abogado que la asumió.',
    joinCall: 'Entrar en la llamada ahora',
    raisedUntil: 'Planteada el {raised} · disponible hasta el {expires}',
    noAccount: 'Sin cuenta',
    availabilityTitle: 'Mi disponibilidad para urgencias',
    firmAvailabilityBody:
      'Una cuenta de despacho no atiende llamadas de urgencia por sí misma: lo hace uno de sus abogados. Designe a un abogado como contacto de urgencia de su despacho y las solicitudes urgentes que lleguen a {firm} se le asignarán directamente.',
    currentContact: 'Contacto de urgencia actual:',
    noContact:
      'No hay ningún contacto de urgencia designado. Hasta que lo haya, las solicitudes urgentes dirigidas a su despacho quedan en la cola como cualquier otro caso.',
    manageInLawyers: 'Gestionar en Abogados registrados',
    lawyerAvailabilityBody:
      'Activar esto hace que las solicitudes urgentes le lleguen directamente, a cualquier hora. Actívelo solo si puede atenderlas.',
    alsoFirmContact: 'También es el contacto de urgencia designado de su despacho.',
    noLawyerProfile: 'La disponibilidad para urgencias se configura en el perfil de abogado.',
    takenRequests: 'Solicitudes urgentes que he asumido ({count})',
    takenOn: '· asumida el {date}',
  },

  firmForms: {
    lawyerEmail: 'Correo electrónico del abogado',
    inviting: 'Invitando…',
    registerProfessional: 'Registrar a un profesional',
    withdraw: 'Retirar',
    removeConfirm:
      '¿Quitar a {name} de su despacho? Su cuenta y los casos abiertos que tenga asignados no se modifican.',
    removeFromFirm: 'Quitar del despacho',
    removing: 'Quitando…',
    joining: 'Incorporándose…',
    acceptAndJoin: 'Aceptar e incorporarse a {firm}',
    declining: 'Rechazando…',
    decline: 'Rechazar',
    createdTitle: 'Cuenta de abogado creada',
    notCreatedTitle: 'No se creó la cuenta',
    fullName: 'Nombre completo',
    emailAddress: 'Correo electrónico',
    emailHint: 'Lo usará para iniciar sesión.',
    tempPassword: 'Contraseña temporal',
    tempPasswordHint:
      'Al menos {min} caracteres, con una letra y un número. Se muestra una sola vez al crearla.',
    licenceExpires: 'Caducidad de la licencia',
    whereAppearsTitle: 'Dónde aparecerá este abogado',
    whereAppearsBefore: 'En ',
    whereAppearsAfter:
      ' dentro del perfil público de su despacho, junto a sus demás abogados, y no como una ficha aparte en el directorio. Solo los abogados que se registran por sí mismos a través del formulario público de registro aparecen con ficha propia.',
    creatingAccount: 'Creando la cuenta…',
    createLawyerAccount: 'Crear cuenta de abogado',
    createLawyerNote:
      'La cuenta se crea activa y vinculada a su despacho de inmediato. La verificación es aparte: un revisor debe examinar igualmente el Emirates ID y la licencia del propio abogado.',
  },
};
