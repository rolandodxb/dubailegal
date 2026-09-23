import type { Translated } from '../translated';

/**
 * Member Cases — the strings, in English first.
 *
 * English is the source of truth: the Spanish object below is typed against it,
 * so a key that exists here and not there is a build error rather than an
 * English sentence on a Spanish page.
 *
 * This is the heaviest corner of the member area: the cases, the diary, the
 * video rooms, the fees and the reviews. The client components among them
 * (`CaseChat`, `ConferenceRoom`, `PaymentBubble`, the forms) cannot await the
 * dictionary, so the server pages hand them the words as a `labels` prop.
 */
export const memberCasesEn = {
  /**
   * The ways a meeting can happen, as the diary and the booking form name them.
   *
   * The vocabulary that describes stored codes — case states, practice areas,
   * emirates, account types, fee reasons — is not repeated here: it lives once
   * in `t.labels` and is read through the helpers in `lib/i18n/labels.ts`.
   */
  appointmentMode: {
    VIDEO_CALL: 'Video call',
    OFFICE_VISIT: 'Office visit',
    PHONE_CALL: 'Phone call',
  },

  /** The accessible name of the trail back to where a page was reached from. */
  breadcrumb: 'Breadcrumb',

  /** Asking the professional on a case for a call now. */
  urgentCall: {
    opening: 'Opening the room…',
    ask: 'Ask {name} for an urgent call',
    body: 'Opens a conference room and alerts them. If they cannot answer, send a message in the case instead — nothing is left waiting silently.',
  },

  /** The list of cases, and the meetings waiting on the same page. */
  cases: {
    title: 'My cases',
    intro:
      'Every case you have sent through the directory, with its current status. Open one to read the description you sent, share files and message the professional.',
    meetingsAndRequests: 'Meetings and requests',
    withProfessional: 'With {name}',
    caseReference: ' · case {reference}',
    atTheOffice: 'At the office: {address}',
    addressNotGiven: 'address not given',
    videoCall: 'Video call',
    phoneCall: 'Phone call',
    cancelled: 'Cancelled',
    awaitingYourAnswer: 'Awaiting your answer',
    youDeclined: 'You declined',
    youConfirmed: 'You confirmed',
    joinConferenceRoom: 'Join the conference room',
    officeRequest:
      '{name} has asked you to come to the office. Let them know whether you can attend.',
    submittedHeading: 'Cases I submitted ({count})',
    emptyDescription:
      'Find a lawyer or legal firm in the directory, open their profile and choose “Get in touch” to send your first case.',
    sentToMe: 'Cases sent to me',
    noCasesSent: 'No cases have been sent to you yet.',
    pendingWillList: 'will list them as they arrive.',
  },

  /** One case, as a card in a list. */
  caseCard: {
    notYetAssigned: 'Not yet assigned',
    newMessage: '{count} new message',
    newMessages: '{count} new messages',
    with: 'With',
    client: 'Client',
    submitted: 'Submitted',
    lastActivity: 'Last activity',
    noMessagesYet: 'No messages yet',
    oneMessage: '{count} message',
    manyMessages: '{count} messages',
    openCase: 'Open case',
  },

  /** The lawyer's controls on a case. */
  caseActions: {
    releasing: 'Releasing…',
    releaseConfirm: 'Release this case to every lawyer registered with your firm?',
    acceptAndSend: 'Accept and send to our lawyers',
    releaseBody:
      'Every registered lawyer is offered it. The first to take it is assigned, and the rest are stood down automatically.',
    opening: 'Opening…',
    reviewCase: 'Review the case',
    reviewBody:
      'Opening the case tells the client it is under review. It does not commit you to taking it.',
    taking: 'Taking…',
    accepting: 'Accepting…',
    takeCase: 'Take this case',
    acceptCase: 'Accept the case',
    takeBody: 'Taking it assigns the case to you and stands the other offers down.',
    acceptBody: 'Accepting assigns the case to you and tells the client it has been assigned.',
    passSummary: 'Pass — let a colleague take it',
    noteForFirm: 'Note for the firm',
    passHint: 'Optional. The client is not told you passed.',
    passing: 'Passing…',
    passOnCase: 'Pass on this case',
    updating: 'Updating…',
    markStarted: 'Mark work as started',
    markCompletedConfirm: 'Mark this case as completed?',
    markCompleted: 'Mark case completed',
    declineSummary: 'Decline this case',
    reason: 'Reason',
    declineHint: 'The client sees this. Be specific so they know what to do next.',
    declining: 'Declining…',
    declineAndTell: 'Decline and tell the client why',
  },

  /** The conversation inside a case. */
  caseChat: {
    headerSubtitle: 'Case conversation · private to the two parties on this case',
    encrypted: 'Messages and files are encrypted',
    loadingEarlier: 'Loading earlier messages…',
    scrollUp: 'Scroll up for earlier messages',
    startOfCase: 'This is the start of the case.',
    empty:
      'No messages yet. Anything you write here is visible to the other party on this case.',
    member: 'Member',
    file: 'FILE',
    closedFallback: 'The conversation is closed on this case.',
    removeFile: 'Remove {name}',
    attachFiles: 'Attach files',
    attachFilesTitle: 'Attach files — documents, images, spreadsheets or archives',
    message: 'Message',
    placeholder: 'Write a message…',
    sending: 'Sending…',
    send: 'Send',
    composerHint:
      'Enter posts the message, Shift + Enter starts a new line. Attach up to 5 files — documents, images, spreadsheets and archives up to 25 MB each.',
  },

  /** A fee, shown in the conversation. */
  feeBubble: {
    requestedBy: 'Requested by {name} · {date}',
    paidBy: 'Paid by',
    paidOn: 'Paid on',
    receipt: 'Receipt',
    viewReceipt: 'View or print the receipt',
    bankTransfer: 'Bank transfer',
    card: 'Card',
    simulated:
      'Simulated payment. Legal Dash has no payment provider connected: no card is charged and no money moves.',
    payByTransferTo: 'Pay by bank transfer to',
    payByTransfer: 'Pay {amount} by transfer',
    recordTransferNote:
      'Record the transfer and a receipt is issued. Card payment is being developed.',
    sendProof: 'Send the proof of payment',
    proofBody:
      'Payment is complete. Attach the receipt, transfer advice or screenshot so it sits in the case file with the fee.',
    proofLabel: 'Proof of payment',
    proofHint: 'PDF, JPEG, PNG or WebP.',
    sending: 'Sending…',
    noteLabel: 'Note',
    notePlaceholder: 'Anything the professional should know about this payment',
    sendProofButton: 'Send proof of payment',
    proofAttached: 'Proof of payment attached',
    waitingForProofClient: 'Waiting for you to send the proof of payment.',
    waitingForProofProfessional: 'The client has been asked for proof of payment.',
    withdrawConfirm: 'Withdraw this fee request?',
    withdrawRequest: 'Withdraw request',
    paymentPending: 'Payment pending',
    paymentCompleted: 'Payment completed',
    withdrawn: 'Withdrawn',
    /** The fee card calls a catch-all reason simply “Fee”. */
    reasonOther: 'Fee',
  },

  /** Raising a fee against a case. */
  feeRequest: {
    summary: 'Request a fee',
    notSent: 'The request was not sent',
    paidByBankTransferTo: 'Paid by bank transfer to',
    addBankFirst: 'Add your bank details first',
    addBankBodyBefore:
      'A client cannot pay a fee with nowhere to send it. Add your account name, bank and IBAN on the ',
    addBankBodyAfter: ' page, then raise the fee.',
    amountLabel: 'Amount (AED)',
    amountHint: 'Whole dirhams or fils, for example 750 or 750.50.',
    whatFor: 'What for',
    details: 'Details',
    detailsHint: 'What the fee covers, so the client knows what they are paying for.',
    simulated:
      'This is a simulated payment. Legal Dash has no payment provider connected, so no card is charged and no money moves — the request records what is owed and the client records that they paid.',
    sending: 'Sending…',
    sendRequest: 'Send fee request',
  },

  /** Sending a case for the first time. */
  newCase: {
    switchedOff: 'Sending new cases is switched off',
    switchedOffBody:
      'An administrator has temporarily disabled case submission. Existing cases continue as normal.',
    backTo: '← Back to {name}',
    title: 'Get in touch about a case',
    intro:
      'Describe the matter and attach anything relevant. It is sent to {name} as a request to review, and you can follow its progress and message them directly once they open it.',
    unreviewedWarning:
      'This member’s documents have not been reviewed yet. You can still send a case, but confirm their licence with the relevant authority before instructing them.',
  },

  /** The case submission form itself. */
  caseForm: {
    notSent: 'The case was not sent',
    caseName: 'Case name',
    caseNameHint:
      'A short name you will recognise, for example “Commercial lease dispute — Deira office”.',
    caseType: 'Case type',
    caseDescription: 'Case description',
    caseDescriptionHint: 'Explain what has happened and what you need. {name} reads this first.',
    attachments: 'Attachments',
    attachmentsHint:
      'Contracts, letters, notices, photographs. PDF, JPEG, PNG or WebP, up to {count} files of 10 MB each.',
    sending: 'Sending your case…',
    send: 'Send case for review',
    statusFlowStart: 'Your case starts as ',
    statusFlowMid: '. When the professional opens it you will see ',
    statusFlowEnd: ', and once they accept it, ',
  },

  /** One case in full. */
  caseDetail: {
    backToMyCases: '← Back to my cases',
    backToMyDashboard: '← Back to my dashboard',
    submittedOn: 'submitted {date}',
    noticeSubmitted: 'Your case has been sent. It is now Submitted and awaiting review.',
    noticeUnderReview: 'The lawyer has opened your case. It is now Under review.',
    noticeAssigned: 'The case has been accepted and assigned.',
    noticeDeclined: 'The case was declined. The reason is shown below.',
    noticeInProgress: 'Work on this case has started.',
    noticeCompleted: 'This case has been marked complete.',
    declinedTitle: 'Why this case was declined',
    firmAcceptTitle: 'One of your lawyers must accept this case',
    firmAcceptBodyBefore:
      'This case is addressed to your firm. Only a registered lawyer can review and accept it — invite your lawyers from ',
    firmAcceptBodyAfter: '.',
    urgentOpenClient: 'Your urgent call is open',
    urgentOpenProfessional: 'Your client is asking for a call',
    urgentBodyClient:
      'The room is open and the professional has been alerted. Join it and wait a moment — they may take a call before this one.',
    urgentBodyProfessional:
      'The client asked for an urgent call about this case and is waiting in the room. Joining answers it.',
    joinCallNow: 'Join the call now',
    caseDescription: 'Case description',
    casePapers: 'Case papers',
    attachments: 'Attachments ({count})',
    noFiles: 'No files were attached.',
    uploaded: 'uploaded {date}',
    messages: 'Messages',
    canMessage: 'Both sides of this case can read and post here.',
    cannotMessage: 'You can read this conversation but not post to it.',
    declinedConversationClosed: 'This case was declined, so the conversation is closed.',
    cannotPost: 'You cannot post in this case.',
    offeredHeading: 'Offered to the firm’s lawyers ({count})',
    offerNotAnswered: 'Not answered yet',
    offerAccepted: 'accepted',
    offerPassed: 'passed',
    offerWithdrawn: 'withdrawn',
    feesHeading: 'Fees on this case',
    /**
     * How the fee list writes a reason beside the amount. Lower-cased and
     * without the word “fee”, which is why it is not the `labels.paymentPurpose`
     * wording the fee pages use.
     */
    purposeLower: {
      CONSULTATION: 'consultation',
      CASE_ASSISTANCE: 'case assistance',
      COURT_FEES: 'court fees',
      OTHER: 'other',
    },
    paid: 'paid',
    paidByCard: 'paid by card',
    paidByTransfer: 'paid by transfer',
    withdrawn: 'withdrawn',
    awaitingPayment: 'awaiting payment',
    receipt: 'Receipt',
    noFees: 'No fees have been requested on this case.',
    history: 'History',
    system: 'System',
    yourActions: 'Your actions',
    yourProfessional: 'Your professional',
    client: 'Client',
    registeredWith: 'Registered with {name}',
    licence: 'Licence',
    sentToFirm: 'Sent to {name}. A lawyer from the firm will review and accept it.',
    noProfessional: 'No professional is assigned yet.',
    residentIn: 'Resident in {country}',
    assignedLawyer: 'Assigned lawyer',
    firm: 'Firm',
    reviewed: 'Reviewed',
    assigned: 'Assigned',
    notYetAssigned: 'Not yet assigned',
    noneNamedLawyer: 'None — sent to a named lawyer',
    notYet: 'Not yet',
    talkNow: 'Talk to your lawyer now',
    talkNowBody:
      'Ask for an urgent call and you go straight into a conference room while {name} is alerted. Meetings they schedule are booked from their diary.',
    allRooms: 'All my conference rooms',
    bookMeeting: 'Book a meeting',
    bookMeetingBody:
      'Your lawyer schedules meetings from their diary. You are alerted here as soon as one is booked with you.',
    seeMeetings: 'See my meetings and rooms',
  },

  /** The diary. */
  calendar: {
    title: 'Calendar',
    weekdays: {
      mon: 'Mon',
      tue: 'Tue',
      wed: 'Wed',
      thu: 'Thu',
      fri: 'Fri',
      sat: 'Sat',
      sun: 'Sun',
    },
    views: { month: 'Month', week: 'Week', day: 'Day' },
    noDiaryFirm:
      'A diary belongs to a lawyer profile. Your firm has no lawyer registered yet, so there is nothing to schedule here.',
    noDiarySolo:
      'A diary belongs to a lawyer profile. This account does not have one, so there is nothing to schedule here.',
    noDiaryFirmTail: 'Register a lawyer and their diary appears on this calendar.',
    noDiarySoloTail: 'Meetings are booked by the lawyers registered with your firm.',
    manageLawyers: 'Manage lawyers registered',
    backToDashboard: 'Back to my dashboard',
    introFirm:
      'Every diary held by your firm’s lawyers, in UAE time. You can move, cancel or delete any of these meetings — the client is told about everything except a deletion.',
    introSolo:
      'Your diary in UAE time. Pick a day, choose a free hour and register the booking — the client is alerted straight away. You can also move, cancel or delete a meeting you already have.',
    viewGroupLabel: 'Calendar view',
    previous: '← Previous',
    today: 'Today',
    next: 'Next →',
    weekOf: 'Week of {date}',
    more: '+{count} more',
    free: 'Free',
    availabilityByLawyer: 'Availability by lawyer',
    slots: 'Slots',
    lawyer: 'Lawyer',
    freeCount: '{count} free',
    booked: 'Booked · {name}',
    available: 'Available',
    workingHours: 'Working hours {from}:00–{to}:00 UAE time.',
    bookingsOnDay: 'Bookings on this day',
    nothingBooked: 'Nothing booked yet.',
    withLawyer: 'with {name}',
    yourLawyer: 'your lawyer',
    noCaseLinked: ' · no case linked',
    cancelledSuffix: ' · cancelled',
    awaitingClient: ' · awaiting the client’s answer',
    clientDeclinedTravel: ' · client declined to travel',
    registerBooking: 'Register a booking',
    slotsAvailable: '{date} · {free} of {total} slots available.',
    slotsTaken: ' {count} already booked.',
    bookingOff:
      'Booking new meetings is currently switched off. Meetings already booked are unaffected.',
    firmCannotBook:
      'A booking is made by the lawyer whose diary it goes into, so a firm account does not register meetings on a lawyer’s behalf. Its lawyers book their own from their own accounts; you can still move, cancel or delete what they have arranged.',
  },

  /** Registering a booking in the diary. */
  booking: {
    noClients:
      'You have no clients with an accepted case yet. A meeting can be booked once you have accepted a case.',
    noFreeSlots: 'Every slot on this day is taken. Choose another day in the calendar.',
    availableTime: 'Available time',
    meetingLength: 'Meeting length {minutes} minutes. Times are UAE time.',
    howMeet: 'How will you meet?',
    modeHint:
      'A video call opens a conference room. An office visit is a request the client has to accept, because they have to travel.',
    modeVideoCallHint: 'Conference room',
    modeOfficeVisitHint: 'Client must accept',
    modePhoneCallHint: 'No room needed',
    officeAddress: 'Office address',
    officeAddressHint:
      'Required for an office visit — this is what the client is asked to come to.',
    officeAddressPlaceholder: 'Office 1204, Sample Tower, 100 Example Street',
    client: 'Client',
    clientHint: 'Only clients with an accepted case can be booked with.',
    chooseClient: 'Choose a client…',
    clientCases: '{name} ({count} case)',
    clientCasesPlural: '{name} ({count} cases)',
    aboutWhichCase: 'About which case',
    aboutWhichCaseHint: 'Optional. Defaults to the client’s most recent case.',
    mostRecentCase: 'Most recent case',
    agenda: 'Agenda',
    agendaPlaceholder: 'What will be discussed?',
    booking: 'Booking…',
    registerBooking: 'Register booking',
    alerted: 'The client is alerted immediately that they are expected to attend.',
  },

  /** Cancelling, moving, deleting and ending a meeting or a call. */
  appointment: {
    cancelConfirm: 'Cancel this meeting? The other party will be told.',
    cancelling: 'Cancelling…',
    cancelMeeting: 'Cancel meeting',
    changeTime: 'Change the time',
    newDate: 'New date',
    hourUae: 'Hour (UAE)',
    happensBy: 'Happens by',
    officeAddress: 'Office address',
    officeAddressHint:
      'The client is asked to accept the new time, because they have to travel.',
    rescheduleNote:
      'If the meeting is a video call, a conference room is created or kept. The client is told the new time either way.',
    moving: 'Moving…',
    saveNewTime: 'Save the new time',
    deleteConfirm:
      'Delete this meeting? The client will NOT be told — use Cancel instead if you want them alerted.',
    deleting: 'Deleting…',
    deleteMeeting: 'Delete meeting',
    deleteNote:
      'Deleting removes it and tells the client nothing. Cancel instead if they should be alerted.',
    roomClosed: ' The room is closed.',
    backToRooms: 'Back to my rooms',
    endCallConfirm: 'End this call? The room closes and the other person is told.',
    ending: 'Ending…',
    endCall: 'End this call',
  },

  /** Conference rooms: the list. */
  rooms: {
    title: 'Conference rooms',
    professionalIntro:
      'Rooms that are open on your cases: meetings that have not finished, and urgent calls a client has asked you for. Join one and the other person is told you have arrived.',
    noRoomsOpen: 'No rooms are open',
    noRoomsOpenBody:
      'A video meeting you book, or an urgent call a client asks for from their case, appears here with a link to join.',
    openCalendar: 'Open the calendar',
    theClient: 'The client',
    urgentRequested: 'Urgent call requested',
    scheduledMeeting: 'Scheduled meeting',
    noCaseLinked: 'No case linked',
    asked: 'Asked {date}',
    withSuffix: ' · with ',
    yourFirm: 'your firm',
    joinRoom: 'Join the room',
    openCase: 'Open the case',
    clientIntro:
      'The professional handling each of your cases, and a room to talk in. Ask for an urgent call and you go straight into the room while they are alerted.',
    noProfessionalOnCase: 'No case has a professional on it yet',
    noProfessionalOnCaseBody:
      'A conference room opens once a lawyer or firm has accepted your case. Until then, everything about the case is on its own page.',
    theProfessional: 'the professional',
    inProgress: 'In progress',
    assigned: 'Assigned',
    yourLawyer: 'Your lawyer',
    handlingFirm: 'Handling firm',
    yourLawyerOnCase: 'Your lawyer on this case',
    registeredWith: '{name} · registered with {firm}',
    urgentStillOpen:
      'You asked for an urgent call about this case and the room is still open.',
    joinRoomNow: 'Join the room now',
    meetingsBooked: 'Meetings booked',
    emergencyTitle: 'If this is a real emergency',
    emergencyBodyBefore:
      'Call your local emergency number. Legal Dash connects you to a lawyer and cannot send police, an ambulance or the fire service. For an emergency with no account at all, use the ',
    emergencyBodyAfter: '.',
    publicEmergencyPage: 'public emergency page',
  },

  /** Conference rooms: one room. */
  roomPage: {
    backToMyCases: '← Back to my cases',
    emergencyCall: 'Emergency call',
    conferenceRoom: 'Conference room',
    yourUrgentCallWith: 'Your urgent call with',
    yourMeetingWith: 'Your meeting with',
    scheduledFor: ', scheduled for {date}',
    answeringEmergency: 'You are answering an emergency',
    personNeedingHelp: 'A person needing urgent help',
    raisedThis: ' raised this',
    aboutTitle: 'about “{title}”',
    answeringBody: '. Joining the room records you as the lawyer who answered.',
    notDueYet: 'This meeting is not due yet',
    notDueBody:
      'It is scheduled for {date}. You can join the room early — it stays open — but the other person may not be there yet.',
    endThisCall: 'End this call',
    finishUp: 'Finish up',
    endCallBody:
      'Leaving the room keeps it open so the other person can join. Ending the call closes it for both of you and tells them it is over — press this if the call was a mistake, or once you have said what you needed to.',
    recordingsHeading: 'Recordings of this call ({count})',
    noRecordings:
      'Nothing has been recorded in this room yet. A call is recorded from the moment either person joins, and the recording is saved when they leave.',
    yourRecording: 'your recording',
    theirRecording: 'their recording',
    seconds: '{count} seconds',
    privateEncryptedTitle: 'Private and encrypted.',
    privateEncryptedBody:
      ' These recordings are encrypted on disk, available to the two people on the call and to nobody else. An administrator cannot play them. They are deleted with the meeting they belong to.',
    beforeYouStart: 'Before you start',
    allowMedia: 'Allow camera and microphone access when the browser asks.',
    directCall: 'The call is direct between the two of you; nothing is recorded.',
    connectionFails:
      'If the connection fails, your network is likely blocking a direct link. Use the backup room below, or continue in the case chat.',
    openCaseChat: 'Open the case chat',
    myMeetings: 'My meetings',
  },

  /** The video room itself, passed to `ConferenceRoom` as its labels. */
  conference: {
    urgentCall: 'Urgent call',
    secureAddressTitle: 'The camera needs a secure address',
    secureAddressBody:
      'This page was opened over http://, and browsers only allow the camera and microphone over https:// or on localhost. Open the same room at the https:// address for this machine — the certificate warning is expected once, and after accepting it the call works normally.',
    callCouldNotStart: 'The call could not start',
    networkError:
      'The call could not be established on this network. A direct connection needs both sides to allow it; a relay (TURN) server is required on restrictive networks.',
    insecureError:
      'This page cannot use the camera or microphone because it was opened over an insecure address. Browsers only allow them over https:// or on localhost. Open the site at its https:// address — the one that names this machine — and the call will work.',
    blockedError:
      'The browser blocked access to your camera and microphone. Allow them for this site, then try again.',
    notFoundError:
      'No camera or microphone was found on this device. You can still follow the case in the chat.',
    startFailedError: 'Your camera and microphone could not be started.',
    connectingTo: 'Connecting to {name}…',
    callEnded: 'The call has ended.',
    inRoomJoin: '{name} is in the room — join the call to see them.',
    nobodyElse: 'Nobody else is in the room yet.',
    yourProfessional: 'Your professional',
    yourClient: 'Your client',
    canJoin: '{who} can join from the same meeting link.',
    joinCall: 'Join the call',
    unmute: 'Unmute',
    mute: 'Mute',
    cameraOn: 'Camera on',
    cameraOff: 'Camera off',
    leave: 'Leave',
    meetingDetails: 'Meeting details',
    with: 'With',
    scheduled: 'Scheduled',
    roomCode: 'Room code',
    inRoomNow: 'In the room now',
    otherPersonOne: '1 other person',
    otherPeople: '{count} other people',
    onlyYou: 'Only you',
    directNote:
      'The call is made directly between the two of you; the video does not pass through Legal Dash. On a restrictive network a direct connection may not be possible without a relay server.',
    openBackupRoom: 'Open the backup video room',
    ifNoConnect: ' if this one will not connect.',
  },

  /** The recording panel inside the room. */
  recorder: {
    recordingThisCall: 'Recording this call',
    savingRecording: 'Saving the recording',
    recording: 'Recording',
    bothSides:
      'both sides are recording, and both recordings are kept private to the two of you',
    uploading: 'Uploading the recording, encrypted.',
    startsWithCall: 'Recording starts with the call.',
    joinAndRecorded: 'Join the call and it is recorded from the moment you are connected.',
    stop: 'Stop recording',
    privateEncryptedTitle: 'Private and encrypted.',
    privateEncryptedBody:
      ' Recordings are stored encrypted, available to you and to the other person on the call, and to nobody else. An administrator of this platform cannot play them. They are deleted with the meeting or the emergency request they belong to.',
    waiting: 'Waiting…',
    cameraOff: 'Camera off',
  },

  /** Fees and receipts: the list. */
  fees: {
    title: 'Fees and receipts',
    intro:
      'Every fee raised on a case you are part of. Paying one issues a receipt you can print or save; the receipt carries the professional’s letterhead, with the Legal Dash mark on it either way.',
    yourReceiptLayout: 'Your receipt layout',
    customLayout: 'Your own letterhead is used on the receipts you raise.',
    standardLayout: 'The standard Legal Dash layout is used on the receipts you raise.',
    changeLayout: 'Change the layout',
    waitingOne: '1 fee waiting for you',
    waitingMany: '{count} fees waiting for you',
    waitingBody:
      'Open the case to pay by card. A receipt is issued as soon as the payment is confirmed.',
    noFees: 'No fees yet',
    noFeesProfessional:
      'Raise a fee from inside a case you have accepted; it appears here with its receipt.',
    noFeesClient:
      'When a professional asks you for a fee, it appears here and inside the case conversation.',
    openMyPortfolio: 'Open my portfolio',
    openMyCases: 'Open my cases',
    raised: 'Raised {date}',
    receiptRef: ' · receipt {number}',
    paidBy: ' · paid by {name}',
    receipt: 'Receipt',
    payAmount: 'Pay {amount}',
    openCase: 'Open the case',
    issuedOne:
      '1 receipt issued. Payments on this installation are simulated: no card is charged and no money moves.',
    issuedMany:
      '{count} receipts issued. Payments on this installation are simulated: no card is charged and no money moves.',
    feeFallback: 'Fee',
    statusRequested: 'Payment pending',
    statusPaid: 'Payment completed',
    statusCancelled: 'Withdrawn',
  },

  /** Paying a fee. */
  pay: {
    backToCase: '← Back to case {reference}',
    withdrawnTitle: 'This fee was withdrawn',
    withdrawnBody:
      'The professional withdrew this request on case {reference}, so there is nothing to pay.',
    backToCaseButton: 'Back to the case',
    title: 'Pay a fee',
    forCase: 'For case {reference} — {title}',
    payableTo: 'Payable to {name}. Fees on this installation are settled by bank transfer.',
  },

  /** The bank transfer form. */
  bankTransfer: {
    forCase: 'For case {reference}',
    howPay: 'How would you like to pay?',
    bankTransfer: 'Bank transfer',
    bankTransferBody:
      'Send the amount to the account below, then record it here with the reference your bank gives you.',
    card: 'Card',
    cardBody:
      'Not available yet. Choosing it tells you what is happening rather than showing a form that cannot work.',
    cardTitle: 'Card payment is being developed',
    cardAlertBefore:
      'Card payment is being developed and will be ready soon. Until then a fee is paid by bank transfer — choose ',
    cardAlertBold: 'Bank transfer',
    cardAlertAfter: ' above and the account details are on this page.',
    transferTo: 'Transfer to',
    referenceToQuote: 'Reference to quote',
    sendFirstTitle: 'Send the transfer from your own bank first',
    sendFirstBody:
      'This page does not move money. Make the transfer in your banking app, then come back and record it here — the professional is told, a receipt is issued, and you are asked for the proof of payment.',
    transferReference: 'Transfer reference',
    transferReferenceHint: 'The reference your bank gave you, or the one you quoted.',
    note: 'Note',
    notePlaceholder: 'Anything the professional should know about this payment',
    recording: 'Recording…',
    sent: 'I have sent the transfer',
    confirming:
      'Confirming issues a receipt you can print or save as a PDF, and returns you to the case conversation.',
    payByTransferInstead: 'Pay by bank transfer instead',
  },

  /** The receipt for a paid fee. */
  receipt: {
    backToCase: '← Back to case {reference}',
    paymentComplete: 'Payment complete',
    paymentCompleteClient:
      'The payment is recorded and the professional has been told. Download or print the receipt below, then send your proof of payment so it is in the case file too.',
    paymentCompleteProfessional: 'The client has completed the payment for this fee.',
    notPaid: 'This fee has not been paid',
    notPaidBodyWithdrawn:
      'There is no receipt to print, because this request is withdrawn.',
    notPaidBodyPending:
      'There is no receipt to print, because this request is still awaiting payment.',
    notIssued: 'Not issued',
    receipt: 'Receipt',
    amountPaid: 'Amount paid',
    status: 'Status',
    paid: 'Paid',
    withdrawn: 'Withdrawn',
    awaitingPayment: 'Awaiting payment',
    reason: 'Reason',
    details: 'Details',
    paidTo: 'Paid to',
    lawyer: 'Lawyer',
    firm: 'Firm',
    contact: 'Contact',
    paidBy: 'Paid by',
    method: 'Method',
    paidOn: 'Paid on',
    case: 'Case',
    licenceDetail: '{name} · licence {number} ({authority})',
    firmDetail: '{name} · trade licence {number}',
    bankTransfer: 'Bank transfer',
    notRecorded: 'Not recorded',
    notPaidDetail: 'Not paid',
    issuedThrough: 'Issued through Legal Dash · receipt {number}',
    simulatedTitle: 'Simulated payment.',
    simulatedBody:
      ' Legal Dash has no payment provider connected. No card was charged and no money moved between these parties; this receipt records what the client and the professional agreed and confirmed inside the application. It is not a tax invoice.',
  },

  /** The print and return buttons under a receipt. */
  receiptActions: {
    download: 'Download receipt as PDF',
    backToCase: 'Back to the case',
    saved: 'Receipt saved. Returning to the case conversation…',
    hint: 'Receipt {number}. Choosing “Save as PDF” in the print dialog downloads it.',
  },

  /** Choosing what a receipt carries. */
  receiptTemplate: {
    title: 'Receipt layout',
    intro:
      'Every fee you raise produces a receipt the client can print. Choose whether it carries the standard Legal Dash layout or a letterhead of your own. Your account starts on the standard layout, and you can change your mind at any time.',
    whatIsOn: 'What is on every receipt',
    whatIsOnBody:
      'Whichever layout you choose, a receipt always carries these. They are facts about a payment, not decoration.',
    amount: 'Amount',
    amountDetail: 'In dirhams, from the fee you raised',
    reason: 'Reason',
    reasonDetail: 'What the fee was for, and your description of it',
    paidBy: 'Paid by',
    paidByDetail: 'The client, and the card used — never the full number',
    receiptNumber: 'Receipt number',
    receiptNumberDetail: 'Unique, and quoted if the payment is ever queried',
    case: 'Case',
    caseDetail: 'The reference and title the fee belongs to',
    mark: 'Legal Dash mark',
    markDetail: 'Always present, on either layout',
    whereAppears: 'Where this appears',
    whereAppearsBody:
      'The receipt a client sees after paying a fee, and the copy they print or save as a PDF. Administrators use the standard layout and cannot change it — the platform mark is theirs by definition.',
    issuedReceipts: 'Receipts I have issued',
    accountSecurity: 'Account and security',
    onStandard: 'You are on the standard layout',
    onStandardBody:
      'That is a complete, correct receipt and nothing is missing from it. A custom letterhead is for practices that already have their own branding.',
    myPractice: 'My practice',
  },

  /** The letterhead chooser. */
  receiptLayout: {
    standardTitle: 'Standard layout',
    standardBody: 'The Legal Dash receipt. Nothing to fill in, and nothing that can be wrong.',
    providedByPlatform: 'Provided by the platform',
    whichLayout: 'Which layout should your receipts use?',
    optionStandardTitle: 'The standard Legal Dash layout',
    optionStandardBody:
      'Carries the Legal Dash mark, the amount, the reason, the case and the card used. Recommended unless you have your own letterhead.',
    optionCustomTitle: 'My own letterhead',
    optionCustomBody:
      'Your name, your mark and your colour, with the Legal Dash mark kept at the foot of the receipt.',
    yourLetterhead: 'Your letterhead',
    yourLetterheadBody:
      'Only used when the layout above is your own. Leave the mark empty to keep the Legal Dash one.',
    nameOnReceipt: 'Name on the receipt',
    nameOnReceiptHint: 'Defaults to {name} when left empty.',
    strapline: 'Strapline',
    straplineHint: 'For example: Advocates and legal consultants.',
    accentColour: 'Accent colour',
    accentColourHint: 'A hex colour, used for the rules and headings.',
    yourMark: 'Your mark',
    yourMarkHint:
      'PNG, JPEG or WebP, up to 5 MB. Shown in place of the Legal Dash mark at the head of the receipt. SVG is not accepted: an uploaded SVG can run script in the browser.',
    removeMark: 'Remove the mark I uploaded',
    footerNote: 'Footer note',
    footerNoteHint: 'Terms, a thank-you, or who to contact about the receipt.',
    whatShows: 'What the receipt shows',
    showLicence: 'My licence number and authority',
    showFirm: 'My firm and its trade licence',
    showContact: 'My contact details',
    saving: 'Saving…',
    saveLayout: 'Save my receipt layout',
    backToStandard: 'Back to the standard layout',
    backToStandardBody:
      'Removes your letterhead and any mark you uploaded. Receipts you have already issued are not changed — they keep the layout they were issued with.',
    resetConfirm:
      'Go back to the standard Legal Dash layout and remove your uploaded mark?',
    resetting: 'Resetting…',
    useStandard: 'Use the standard layout',
    seeReceipts: 'See the receipts already issued',
  },

  /** Reviews: the page. */
  reviews: {
    published: 'Your review has been published.',
    title: 'Reviews',
    intro:
      'A review can only be written by the client on a case that professional actually accepted, and each case carries one review. That is what makes the rating worth reading.',
    switchedOff: 'Reviews are switched off',
    switchedOffBody:
      'An administrator has disabled reviews. Existing reviews are hidden while it is off.',
    whatClientsSay: 'What clients say about you ({count})',
    noReceived: 'When a client reviews a case you accepted, it appears here.',
    aClient: 'A client',
    hiddenByAdmin: 'Hidden by an administrator',
    caseRef: 'Case {reference} · {title}',
    reason: ' · reason: {reason}',
    leaveReview: 'Leave a review',
    noUnreviewedBefore: 'You have no unreviewed case with that professional. ',
    seeAllReviewable: 'See all the cases you can review',
    professional: 'Professional',
    reviewsIWrote: 'Reviews I wrote ({count})',
    hidden: 'Hidden',
    hiddenReason: ': {reason}',
    publishedBadge: 'Published',
    caseArea: 'Case {reference} · {title} · {area} · {date}',
  },

  /** Reviews: the section shown on a professional's profile. */
  reviewSection: {
    title: 'Reviews',
    count: '({count} review)',
    countPlural: '({count} reviews)',
    switchedOff: 'Reviews are currently switched off by the administrators of this installation.',
    selfProfile: 'This is your own profile, so you cannot review yourself.',
    signInToReview:
      'Sign in to leave a review of {name}. Reviews can only be written by a client whose case this professional accepted.',
    writeReviewOf: 'Write a review of {name}',
    chooseCase:
      'Choose a case you had with them and give it a rating from one to five stars.',
    cannotYet: 'You cannot review yet',
    cannotYetBody:
      'A review can only be written against a case this professional accepted, and each case can be reviewed once. You have no unreviewed accepted case with {name} yet.',
    cannotYetTail: 'Once they accept a case of yours, the review form appears here.',
    noReviewsFor: 'No reviews yet for {name}.',
    member: 'A Legal Dash member',
    aboutCase: 'About case {reference} · {area}',
  },

  /** Reviews: the form. */
  reviewForm: {
    ratingPoor: 'Poor',
    ratingBelow: 'Below expectations',
    ratingAcceptable: 'Acceptable',
    ratingGood: 'Good',
    ratingExcellent: 'Excellent',
    notPublished: 'Your review was not published',
    empty:
      'You can leave a review once a professional has accepted a case of yours. Reviews are tied to a real engagement, so there is nothing to review yet.',
    whichCase: 'Which case is this about?',
    whichCaseHint: 'Only cases a professional accepted appear here.',
    chooseCase: 'Choose a case…',
    yourRating: 'Your rating',
    headline: 'Headline',
    headlinePlaceholder: 'e.g. Clear advice and quick to respond',
    yourReview: 'Your review',
    yourReviewHint: 'Describe your experience. At least 20 characters.',
    publishing: 'Publishing…',
    publish: 'Publish review',
    footnote:
      'Your review is published under your name with your verification badge. It is tied to the case you choose, and an administrator can hide it if it breaks the rules.',
  },

  /** Stars and the numbers beside them. */
  starRating: {
    outOfFive: '{value} out of 5',
    count: '({count} review)',
    countPlural: '({count} reviews)',
    breakdownEmpty:
      'No reviews yet. A review can only be written by a client whose case this professional accepted.',
    reviewCount: '{count} review',
    reviewCountPlural: '{count} reviews',
    star: '{count} star',
  },

  /** The shared enquiry pool. */
  enquiries: {
    title: 'Enquiry pool',
    intro:
      'General enquiries sent by members of the public who do not have an account. Every registered lawyer and firm sees the same pool; claiming one takes it out and makes it yours to answer.',
    notCasesTitle: 'These are enquiries, not cases',
    notCasesBody:
      'An enquiry has no documents, no conversation and no record, which is why the form tells people an account is the better route. When you contact somebody, suggest they create one — then the work can be run properly as a case.',
    openInPool: 'Open in the pool ({count})',
    poolEmpty: 'The pool is empty',
    poolEmptyBody:
      'General enquiries from the public appear here. Nobody has asked anything yet.',
    claimedHeading: 'Enquiries I claimed ({count})',
    claimed: '{name} · claimed {date}',
    closed: ' · closed',
  },

  /** Claiming and closing an enquiry. */
  enquiryForms: {
    claiming: 'Claiming…',
    claimConfirm: 'Claim this enquiry? It leaves the pool and becomes yours to answer.',
    claim: 'Claim this enquiry',
    closeConfirm: 'Close this enquiry?',
    markDone: 'Mark as done',
    emailThem: 'Email them',
    call: 'Call {phone}',
  },
};

