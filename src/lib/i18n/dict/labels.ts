import type { Translated } from '../translated';

/**
 * The shared label vocabulary.
 *
 * These are not sentences: they are the names of things the database stores as
 * codes — a case status, a document kind, an area of law, a bank field. They are
 * rendered on nearly every page, by tables, chips, filters and forms that have no
 * prose of their own, which is why they live together in one place rather than
 * being folded into whichever area happens to show them first.
 *
 * The codes themselves are never translated. `SUBMITTED` stays `SUBMITTED` in the
 * database, in an audit row and in a URL; only the word a person reads changes.
 */
export const labelsEn = {
  accountType: {
    USER: 'Individual',
    LAWYER: 'Lawyer',
    FIRM: 'Legal firm',
  },

  accountTypeDescription: {
    USER: 'Looking for legal help, or managing your own legal matters.',
    LAWYER: 'A licensed legal professional providing legal representation in the UAE.',
    FIRM: 'A licensed law firm or legal consultancy registered in the UAE.',
  },

  emirate: {
    ABU_DHABI: 'Abu Dhabi',
    DUBAI: 'Dubai',
    SHARJAH: 'Sharjah',
    AJMAN: 'Ajman',
    UMM_AL_QUWAIN: 'Umm Al Quwain',
    RAS_AL_KHAIMAH: 'Ras Al Khaimah',
    FUJAIRAH: 'Fujairah',
  },

  legalArea: {
    CRIMINAL_PENAL: 'Criminal (Penal)',
    CIVIL: 'Civil',
    COMMERCIAL: 'Commercial',
    FAMILY_PERSONAL_STATUS: 'Family & Personal Status',
    LABOUR_EMPLOYMENT: 'Labour & Employment',
    REAL_ESTATE_PROPERTY: 'Real Estate & Property',
    IMMIGRATION_RESIDENCY: 'Immigration & Residency',
    ARBITRATION: 'Arbitration',
    INTELLECTUAL_PROPERTY: 'Intellectual Property',
    BANKING_FINANCE: 'Banking & Finance',
    TAX: 'Tax',
    ADMINISTRATIVE: 'Administrative',
    MARITIME: 'Maritime',
    CYBERCRIME: 'Cybercrime',
    OTHER: 'Other',
  },

  documentKind: {
    EMIRATES_ID: 'Emirates ID',
    PASSPORT: 'Passport',
    PROFILE_PHOTO: 'Profile photo',
    LAWYER_LICENSE: 'Legal representation permit / licence',
    FIRM_TRADE_LICENSE: 'Firm trade licence',
    POWER_OF_ATTORNEY: 'Power of attorney',
    PROFESSIONAL_INDEMNITY_INSURANCE: 'Professional indemnity insurance',
    BRAND_LOGO: 'Billing receipt mark',
    OTHER: 'Other supporting document',
    NATIONAL_ID: 'National identity card',
    RESIDENCE_PERMIT: 'Residence permit',
    PRACTICE_AUTHORISATION: 'Permission to practise law',
  },

  documentKindHint: {
    EMIRATES_ID: 'Front and back of your Emirates ID.',
    NATIONAL_ID: 'Front and back of your national identity card.',
    PASSPORT: 'The page with your photograph and the machine-readable strip.',
    RESIDENCE_PERMIT:
      'The permit that lets you live where you live, or the page in your passport that records it.',
    LAWYER_LICENSE: 'The licence issued by the authority that admitted you to practise.',
    PRACTICE_AUTHORISATION:
      'Permission to practise in the country where you work, if that is not where you qualified.',
    FIRM_TRADE_LICENSE: 'The registration of the firm where it operates.',
    POWER_OF_ATTORNEY: 'The authority of the person opening the account for the firm.',
    PROFESSIONAL_INDEMNITY_INSURANCE:
      'Optional. Your professional indemnity cover, where you hold it.',
    PROFILE_PHOTO: 'Optional. Shown on your profile and directory listing.',
    BRAND_LOGO: 'Optional. The mark printed on your own billing receipts.',
    OTHER: 'Anything else that supports your request. Say what it is.',
  },

  /** The lifecycle of an account's verification request. */
  verificationRequest: {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted, waiting to be picked up',
    UNDER_REVIEW: 'Being reviewed',
    APPROVED: 'Approved',
    REJECTED: 'Not approved',
    WITHDRAWN: 'Withdrawn',
  },

  /** The lifecycle of a client's case against a lawyer. */
  caseStatus: {
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under review',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Completed',
    DECLINED: 'Declined',
  },

  communityTopic: {
    LABOUR_EMPLOYMENT: 'Pay, dismissal and work',
    TENANCY_PROPERTY: 'Rent, landlords and property',
    FAMILY_PERSONAL_STATUS: 'Family and personal status',
    CRIMINAL_PENAL: 'Police, charges and detention',
    TRAFFIC_FINES: 'Traffic, fines and licences',
    VISAS_RESIDENCY: 'Visas, residency and entry bans',
    BUSINESS_CONTRACTS: 'Business, contracts and trade',
    MONEY_DEBT: 'Money, debt and cheques',
    COURTS_PROCEDURE: 'Courts, notaries and procedure',
    COSTS_FEES: 'Fees, costs and payments',
    USING_DUBAI_LEGAL: 'Using Dubai Legal',
    OTHER: 'Something else',
  },

  communityTopicHint: {
    LABOUR_EMPLOYMENT: 'Wages, gratuity, notice, unfair dismissal, working hours.',
    TENANCY_PROPERTY: 'Deposits, eviction, rent increases, maintenance, buying and selling.',
    FAMILY_PERSONAL_STATUS: 'Marriage, divorce, custody, maintenance, inheritance.',
    CRIMINAL_PENAL: 'Complaints, questioning, bail, criminal charges.',
    TRAFFIC_FINES: 'Fines, accidents, impounding, driving licences.',
    VISAS_RESIDENCY: 'Residency, sponsorship, overstays, travel bans, deportation.',
    BUSINESS_CONTRACTS: 'Company set-up, contracts, suppliers, licences, partners.',
    MONEY_DEBT: 'Loans, unpaid invoices, bounced cheques, repayments.',
    COURTS_PROCEDURE: 'Filing, hearings, powers of attorney, enforcement, legalisation.',
    COSTS_FEES: 'What a lawyer costs, court fees, hourly rates, retainers.',
    USING_DUBAI_LEGAL: 'Verification, the directory, cases, meetings, payments on this platform.',
    OTHER: 'Anything that does not fit the boards above.',
  },

  /** The three reactions. Written labels: the emoji are in `lib/community`. */
  reaction: {
    LIKE: 'Like',
    HEART: 'Love',
    WOW: 'Surprised',
  },

  blogKind: {
    RECOMMENDATION: 'Recommend a lawyer or firm',
    QUESTION: 'Ask a question',
    NOTE: 'Share an experience',
  },

  supportCategory: {
    ACCOUNT_ACCESS: 'Signing in or my account',
    VERIFICATION: 'Verification and documents',
    CASE_OR_MEETING: 'A case or a meeting',
    PAYMENT: 'A fee or a payment',
    TECHNICAL: 'Something is broken',
    OTHER: 'Something else',
  },

  supportStatus: {
    OPEN: 'Waiting for support',
    ANSWERED: 'Support has replied',
    SOLVED: 'Solved and closed',
  },

  bankField: {
    accountHolder: 'Account holder name',
    bankName: 'Bank name',
    iban: 'IBAN',
    accountNumber: 'Account number',
    swift: 'SWIFT / BIC',
    routingNumber: 'Routing number (ABA)',
    sortCode: 'Sort code',
    cbu: 'CBU / CVU or alias',
    ifsc: 'IFSC code',
    bsb: 'BSB',
    branch: 'Branch',
    instructions: 'Payment instructions for the client',
  },

  paymentPurpose: {
    CONSULTATION: 'Consultation fee',
    CASE_ASSISTANCE: 'Case assistance fee',
    COURT_FEES: 'Court and filing fees',
    OTHER: 'Other',
  },

  /** The accent names used as console headings. */
  domain: {
    directory: 'Directory',
    verification: 'Verification',
    case: 'Cases',
    emergency: 'Emergency',
    meeting: 'Meetings',
    payment: 'Fees',
    review: 'Reviews',
    enquiry: 'Enquiries',
    oversight: 'Oversight',
  },
};

