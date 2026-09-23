/**
 * The long-form copy, per language.
 *
 * The dictionary handles words and phrases; this holds the passages — the feature
 * cards, the badge explanations, the steps of a process — where the unit of
 * translation is a paragraph rather than a label. Keeping them here rather than in
 * the page means the page holds structure and this holds prose.
 *
 * `Localised` enforces completeness at the type level: a language missing a
 * paragraph, or missing a whole card, is a build error rather than an English
 * sentence in the middle of a Spanish page.
 */
type Localised<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends readonly (infer U)[]
      ? Localised<U>[]
      : Localised<T[K]>;
};

export type LandingContent = {
  clients: { title: string; body: string }[];
  professionals: { title: string; body: string }[];
  badges: string[];
  trust: { title: string; body: string }[];
};

const en: LandingContent = {
  clients: [
      { title: 'Search by what matters', body: 'Filter by area of law and emirate — criminal, civil, commercial, family, labour, property and more — across all seven Emirates.' },
      { title: 'See who has been checked', body: 'A coloured badge means a reviewer examined that professional\\u2019s Emirates ID and legal documents. Profiles without one say so plainly.' },
      { title: 'Send a case, not an email', body: 'Name the matter, describe it, attach your papers. Follow it from Submitted to Under review to Assigned without chasing anyone.' },
      { title: 'Talk inside the case', body: 'A proper conversation with your lawyer, with your documents and your fees in the same place. Nobody has to repeat themselves.' },
      { title: 'Ask for a call when it matters', body: 'Your own conference room, with the professional handling your case in it. Ask for an urgent call and you go straight in while they are alerted.' },
      { title: 'Pay a fee and keep the receipt', body: 'Fees arrive in the conversation, not by surprise. Pay by card, get a receipt you can print, and send the proof of payment into the case file.' },
      { title: 'Reviews you can trust', body: 'Only a client whose case was actually accepted can review, and each case carries one review. No anonymous score-settling.' },
  ],
  professionals: [
      { title: 'A queue, not an inbox', body: 'Cases arrive ready to review. Accept the ones you want, decline the rest with a reason the client can act on.' },
      { title: 'Your practice in one place', body: 'Portfolio, pending cases, clients and their details, all kept in step with what the client sees.' },
      { title: 'A diary you can actually run', body: 'Month, week and day views. Move, cancel or delete any meeting — the client is told about everything except a deletion.' },
      { title: 'Run the firm, not just your cases', body: 'See every case, which lawyer holds it, how far each has got, and the whole firm\\u2019s diary and rooms on one calendar.' },
      { title: 'Take emergencies when you choose', body: 'Turn emergency availability on and urgent requests reach you directly. Firms can name one lawyer as their always-on contact.' },
      { title: 'Ask for your fee in the case', body: 'Raise a consultation or case fee where the conversation already is. The client pays by card, a receipt is issued, and the proof of payment lands in the case.' },
  ],
  badges: [
      'An individual whose Emirates ID and profile have been reviewed.',
      'A lawyer whose Emirates ID and permit to provide legal representation have been reviewed.',
      'A firm whose Emirates ID, legal permit and trade licence have been reviewed.',
  ],
  trust: [
      { title: 'Emirates ID never public', body: 'Your profile shows that your Emirates ID was verified. The number is never published.' },
      { title: 'Documents stay private', body: 'Evidence is stored away from anything public and served only to you and your reviewer.' },
      { title: 'One identity, one account', body: 'An Emirates ID can verify a single account, which is what makes a badge worth something.' },
      { title: 'You are told what happens', body: 'Every status change, message and meeting request raises an alert you can act on.' },
  ],
};

const es: Localised<LandingContent> = {
  clients: [
      { title: 'Busque por lo que importa', body: 'Filtre por área del derecho y emirato — penal, civil, mercantil, familia, laboral, inmobiliario y más — en los siete Emiratos.' },
      { title: 'Vea quién ha sido comprobado', body: 'Una insignia de color significa que un revisor examinó el Emirates ID y los documentos legales de ese profesional. Los perfiles que no la tienen lo dicen con claridad.' },
      { title: 'Envíe un caso, no un correo', body: 'Ponga nombre al asunto, descríbalo y adjunte sus documentos. Sígalo desde «Enviado» hasta «En revisión» y «Asignado».' },
      { title: 'Converse dentro del caso', body: 'Una conversación ordenada con su abogado, con los documentos y los honorarios en el mismo sitio. Nadie tiene que buscar en su bandeja de entrada.' },
      { title: 'Pida una llamada cuando importe', body: 'Su propia sala de videoconferencia, con el profesional que lleva su caso. Pida una llamada urgente y el teléfono suena.' },
      { title: 'Pague los honorarios y guarde el recibo', body: 'Los honorarios llegan dentro de la conversación, no por sorpresa. Pague por transferencia y obtenga un recibo que puede imprimir.' },
      { title: 'Opiniones en las que puede confiar', body: 'Solo un cliente cuyo caso fue realmente aceptado puede opinar, y cada caso lleva una sola opinión.' }
  ],
  professionals: [
      { title: 'Una cola, no una bandeja de entrada', body: 'Los casos llegan listos para revisar. Acepte los que quiera y rechace el resto con un motivo que el cliente puede leer.' },
      { title: 'Su despacho en un solo lugar', body: 'Cartera, casos pendientes, clientes y sus datos, todo en sintonía con lo que ve el cliente.' },
      { title: 'Una agenda que puede gestionar', body: 'Vistas por mes, semana y día. Mueva, cancele o elimine cualquier reunión: el cliente se entera de cada cambio.' },
      { title: 'Dirija el despacho, no solo sus casos', body: 'Vea cada caso, qué abogado lo lleva, en qué punto está, y toda la agenda y los honorarios del despacho.' },
      { title: 'Acepte urgencias cuando quiera', body: 'Active su disponibilidad para urgencias y las solicitudes le llegan directamente. Los despachos pueden designar a un abogado de guardia.' },
      { title: 'Pida sus honorarios dentro del caso', body: 'Solicite una consulta o un honorario donde ya está la conversación. El cliente paga por transferencia y el recibo queda emitido.' }
  ],
  badges: [
      'Una persona cuyo Emirates ID y cuyo perfil han sido revisados.',
      'Un abogado cuyo Emirates ID y cuyo permiso para ejercer la representación legal han sido revisados.',
      'Un despacho cuyo Emirates ID, permiso legal y licencia comercial han sido revisados.'
  ],
  trust: [
      { title: 'El Emirates ID nunca es público', body: 'Su perfil muestra que su Emirates ID fue verificado. El número nunca se publica.' },
      { title: 'Los documentos siguen siendo privados', body: 'Las pruebas se guardan lejos de todo lo público y solo se muestran a usted y a su revisor.' },
      { title: 'Una identidad, una cuenta', body: 'Un Emirates ID solo puede verificar una cuenta, y eso es lo que da valor a una insignia.' },
      { title: 'Le avisamos de todo lo que ocurre', body: 'Cada cambio de estado, mensaje y solicitud de reunión genera un aviso sobre el que puede actuar.' },
  ],
};

/** Every language that is complete. Others fall back to English. */
export const LANDING_CONTENT: Record<string, LandingContent> = { en, es };

export function landingContent(locale: string): LandingContent {
  return LANDING_CONTENT[locale] ?? en;
}