export type MemberCasesDict = Translated<typeof memberCasesEn>;

export const memberCasesEs: MemberCasesDict = {
  appointmentMode: {
    VIDEO_CALL: 'Videollamada',
    OFFICE_VISIT: 'Visita al despacho',
    PHONE_CALL: 'Llamada telefónica',
  },

  breadcrumb: 'Ruta de navegación',

  urgentCall: {
    opening: 'Abriendo la sala…',
    ask: 'Pedir a {name} una llamada urgente',
    body: 'Abre una sala de conferencia y les avisa. Si no pueden responder, envíe mejor un mensaje en el caso: nada queda esperando en silencio.',
  },

  cases: {
    title: 'Mis casos',
    intro:
      'Todos los casos que ha enviado a través del directorio, con su estado actual. Abra uno para leer la descripción que envió, compartir archivos y escribir al profesional.',
    meetingsAndRequests: 'Reuniones y solicitudes',
    withProfessional: 'Con {name}',
    caseReference: ' · caso {reference}',
    atTheOffice: 'En el despacho: {address}',
    addressNotGiven: 'dirección no indicada',
    videoCall: 'Videollamada',
    phoneCall: 'Llamada telefónica',
    cancelled: 'Cancelada',
    awaitingYourAnswer: 'Esperando su respuesta',
    youDeclined: 'Ha rechazado',
    youConfirmed: 'Ha confirmado',
    joinConferenceRoom: 'Entrar en la sala de conferencia',
    officeRequest:
      '{name} le ha pedido que acuda al despacho. Indíquele si puede asistir.',
    submittedHeading: 'Casos que he enviado ({count})',
    emptyDescription:
      'Encuentre un abogado o un despacho en el directorio, abra su perfil y elija «Contactar» para enviar su primer caso.',
    sentToMe: 'Casos que me han enviado',
    noCasesSent: 'Todavía no le han enviado ningún caso.',
    pendingWillList: 'los irá listando a medida que lleguen.',
  },

  caseCard: {
    notYetAssigned: 'Aún sin asignar',
    newMessage: '{count} mensaje nuevo',
    newMessages: '{count} mensajes nuevos',
    with: 'Con',
    client: 'Cliente',
    submitted: 'Enviado',
    lastActivity: 'Última actividad',
    noMessagesYet: 'Todavía sin mensajes',
    oneMessage: '{count} mensaje',
    manyMessages: '{count} mensajes',
    openCase: 'Abrir el caso',
  },

  caseActions: {
    releasing: 'Liberando…',
    releaseConfirm: '¿Liberar este caso para todos los abogados registrados en su despacho?',
    acceptAndSend: 'Aceptar y enviar a nuestros abogados',
    releaseBody:
      'Se ofrece a todos los abogados registrados. El primero que lo tome queda asignado y los demás quedan descartados automáticamente.',
    opening: 'Abriendo…',
    reviewCase: 'Revisar el caso',
    reviewBody:
      'Abrir el caso indica al cliente que está en revisión. No le compromete a aceptarlo.',
    taking: 'Tomando…',
    accepting: 'Aceptando…',
    takeCase: 'Tomar este caso',
    acceptCase: 'Aceptar el caso',
    takeBody: 'Si lo toma, el caso se le asigna y las demás ofertas quedan descartadas.',
    acceptBody: 'Si lo acepta, el caso se le asigna y se avisa al cliente de que ha sido asignado.',
    passSummary: 'Pasar — dejar que lo tome un colega',
    noteForFirm: 'Nota para el despacho',
    passHint: 'Opcional. No se informa al cliente de que ha pasado.',
    passing: 'Pasando…',
    passOnCase: 'Pasar de este caso',
    updating: 'Actualizando…',
    markStarted: 'Marcar el trabajo como iniciado',
    markCompletedConfirm: '¿Marcar este caso como completado?',
    markCompleted: 'Marcar el caso como completado',
    declineSummary: 'Rechazar este caso',
    reason: 'Motivo',
    declineHint: 'El cliente lo verá. Sea concreto para que sepa qué hacer a continuación.',
    declining: 'Rechazando…',
    declineAndTell: 'Rechazar e indicar el motivo al cliente',
  },

  caseChat: {
    headerSubtitle: 'Conversación del caso · privada para las dos partes de este caso',
    encrypted: 'Los mensajes y los archivos están cifrados',
    loadingEarlier: 'Cargando mensajes anteriores…',
    scrollUp: 'Desplace hacia arriba para ver mensajes anteriores',
    startOfCase: 'Este es el inicio del caso.',
    empty:
      'Todavía no hay mensajes. Todo lo que escriba aquí lo verá la otra parte de este caso.',
    member: 'Miembro',
    file: 'ARCHIVO',
    closedFallback: 'La conversación de este caso está cerrada.',
    removeFile: 'Eliminar {name}',
    attachFiles: 'Adjuntar archivos',
    attachFilesTitle: 'Adjuntar archivos — documentos, imágenes, hojas de cálculo o comprimidos',
    message: 'Mensaje',
    placeholder: 'Escriba un mensaje…',
    sending: 'Enviando…',
    send: 'Enviar',
    composerHint:
      'Intro publica el mensaje; Mayús + Intro empieza una línea nueva. Adjunte hasta 5 archivos — documentos, imágenes, hojas de cálculo y comprimidos de hasta 25 MB cada uno.',
  },

  feeBubble: {
    requestedBy: 'Solicitado por {name} · {date}',
    paidBy: 'Pagado por',
    paidOn: 'Pagado el',
    receipt: 'Recibo',
    viewReceipt: 'Ver o imprimir el recibo',
    bankTransfer: 'Transferencia bancaria',
    card: 'Tarjeta',
    simulated:
      'Pago simulado. Legal Dash no tiene ninguna pasarela de pago conectada: no se cobra ninguna tarjeta ni se mueve dinero.',
    payByTransferTo: 'Pague por transferencia bancaria a',
    payByTransfer: 'Pagar {amount} por transferencia',
    recordTransferNote:
      'Registre la transferencia y se emitirá un recibo. El pago con tarjeta está en desarrollo.',
    sendProof: 'Enviar el justificante de pago',
    proofBody:
      'El pago está completo. Adjunte el recibo, el resguardo de la transferencia o una captura para que quede en el expediente del caso junto con el honorario.',
    proofLabel: 'Justificante de pago',
    proofHint: 'PDF, JPEG, PNG o WebP.',
    sending: 'Enviando…',
    noteLabel: 'Nota',
    notePlaceholder: 'Cualquier cosa que el profesional deba saber sobre este pago',
    sendProofButton: 'Enviar el justificante de pago',
    proofAttached: 'Justificante de pago adjunto',
    waitingForProofClient: 'Esperando a que envíe el justificante de pago.',
    waitingForProofProfessional: 'Se ha pedido al cliente el justificante de pago.',
    withdrawConfirm: '¿Retirar esta solicitud de honorarios?',
    withdrawRequest: 'Retirar la solicitud',
    paymentPending: 'Pago pendiente',
    paymentCompleted: 'Pago completado',
    withdrawn: 'Retirado',
    reasonOther: 'Honorario',
  },

  feeRequest: {
    summary: 'Solicitar honorarios',
    notSent: 'La solicitud no se envió',
    paidByBankTransferTo: 'Pago por transferencia bancaria a',
    addBankFirst: 'Añada primero sus datos bancarios',
    addBankBodyBefore:
      'Un cliente no puede pagar unos honorarios si no hay dónde enviarlos. Añada el nombre de su cuenta, su banco y su IBAN en la página ',
    addBankBodyAfter: ' y después solicite los honorarios.',
    amountLabel: 'Importe (AED)',
    amountHint: 'Dírhams enteros o fils, por ejemplo 750 o 750,50.',
    whatFor: 'Concepto',
    details: 'Detalles',
    detailsHint: 'Qué cubren los honorarios, para que el cliente sepa qué está pagando.',
    simulated:
      'Este es un pago simulado. Legal Dash no tiene ninguna pasarela de pago conectada, así que no se cobra ninguna tarjeta ni se mueve dinero: la solicitud registra lo que se debe y el cliente registra que ha pagado.',
    sending: 'Enviando…',
    sendRequest: 'Enviar solicitud de honorarios',
  },

  newCase: {
    switchedOff: 'El envío de casos nuevos está desactivado',
    switchedOffBody:
      'Un administrador ha desactivado temporalmente el envío de casos. Los casos existentes continúan con normalidad.',
    backTo: '← Volver a {name}',
    title: 'Contactar sobre un caso',
    intro:
      'Describa el asunto y adjunte todo lo que sea relevante. Se envía a {name} como una solicitud para que la revise, y podrá seguir su avance y escribirle directamente en cuanto la abra.',
    unreviewedWarning:
      'Los documentos de este miembro aún no se han revisado. Puede enviar un caso igualmente, pero confirme su licencia con la autoridad correspondiente antes de contratarle.',
  },

  caseForm: {
    notSent: 'El caso no se envió',
    caseName: 'Nombre del caso',
    caseNameHint:
      'Un nombre corto que reconozca, por ejemplo «Disputa por arrendamiento comercial — oficina de Deira».',
    caseType: 'Tipo de caso',
    caseDescription: 'Descripción del caso',
    caseDescriptionHint: 'Explique qué ha ocurrido y qué necesita. {name} leerá esto primero.',
    attachments: 'Adjuntos',
    attachmentsHint:
      'Contratos, cartas, notificaciones, fotografías. PDF, JPEG, PNG o WebP, hasta {count} archivos de 10 MB cada uno.',
    sending: 'Enviando su caso…',
    send: 'Enviar el caso para revisión',
    statusFlowStart: 'Su caso empieza como ',
    statusFlowMid: '. Cuando el profesional lo abra verá ',
    statusFlowEnd: ', y una vez que lo acepte, ',
  },

  caseDetail: {
    backToMyCases: '← Volver a mis casos',
    backToMyDashboard: '← Volver a mi panel',
    submittedOn: 'enviado {date}',
    noticeSubmitted: 'Su caso se ha enviado. Ahora está Enviado y pendiente de revisión.',
    noticeUnderReview: 'El abogado ha abierto su caso. Ahora está En revisión.',
    noticeAssigned: 'El caso ha sido aceptado y asignado.',
    noticeDeclined: 'El caso fue rechazado. El motivo se muestra a continuación.',
    noticeInProgress: 'El trabajo en este caso ha comenzado.',
    noticeCompleted: 'Este caso se ha marcado como completado.',
    declinedTitle: 'Por qué se rechazó este caso',
    firmAcceptTitle: 'Uno de sus abogados debe aceptar este caso',
    firmAcceptBodyBefore:
      'Este caso va dirigido a su despacho. Solo un abogado registrado puede revisarlo y aceptarlo: invite a sus abogados desde ',
    firmAcceptBodyAfter: '.',
    urgentOpenClient: 'Su llamada urgente está abierta',
    urgentOpenProfessional: 'Su cliente pide una llamada',
    urgentBodyClient:
      'La sala está abierta y se ha avisado al profesional. Entre y espere un momento: puede que atienda otra llamada antes que esta.',
    urgentBodyProfessional:
      'El cliente ha pedido una llamada urgente sobre este caso y está esperando en la sala. Si entra, la atiende.',
    joinCallNow: 'Entrar en la llamada ahora',
    caseDescription: 'Descripción del caso',
    casePapers: 'Documentos del caso',
    attachments: 'Adjuntos ({count})',
    noFiles: 'No se adjuntó ningún archivo.',
    uploaded: 'subido {date}',
    messages: 'Mensajes',
    canMessage: 'Ambas partes de este caso pueden leer y publicar aquí.',
    cannotMessage: 'Puede leer esta conversación, pero no publicar en ella.',
    declinedConversationClosed: 'Este caso fue rechazado, así que la conversación está cerrada.',
    cannotPost: 'No puede publicar en este caso.',
    offeredHeading: 'Ofrecido a los abogados del despacho ({count})',
    offerNotAnswered: 'Aún sin responder',
    offerAccepted: 'aceptado',
    offerPassed: 'rechazado',
    offerWithdrawn: 'retirado',
    feesHeading: 'Honorarios de este caso',
    purposeLower: {
      CONSULTATION: 'consulta',
      CASE_ASSISTANCE: 'asistencia en el caso',
      COURT_FEES: 'tasas judiciales',
      OTHER: 'otros',
    },
    paid: 'pagado',
    paidByCard: 'pagado con tarjeta',
    paidByTransfer: 'pagado por transferencia',
    withdrawn: 'retirado',
    awaitingPayment: 'pendiente de pago',
    receipt: 'Recibo',
    noFees: 'No se han solicitado honorarios en este caso.',
    history: 'Historial',
    system: 'Sistema',
    yourActions: 'Sus acciones',
    yourProfessional: 'Su profesional',
    client: 'Cliente',
    registeredWith: 'Registrado en {name}',
    licence: 'Licencia',
    sentToFirm: 'Enviado a {name}. Un abogado del despacho lo revisará y lo aceptará.',
    noProfessional: 'Aún no hay ningún profesional asignado.',
    residentIn: 'Residente en {country}',
    assignedLawyer: 'Abogado asignado',
    firm: 'Despacho',
    reviewed: 'Revisado',
    assigned: 'Asignado',
    notYetAssigned: 'Aún sin asignar',
    noneNamedLawyer: 'Ninguno — enviado a un abogado concreto',
    notYet: 'Aún no',
    talkNow: 'Hable con su abogado ahora',
    talkNowBody:
      'Pida una llamada urgente y entrará directamente en una sala de conferencia mientras se avisa a {name}. Las reuniones que programe se reservan desde su agenda.',
    allRooms: 'Todas mis salas de conferencia',
    bookMeeting: 'Reservar una reunión',
    bookMeetingBody:
      'Su abogado programa las reuniones desde su agenda. Aquí se le avisa en cuanto se reserve una con usted.',
    seeMeetings: 'Ver mis reuniones y salas',
  },

  calendar: {
    title: 'Agenda',
    weekdays: {
      mon: 'Lun',
      tue: 'Mar',
      wed: 'Mié',
      thu: 'Jue',
      fri: 'Vie',
      sat: 'Sáb',
      sun: 'Dom',
    },
    views: { month: 'Mes', week: 'Semana', day: 'Día' },
    noDiaryFirm:
      'Una agenda pertenece a un perfil de abogado. Su despacho aún no tiene ningún abogado registrado, así que no hay nada que programar aquí.',
    noDiarySolo:
      'Una agenda pertenece a un perfil de abogado. Esta cuenta no tiene uno, así que no hay nada que programar aquí.',
    noDiaryFirmTail: 'Registre a un abogado y su agenda aparecerá en este calendario.',
    noDiarySoloTail: 'Las reuniones las reservan los abogados registrados en su despacho.',
    manageLawyers: 'Gestionar los abogados registrados',
    backToDashboard: 'Volver a mi panel',
    introFirm:
      'Todas las agendas de los abogados de su despacho, en hora de los EAU. Puede mover, cancelar o eliminar cualquiera de estas reuniones: se informa al cliente de todo excepto de una eliminación.',
    introSolo:
      'Su agenda en hora de los EAU. Elija un día, escoja una hora libre y registre la reserva: se avisa al cliente de inmediato. También puede mover, cancelar o eliminar una reunión que ya tenga.',
    viewGroupLabel: 'Vista del calendario',
    previous: '← Anterior',
    today: 'Hoy',
    next: 'Siguiente →',
    weekOf: 'Semana del {date}',
    more: '+{count} más',
    free: 'Libre',
    availabilityByLawyer: 'Disponibilidad por abogado',
    slots: 'Franjas',
    lawyer: 'Abogado',
    freeCount: '{count} libres',
    booked: 'Reservada · {name}',
    available: 'Disponible',
    workingHours: 'Horario de trabajo {from}:00–{to}:00, hora de los EAU.',
    bookingsOnDay: 'Reservas de este día',
    nothingBooked: 'Todavía no hay nada reservado.',
    withLawyer: 'con {name}',
    yourLawyer: 'su abogado',
    noCaseLinked: ' · sin caso vinculado',
    cancelledSuffix: ' · cancelada',
    awaitingClient: ' · esperando la respuesta del cliente',
    clientDeclinedTravel: ' · el cliente ha rechazado desplazarse',
    registerBooking: 'Registrar una reserva',
    slotsAvailable: '{date} · {free} de {total} franjas disponibles.',
    slotsTaken: ' {count} ya reservadas.',
    bookingOff:
      'La reserva de reuniones nuevas está desactivada. Las reuniones ya reservadas no se ven afectadas.',
    firmCannotBook:
      'La reserva la hace el abogado en cuya agenda entra, así que una cuenta de despacho no registra reuniones en nombre de un abogado. Sus abogados reservan las suyas desde sus propias cuentas; usted puede seguir moviendo, cancelando o eliminando lo que hayan organizado.',
  },

  booking: {
    noClients:
      'Todavía no tiene clientes con un caso aceptado. Podrá reservar una reunión en cuanto haya aceptado un caso.',
    noFreeSlots: 'Todas las franjas de este día están ocupadas. Elija otro día en el calendario.',
    availableTime: 'Hora disponible',
    meetingLength: 'Duración de la reunión: {minutes} minutos. Las horas son de los EAU.',
    howMeet: '¿Cómo se reunirán?',
    modeHint:
      'Una videollamada abre una sala de conferencia. Una visita al despacho es una solicitud que el cliente debe aceptar, porque tiene que desplazarse.',
    modeVideoCallHint: 'Sala de conferencia',
    modeOfficeVisitHint: 'El cliente debe aceptar',
    modePhoneCallHint: 'No hace falta sala',
    officeAddress: 'Dirección del despacho',
    officeAddressHint:
      'Obligatoria para una visita al despacho: es el lugar al que se pide al cliente que acuda.',
    officeAddressPlaceholder: 'Oficina 1204, Sample Tower, Sheikh Zayed Road, Dubái',
    client: 'Cliente',
    clientHint: 'Solo se puede reservar con clientes que tengan un caso aceptado.',
    chooseClient: 'Elija un cliente…',
    clientCases: '{name} ({count} caso)',
    clientCasesPlural: '{name} ({count} casos)',
    aboutWhichCase: 'Sobre qué caso',
    aboutWhichCaseHint: 'Opcional. Por defecto, el caso más reciente del cliente.',
    mostRecentCase: 'Caso más reciente',
    agenda: 'Orden del día',
    agendaPlaceholder: '¿Qué se tratará?',
    booking: 'Reservando…',
    registerBooking: 'Registrar la reserva',
    alerted: 'Se avisa al cliente de inmediato de que debe asistir.',
  },

  appointment: {
    cancelConfirm: '¿Cancelar esta reunión? Se avisará a la otra parte.',
    cancelling: 'Cancelando…',
    cancelMeeting: 'Cancelar la reunión',
    changeTime: 'Cambiar la hora',
    newDate: 'Nueva fecha',
    hourUae: 'Hora (EAU)',
    happensBy: 'Se celebra por',
    officeAddress: 'Dirección del despacho',
    officeAddressHint: 'Se pide al cliente que acepte la nueva hora, porque tiene que desplazarse.',
    rescheduleNote:
      'Si la reunión es una videollamada, se crea o se mantiene una sala de conferencia. Se informa al cliente de la nueva hora en cualquier caso.',
    moving: 'Moviendo…',
    saveNewTime: 'Guardar la nueva hora',
    deleteConfirm:
      '¿Eliminar esta reunión? NO se avisará al cliente: use Cancelar si quiere avisarle.',
    deleting: 'Eliminando…',
    deleteMeeting: 'Eliminar la reunión',
    deleteNote:
      'Eliminarla la quita y no informa al cliente de nada. Cancele en su lugar si debe avisarle.',
    roomClosed: ' La sala está cerrada.',
    backToRooms: 'Volver a mis salas',
    endCallConfirm: '¿Terminar esta llamada? La sala se cierra y se avisa a la otra persona.',
    ending: 'Terminando…',
    endCall: 'Terminar esta llamada',
  },

  rooms: {
    title: 'Salas de conferencia',
    professionalIntro:
      'Salas abiertas en sus casos: reuniones que no han terminado y llamadas urgentes que le ha pedido un cliente. Entre en una y se avisa a la otra persona de que ha llegado.',
    noRoomsOpen: 'No hay salas abiertas',
    noRoomsOpenBody:
      'Una videollamada que reserve, o una llamada urgente que pida un cliente desde su caso, aparecerá aquí con un enlace para entrar.',
    openCalendar: 'Abrir la agenda',
    theClient: 'El cliente',
    urgentRequested: 'Llamada urgente solicitada',
    scheduledMeeting: 'Reunión programada',
    noCaseLinked: 'Sin caso vinculado',
    asked: 'Solicitada {date}',
    withSuffix: ' · con ',
    yourFirm: 'su despacho',
    joinRoom: 'Entrar en la sala',
    openCase: 'Abrir el caso',
    clientIntro:
      'El profesional que lleva cada uno de sus casos y una sala para conversar. Pida una llamada urgente y entrará directamente en la sala mientras se le avisa.',
    noProfessionalOnCase: 'Ningún caso tiene todavía un profesional asignado',
    noProfessionalOnCaseBody:
      'Una sala de conferencia se abre cuando un abogado o un despacho ha aceptado su caso. Hasta entonces, todo lo relativo al caso está en su propia página.',
    theProfessional: 'el profesional',
    inProgress: 'En curso',
    assigned: 'Asignado',
    yourLawyer: 'Su abogado',
    handlingFirm: 'Despacho responsable',
    yourLawyerOnCase: 'Su abogado en este caso',
    registeredWith: '{name} · registrado en {firm}',
    urgentStillOpen: 'Pidió una llamada urgente sobre este caso y la sala sigue abierta.',
    joinRoomNow: 'Entrar en la sala ahora',
    meetingsBooked: 'Reuniones reservadas',
    emergencyTitle: 'Si esto es una urgencia real',
    emergencyBodyBefore:
      'Llame al número de emergencias local. Legal Dash le conecta con un abogado y no puede enviar a la policía, una ambulancia ni los bomberos. Para una urgencia sin cuenta alguna, use la ',
    emergencyBodyAfter: '.',
    publicEmergencyPage: 'página pública de urgencias',
  },

  roomPage: {
    backToMyCases: '← Volver a mis casos',
    emergencyCall: 'Llamada de urgencia',
    conferenceRoom: 'Sala de conferencia',
    yourUrgentCallWith: 'Su llamada urgente con',
    yourMeetingWith: 'Su reunión con',
    scheduledFor: ', programada para {date}',
    answeringEmergency: 'Está atendiendo una urgencia',
    personNeedingHelp: 'Una persona que necesita ayuda urgente',
    raisedThis: ' ha planteado esto',
    aboutTitle: 'sobre «{title}»',
    answeringBody: '. Al entrar en la sala queda registrado como el abogado que respondió.',
    notDueYet: 'Esta reunión aún no toca',
    notDueBody:
      'Está programada para {date}. Puede entrar en la sala antes de tiempo —permanece abierta—, pero puede que la otra persona aún no esté.',
    endThisCall: 'Terminar esta llamada',
    finishUp: 'Terminar',
    endCallBody:
      'Salir de la sala la mantiene abierta para que la otra persona pueda entrar. Terminar la llamada la cierra para ambos y les avisa de que ha terminado: pulse esto si la llamada fue un error o cuando ya haya dicho lo que necesitaba.',
    recordingsHeading: 'Grabaciones de esta llamada ({count})',
    noRecordings:
      'Todavía no se ha grabado nada en esta sala. Una llamada se graba desde el momento en que entra cualquiera de las dos personas, y la grabación se guarda cuando sale.',
    yourRecording: 'su grabación',
    theirRecording: 'la de la otra parte',
    seconds: '{count} segundos',
    privateEncryptedTitle: 'Privado y cifrado.',
    privateEncryptedBody:
      ' Estas grabaciones están cifradas en disco, están disponibles para las dos personas de la llamada y para nadie más. Un administrador no puede reproducirlas. Se eliminan con la reunión a la que pertenecen.',
    beforeYouStart: 'Antes de empezar',
    allowMedia: 'Permita el acceso a la cámara y al micrófono cuando el navegador lo solicite.',
    directCall: 'La llamada es directa entre ustedes dos; no se graba nada.',
    connectionFails:
      'Si la conexión falla, es probable que su red esté bloqueando un enlace directo. Use la sala de respaldo de abajo o continúe en el chat del caso.',
    openCaseChat: 'Abrir el chat del caso',
    myMeetings: 'Mis reuniones',
  },

  conference: {
    urgentCall: 'Llamada urgente',
    secureAddressTitle: 'La cámara necesita una dirección segura',
    secureAddressBody:
      'Esta página se abrió por http://, y los navegadores solo permiten la cámara y el micrófono por https:// o en localhost. Abra la misma sala en la dirección https:// de esta máquina: el aviso de certificado aparecerá una vez y, tras aceptarlo, la llamada funcionará con normalidad.',
    callCouldNotStart: 'La llamada no pudo iniciarse',
    networkError:
      'No se pudo establecer la llamada en esta red. Una conexión directa requiere que ambas partes la permitan; en redes restrictivas se necesita un servidor de retransmisión (TURN).',
    insecureError:
      'Esta página no puede usar la cámara ni el micrófono porque se abrió en una dirección no segura. Los navegadores solo los permiten por https:// o en localhost. Abra el sitio en su dirección https:// —la que nombra esta máquina— y la llamada funcionará.',
    blockedError:
      'El navegador ha bloqueado el acceso a su cámara y su micrófono. Permítalos para este sitio e inténtelo de nuevo.',
    notFoundError:
      'No se encontró ninguna cámara ni micrófono en este dispositivo. Puede seguir el caso en el chat.',
    startFailedError: 'No se pudieron iniciar su cámara y su micrófono.',
    connectingTo: 'Conectando con {name}…',
    callEnded: 'La llamada ha terminado.',
    inRoomJoin: '{name} está en la sala: entre en la llamada para verle.',
    nobodyElse: 'Todavía no hay nadie más en la sala.',
    yourProfessional: 'Su profesional',
    yourClient: 'Su cliente',
    canJoin: '{who} puede entrar desde el mismo enlace de la reunión.',
    joinCall: 'Entrar en la llamada',
    unmute: 'Activar micrófono',
    mute: 'Silenciar',
    cameraOn: 'Activar cámara',
    cameraOff: 'Desactivar cámara',
    leave: 'Salir',
    meetingDetails: 'Detalles de la reunión',
    with: 'Con',
    scheduled: 'Programada',
    roomCode: 'Código de la sala',
    inRoomNow: 'Ahora en la sala',
    otherPersonOne: '1 persona más',
    otherPeople: '{count} personas más',
    onlyYou: 'Solo usted',
    directNote:
      'La llamada se realiza directamente entre ustedes dos; el vídeo no pasa por Legal Dash. En una red restrictiva puede que no sea posible una conexión directa sin un servidor de retransmisión.',
    openBackupRoom: 'Abrir la sala de vídeo de respaldo',
    ifNoConnect: ' si esta no conecta.',
  },

  recorder: {
    recordingThisCall: 'Grabando esta llamada',
    savingRecording: 'Guardando la grabación',
    recording: 'Grabación',
    bothSides:
      'ambas partes están grabando, y las dos grabaciones se mantienen privadas para ustedes dos',
    uploading: 'Subiendo la grabación, cifrada.',
    startsWithCall: 'La grabación empieza con la llamada.',
    joinAndRecorded: 'Entre en la llamada y se graba desde el momento en que se conecte.',
    stop: 'Detener la grabación',
    privateEncryptedTitle: 'Privado y cifrado.',
    privateEncryptedBody:
      ' Las grabaciones se guardan cifradas, están disponibles para usted y para la otra persona de la llamada, y para nadie más. Un administrador de esta plataforma no puede reproducirlas. Se eliminan con la reunión o la solicitud de urgencia a la que pertenecen.',
    waiting: 'Esperando…',
    cameraOff: 'Cámara desactivada',
  },

  fees: {
    title: 'Honorarios y recibos',
    intro:
      'Todos los honorarios generados en un caso del que forma parte. Pagar uno emite un recibo que puede imprimir o guardar; el recibo lleva el membrete del profesional, con la marca de Legal Dash en cualquier caso.',
    yourReceiptLayout: 'El formato de sus recibos',
    customLayout: 'En los recibos que emita se usa su propio membrete.',
    standardLayout: 'En los recibos que emita se usa el formato estándar de Legal Dash.',
    changeLayout: 'Cambiar el formato',
    waitingOne: '1 honorario esperando por usted',
    waitingMany: '{count} honorarios esperando por usted',
    waitingBody:
      'Abra el caso para pagar con tarjeta. Se emite un recibo en cuanto se confirma el pago.',
    noFees: 'Todavía no hay honorarios',
    noFeesProfessional:
      'Solicite honorarios desde dentro de un caso que haya aceptado; aparecerán aquí con su recibo.',
    noFeesClient:
      'Cuando un profesional le solicite honorarios, aparecerán aquí y dentro de la conversación del caso.',
    openMyPortfolio: 'Abrir mi cartera',
    openMyCases: 'Abrir mis casos',
    raised: 'Generado {date}',
    receiptRef: ' · recibo {number}',
    paidBy: ' · pagado por {name}',
    receipt: 'Recibo',
    payAmount: 'Pagar {amount}',
    openCase: 'Abrir el caso',
    issuedOne:
      'Se ha emitido 1 recibo. Los pagos de esta instalación son simulados: no se cobra ninguna tarjeta ni se mueve dinero.',
    issuedMany:
      'Se han emitido {count} recibos. Los pagos de esta instalación son simulados: no se cobra ninguna tarjeta ni se mueve dinero.',
    feeFallback: 'Honorarios',
    statusRequested: 'Pago pendiente',
    statusPaid: 'Pago completado',
    statusCancelled: 'Retirado',
  },

  pay: {
    backToCase: '← Volver al caso {reference}',
    withdrawnTitle: 'Estos honorarios se retiraron',
    withdrawnBody:
      'El profesional retiró esta solicitud en el caso {reference}, así que no hay nada que pagar.',
    backToCaseButton: 'Volver al caso',
    title: 'Pagar unos honorarios',
    forCase: 'Del caso {reference} — {title}',
    payableTo:
      'A favor de {name}. Los honorarios de esta instalación se liquidan por transferencia bancaria.',
  },

  bankTransfer: {
    forCase: 'Del caso {reference}',
    howPay: '¿Cómo desea pagar?',
    bankTransfer: 'Transferencia bancaria',
    bankTransferBody:
      'Envíe el importe a la cuenta indicada abajo y después regístrelo aquí con la referencia que le dé su banco.',
    card: 'Tarjeta',
    cardBody:
      'Aún no disponible. Si la elige, se le explica qué ocurre en lugar de mostrar un formulario que no puede funcionar.',
    cardTitle: 'El pago con tarjeta está en desarrollo',
    cardAlertBefore:
      'El pago con tarjeta está en desarrollo y estará listo pronto. Hasta entonces, los honorarios se pagan por transferencia bancaria: elija ',
    cardAlertBold: 'Transferencia bancaria',
    cardAlertAfter: ' arriba y los datos de la cuenta están en esta página.',
    transferTo: 'Transferir a',
    referenceToQuote: 'Referencia que citar',
    sendFirstTitle: 'Envíe primero la transferencia desde su propio banco',
    sendFirstBody:
      'Esta página no mueve dinero. Haga la transferencia en su aplicación bancaria y vuelva después para registrarla aquí: se avisa al profesional, se emite un recibo y se le pide el justificante de pago.',
    transferReference: 'Referencia de la transferencia',
    transferReferenceHint: 'La referencia que le dio su banco, o la que citó.',
    note: 'Nota',
    notePlaceholder: 'Cualquier cosa que el profesional deba saber sobre este pago',
    recording: 'Registrando…',
    sent: 'He enviado la transferencia',
    confirming:
      'Al confirmar se emite un recibo que puede imprimir o guardar como PDF y se le devuelve a la conversación del caso.',
    payByTransferInstead: 'Pagar por transferencia bancaria en su lugar',
  },

  receipt: {
    backToCase: '← Volver al caso {reference}',
    paymentComplete: 'Pago completado',
    paymentCompleteClient:
      'El pago está registrado y se ha avisado al profesional. Descargue o imprima el recibo de abajo y envíe después su justificante de pago para que también quede en el expediente del caso.',
    paymentCompleteProfessional: 'El cliente ha completado el pago de estos honorarios.',
    notPaid: 'Estos honorarios no se han pagado',
    notPaidBodyWithdrawn: 'No hay recibo que imprimir, porque esta solicitud está retirada.',
    notPaidBodyPending:
      'No hay recibo que imprimir, porque esta solicitud sigue pendiente de pago.',
    notIssued: 'No emitido',
    receipt: 'Recibo',
    amountPaid: 'Importe pagado',
    status: 'Estado',
    paid: 'Pagado',
    withdrawn: 'Retirado',
    awaitingPayment: 'Pendiente de pago',
    reason: 'Motivo',
    details: 'Detalles',
    paidTo: 'Pagado a',
    lawyer: 'Abogado',
    firm: 'Despacho',
    contact: 'Contacto',
    paidBy: 'Pagado por',
    method: 'Método',
    paidOn: 'Pagado el',
    case: 'Caso',
    licenceDetail: '{name} · licencia {number} ({authority})',
    firmDetail: '{name} · licencia comercial {number}',
    bankTransfer: 'Transferencia bancaria',
    notRecorded: 'No registrado',
    notPaidDetail: 'Sin pagar',
    issuedThrough: 'Emitido a través de Legal Dash · recibo {number}',
    simulatedTitle: 'Pago simulado.',
    simulatedBody:
      ' Legal Dash no tiene ninguna pasarela de pago conectada. No se cobró ninguna tarjeta ni se movió dinero entre estas partes; este recibo registra lo que el cliente y el profesional acordaron y confirmaron dentro de la aplicación. No es una factura fiscal.',
  },

  receiptActions: {
    download: 'Descargar el recibo en PDF',
    backToCase: 'Volver al caso',
    saved: 'Recibo guardado. Volviendo a la conversación del caso…',
    hint: 'Recibo {number}. Si elige «Guardar como PDF» en el diálogo de impresión, se descargará.',
  },

  receiptTemplate: {
    title: 'Formato del recibo',
    intro:
      'Cada honorario que genere produce un recibo que el cliente puede imprimir. Elija si lleva el formato estándar de Legal Dash o un membrete propio. Su cuenta empieza con el formato estándar y puede cambiar de opinión en cualquier momento.',
    whatIsOn: 'Qué lleva todo recibo',
    whatIsOnBody:
      'Sea cual sea el formato que elija, un recibo siempre lleva esto. Son hechos sobre un pago, no decoración.',
    amount: 'Importe',
    amountDetail: 'En dírhams, del honorario que generó',
    reason: 'Motivo',
    reasonDetail: 'Para qué era el honorario y su descripción',
    paidBy: 'Pagado por',
    paidByDetail: 'El cliente y la tarjeta utilizada, nunca el número completo',
    receiptNumber: 'Número de recibo',
    receiptNumberDetail: 'Único, y se cita si alguna vez se cuestiona el pago',
    case: 'Caso',
    caseDetail: 'La referencia y el título a los que pertenece el honorario',
    mark: 'Marca de Legal Dash',
    markDetail: 'Siempre presente, en cualquiera de los dos formatos',
    whereAppears: 'Dónde aparece',
    whereAppearsBody:
      'El recibo que ve el cliente tras pagar unos honorarios, y la copia que imprime o guarda en PDF. Los administradores usan el formato estándar y no pueden cambiarlo: la marca de la plataforma es suya por definición.',
    issuedReceipts: 'Recibos que he emitido',
    accountSecurity: 'Cuenta y seguridad',
    onStandard: 'Está en el formato estándar',
    onStandardBody:
      'Es un recibo completo y correcto y no le falta nada. Un membrete personalizado es para despachos que ya tienen su propia imagen de marca.',
    myPractice: 'Mi despacho',
  },

  receiptLayout: {
    standardTitle: 'Formato estándar',
    standardBody: 'El recibo de Legal Dash. Nada que rellenar y nada que pueda estar mal.',
    providedByPlatform: 'Proporcionado por la plataforma',
    whichLayout: '¿Qué formato deben usar sus recibos?',
    optionStandardTitle: 'El formato estándar de Legal Dash',
    optionStandardBody:
      'Lleva la marca de Legal Dash, el importe, el motivo, el caso y la tarjeta utilizada. Recomendado salvo que tenga su propio membrete.',
    optionCustomTitle: 'Mi propio membrete',
    optionCustomBody:
      'Su nombre, su marca y su color, con la marca de Legal Dash al pie del recibo.',
    yourLetterhead: 'Su membrete',
    yourLetterheadBody:
      'Solo se usa cuando el formato de arriba es el suyo. Deje la marca vacía para conservar la de Legal Dash.',
    nameOnReceipt: 'Nombre en el recibo',
    nameOnReceiptHint: 'Si se deja vacío, se usa {name} por defecto.',
    strapline: 'Lema',
    straplineHint: 'Por ejemplo: Abogados y consultores jurídicos.',
    accentColour: 'Color de acento',
    accentColourHint: 'Un color hexadecimal, usado para las líneas y los títulos.',
    yourMark: 'Su marca',
    yourMarkHint:
      'PNG, JPEG o WebP, hasta 5 MB. Se muestra en lugar de la marca de Legal Dash en la cabecera del recibo. No se acepta SVG: un SVG subido puede ejecutar scripts en el navegador.',
    removeMark: 'Quitar la marca que subí',
    footerNote: 'Nota al pie',
    footerNoteHint: 'Condiciones, un agradecimiento o con quién contactar sobre el recibo.',
    whatShows: 'Qué muestra el recibo',
    showLicence: 'Mi número de licencia y mi autoridad',
    showFirm: 'Mi despacho y su licencia comercial',
    showContact: 'Mis datos de contacto',
    saving: 'Guardando…',
    saveLayout: 'Guardar el formato de mis recibos',
    backToStandard: 'Volver al formato estándar',
    backToStandardBody:
      'Quita su membrete y cualquier marca que haya subido. Los recibos que ya haya emitido no cambian: conservan el formato con el que se emitieron.',
    resetConfirm: '¿Volver al formato estándar de Legal Dash y quitar la marca que subió?',
    resetting: 'Restableciendo…',
    useStandard: 'Usar el formato estándar',
    seeReceipts: 'Ver los recibos ya emitidos',
  },

  reviews: {
    published: 'Su opinión se ha publicado.',
    title: 'Opiniones',
    intro:
      'Solo el cliente puede escribir una opinión sobre un caso que ese profesional haya aceptado realmente, y cada caso lleva una sola opinión. Eso es lo que hace que la valoración merezca la pena.',
    switchedOff: 'Las opiniones están desactivadas',
    switchedOffBody:
      'Un administrador ha desactivado las opiniones. Las opiniones existentes se ocultan mientras esté desactivado.',
    whatClientsSay: 'Lo que dicen sus clientes ({count})',
    noReceived: 'Cuando un cliente opine sobre un caso que haya aceptado, aparecerá aquí.',
    aClient: 'Un cliente',
    hiddenByAdmin: 'Ocultada por un administrador',
    caseRef: 'Caso {reference} · {title}',
    reason: ' · motivo: {reason}',
    leaveReview: 'Dejar una opinión',
    noUnreviewedBefore: 'No tiene ningún caso sin opinión con ese profesional. ',
    seeAllReviewable: 'Ver todos los casos que puede opinar',
    professional: 'Profesional',
    reviewsIWrote: 'Opiniones que he escrito ({count})',
    hidden: 'Oculta',
    hiddenReason: ': {reason}',
    publishedBadge: 'Publicada',
    caseArea: 'Caso {reference} · {title} · {area} · {date}',
  },

  reviewSection: {
    title: 'Opiniones',
    count: '({count} opinión)',
    countPlural: '({count} opiniones)',
    switchedOff: 'Los administradores de esta instalación han desactivado las opiniones.',
    selfProfile: 'Este es su propio perfil, así que no puede opinar sobre sí mismo.',
    signInToReview:
      'Inicie sesión para dejar una opinión sobre {name}. Solo puede escribirla un cliente cuyo caso haya aceptado este profesional.',
    writeReviewOf: 'Escriba una opinión sobre {name}',
    chooseCase: 'Elija un caso que haya tenido con él y valore de una a cinco estrellas.',
    cannotYet: 'Todavía no puede opinar',
    cannotYetBody:
      'Solo se puede escribir una opinión sobre un caso que este profesional haya aceptado, y cada caso se puede valorar una vez. Todavía no tiene ningún caso aceptado sin opinión con {name}.',
    cannotYetTail: 'En cuanto acepte un caso suyo, el formulario de opinión aparecerá aquí.',
    noReviewsFor: 'Todavía no hay opiniones sobre {name}.',
    member: 'Un miembro de Legal Dash',
    aboutCase: 'Sobre el caso {reference} · {area}',
  },

  reviewForm: {
    ratingPoor: 'Deficiente',
    ratingBelow: 'Por debajo de lo esperado',
    ratingAcceptable: 'Aceptable',
    ratingGood: 'Bueno',
    ratingExcellent: 'Excelente',
    notPublished: 'Su opinión no se publicó',
    empty:
      'Puede dejar una opinión cuando un profesional haya aceptado un caso suyo. Las opiniones están vinculadas a un encargo real, así que todavía no hay nada que valorar.',
    whichCase: '¿Sobre qué caso es?',
    whichCaseHint: 'Aquí solo aparecen los casos que un profesional haya aceptado.',
    chooseCase: 'Elija un caso…',
    yourRating: 'Su valoración',
    headline: 'Titular',
    headlinePlaceholder: 'p. ej. Asesoramiento claro y respuesta rápida',
    yourReview: 'Su opinión',
    yourReviewHint: 'Describa su experiencia. Al menos 20 caracteres.',
    publishing: 'Publicando…',
    publish: 'Publicar la opinión',
    footnote:
      'Su opinión se publica con su nombre y su insignia de verificación. Está vinculada al caso que elija, y un administrador puede ocultarla si incumple las normas.',
  },

  starRating: {
    outOfFive: '{value} de 5',
    count: '({count} opinión)',
    countPlural: '({count} opiniones)',
    breakdownEmpty:
      'Todavía no hay opiniones. Solo puede escribirla un cliente cuyo caso haya aceptado este profesional.',
    reviewCount: '{count} opinión',
    reviewCountPlural: '{count} opiniones',
    star: '{count} estrella',
  },

  enquiries: {
    title: 'Bolsa de consultas',
    intro:
      'Consultas generales enviadas por miembros del público que no tienen cuenta. Todos los abogados y despachos registrados ven la misma bolsa; quien la reclama se la lleva y pasa a ser suya para responderla.',
    notCasesTitle: 'Son consultas, no casos',
    notCasesBody:
      'Una consulta no tiene documentos, ni conversación, ni expediente, y por eso el formulario indica a la gente que una cuenta es la mejor vía. Cuando contacte con alguien, sugiérale que cree una: así el trabajo podrá gestionarse correctamente como un caso.',
    openInPool: 'Abiertas en la bolsa ({count})',
    poolEmpty: 'La bolsa está vacía',
    poolEmptyBody:
      'Las consultas generales del público aparecen aquí. Todavía nadie ha preguntado nada.',
    claimedHeading: 'Consultas que he reclamado ({count})',
    claimed: '{name} · reclamada {date}',
    closed: ' · cerrada',
  },

  enquiryForms: {
    claiming: 'Reclamando…',
    claimConfirm: '¿Reclamar esta consulta? Sale de la bolsa y pasa a ser suya para responderla.',
    claim: 'Reclamar esta consulta',
    closeConfirm: '¿Cerrar esta consulta?',
    markDone: 'Marcar como hecha',
    emailThem: 'Escribirles',
    call: 'Llamar a {phone}',
  },
};