export type LabelsDict = Translated<typeof labelsEn>;

export const labelsEs: LabelsDict = {
  accountType: {
    USER: 'Particular',
    LAWYER: 'Abogado',
    FIRM: 'Despacho',
  },

  accountTypeDescription: {
    USER: 'Busca ayuda legal o gestiona sus propios asuntos jurídicos.',
    LAWYER: 'Un profesional del derecho colegiado que ofrece representación legal en los EAU.',
    FIRM: 'Un despacho de abogados o una consultoría jurídica con licencia en los EAU.',
  },

  emirate: {
    ABU_DHABI: 'Abu Dhabi',
    DUBAI: 'Dubai',
    SHARJAH: 'Sharjah',
    AJMAN: 'Ajman',
    UMM_AL_QUWAIN: 'Umm Al Quwain',
    RAS_AL_KHAIMAH: 'Ras Al Khaimah',
    FUJAIRAH: 'Fujairah',
  },

  legalArea: {
    CRIMINAL_PENAL: 'Penal',
    CIVIL: 'Civil',
    COMMERCIAL: 'Mercantil',
    FAMILY_PERSONAL_STATUS: 'Familia y estado civil',
    LABOUR_EMPLOYMENT: 'Laboral',
    REAL_ESTATE_PROPERTY: 'Inmobiliario',
    IMMIGRATION_RESIDENCY: 'Inmigración y residencia',
    ARBITRATION: 'Arbitraje',
    INTELLECTUAL_PROPERTY: 'Propiedad intelectual',
    BANKING_FINANCE: 'Bancario y financiero',
    TAX: 'Fiscal',
    ADMINISTRATIVE: 'Administrativo',
    MARITIME: 'Marítimo',
    CYBERCRIME: 'Delitos informáticos',
    OTHER: 'Otros',
  },

  documentKind: {
    EMIRATES_ID: 'Emirates ID',
    PASSPORT: 'Pasaporte',
    PROFILE_PHOTO: 'Foto de perfil',
    LAWYER_LICENSE: 'Permiso o licencia de representación legal',
    FIRM_TRADE_LICENSE: 'Licencia comercial del despacho',
    POWER_OF_ATTORNEY: 'Poder notarial',
    PROFESSIONAL_INDEMNITY_INSURANCE: 'Seguro de responsabilidad civil profesional',
    BRAND_LOGO: 'Marca del recibo de honorarios',
    OTHER: 'Otro documento justificativo',
    NATIONAL_ID: 'Documento nacional de identidad',
    RESIDENCE_PERMIT: 'Permiso de residencia',
    PRACTICE_AUTHORISATION: 'Autorización para ejercer la abogacía',
  },

  documentKindHint: {
    EMIRATES_ID: 'Anverso y reverso de su Emirates ID.',
    NATIONAL_ID: 'Anverso y reverso de su documento nacional de identidad.',
    PASSPORT: 'La página con su fotografía y la banda de lectura mecánica.',
    RESIDENCE_PERMIT:
      'El permiso que le autoriza a residir donde vive, o la página del pasaporte que lo acredita.',
    LAWYER_LICENSE: 'La licencia expedida por la autoridad que le autorizó a ejercer.',
    PRACTICE_AUTHORISATION:
      'Autorización para ejercer en el país donde trabaja, si no es aquel en el que obtuvo su titulación.',
    FIRM_TRADE_LICENSE: 'El registro del despacho en el lugar donde ejerce su actividad.',
    POWER_OF_ATTORNEY: 'La facultad de la persona que abre la cuenta en nombre del despacho.',
    PROFESSIONAL_INDEMNITY_INSURANCE:
      'Opcional. Su seguro de responsabilidad civil profesional, si lo tiene.',
    PROFILE_PHOTO: 'Opcional. Se muestra en su perfil y en su ficha del directorio.',
    BRAND_LOGO: 'Opcional. La marca impresa en sus propios recibos de honorarios.',
    OTHER: 'Cualquier otra cosa que respalde su solicitud. Indique de qué se trata.',
  },

  verificationRequest: {
    DRAFT: 'Borrador',
    SUBMITTED: 'Enviado, en espera de ser asignado',
    UNDER_REVIEW: 'En revisión',
    APPROVED: 'Aprobado',
    REJECTED: 'No aprobado',
    WITHDRAWN: 'Retirado',
  },

  caseStatus: {
    SUBMITTED: 'Enviado',
    UNDER_REVIEW: 'En revisión',
    ASSIGNED: 'Asignado',
    IN_PROGRESS: 'En curso',
    COMPLETED: 'Completado',
    DECLINED: 'Rechazado',
  },

  communityTopic: {
    LABOUR_EMPLOYMENT: 'Salario, despido y trabajo',
    TENANCY_PROPERTY: 'Alquiler, propietarios e inmuebles',
    FAMILY_PERSONAL_STATUS: 'Familia y estado civil',
    CRIMINAL_PENAL: 'Policía, cargos y detención',
    TRAFFIC_FINES: 'Tráfico, multas y permisos',
    VISAS_RESIDENCY: 'Visados, residencia y prohibiciones de entrada',
    BUSINESS_CONTRACTS: 'Empresa, contratos y comercio',
    MONEY_DEBT: 'Dinero, deudas y cheques',
    COURTS_PROCEDURE: 'Tribunales, notarios y procedimiento',
    COSTS_FEES: 'Honorarios, costas y pagos',
    USING_DUBAI_LEGAL: 'Usar Dubai Legal',
    OTHER: 'Otro asunto',
  },

  communityTopicHint: {
    LABOUR_EMPLOYMENT: 'Salarios, indemnización, preaviso, despido improcedente, jornada.',
    TENANCY_PROPERTY: 'Fianzas, desalojo, subidas de alquiler, mantenimiento, compraventa.',
    FAMILY_PERSONAL_STATUS: 'Matrimonio, divorcio, custodia, pensión, herencia.',
    CRIMINAL_PENAL: 'Denuncias, interrogatorios, fianza, cargos penales.',
    TRAFFIC_FINES: 'Multas, accidentes, incautación, permisos de conducir.',
    VISAS_RESIDENCY: 'Residencia, patrocinio, exceso de estancia, prohibiciones de viaje, deportación.',
    BUSINESS_CONTRACTS: 'Constitución de sociedades, contratos, proveedores, licencias, socios.',
    MONEY_DEBT: 'Préstamos, facturas impagadas, cheques sin fondos, devoluciones.',
    COURTS_PROCEDURE: 'Presentación de escritos, vistas, poderes, ejecución, legalización.',
    COSTS_FEES: 'Cuánto cuesta un abogado, tasas judiciales, tarifas por hora, provisiones.',
    USING_DUBAI_LEGAL: 'Verificación, el directorio, casos, reuniones y pagos en esta plataforma.',
    OTHER: 'Cualquier cosa que no encaje en los tablones anteriores.',
  },

  reaction: {
    LIKE: 'Me gusta',
    HEART: 'Me encanta',
    WOW: 'Me sorprende',
  },

  blogKind: {
    RECOMMENDATION: 'Recomendar un abogado o un despacho',
    QUESTION: 'Hacer una pregunta',
    NOTE: 'Compartir una experiencia',
  },

  supportCategory: {
    ACCOUNT_ACCESS: 'Iniciar sesión o mi cuenta',
    VERIFICATION: 'Verificación y documentos',
    CASE_OR_MEETING: 'Un caso o una reunión',
    PAYMENT: 'Un honorario o un pago',
    TECHNICAL: 'Algo no funciona',
    OTHER: 'Otro asunto',
  },

  supportStatus: {
    OPEN: 'Esperando a soporte',
    ANSWERED: 'Soporte ha respondido',
    SOLVED: 'Resuelto y cerrado',
  },

  bankField: {
    accountHolder: 'Nombre del titular',
    bankName: 'Nombre del banco',
    iban: 'IBAN',
    accountNumber: 'Número de cuenta',
    swift: 'SWIFT / BIC',
    routingNumber: 'Número de ruta (ABA)',
    sortCode: 'Código de clasificación (sort code)',
    cbu: 'CBU / CVU o alias',
    ifsc: 'Código IFSC',
    bsb: 'BSB',
    branch: 'Sucursal',
    instructions: 'Instrucciones de pago para el cliente',
  },

  paymentPurpose: {
    CONSULTATION: 'Honorario de consulta',
    CASE_ASSISTANCE: 'Honorario de asistencia en el caso',
    COURT_FEES: 'Tasas judiciales y de presentación',
    OTHER: 'Otros',
  },

  domain: {
    directory: 'Directorio',
    verification: 'Verificación',
    case: 'Casos',
    emergency: 'Urgencia',
    meeting: 'Reuniones',
    payment: 'Honorarios',
    review: 'Opiniones',
    enquiry: 'Consultas',
    oversight: 'Supervisión',
  },
};
