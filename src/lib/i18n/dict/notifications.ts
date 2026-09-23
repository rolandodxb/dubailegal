/**
 * The in-app alerts, in Spanish.
 *
 * An alert is composed and stored as finished English at the moment something
 * happens — a case moves, a meeting is booked — by a `notify(...)` call that has
 * no request context to translate with. The facts are already interpolated into
 * the stored sentence, so the sentence cannot be translated back; instead a date
 * is stored as `{{iso}}` and rebuilt in the reader's language at read time.
 *
 * Keyed by the exact English template, with every interpolated value replaced by
 * a numbered placeholder in appearance order. Dates are the values that arrive
 * wrapped in `{{...}}`; names, references, amounts and addresses arrive as plain
 * text because they read the same in both languages. A sentence with no entry is
 * returned with its date localised and its words in English — a visible gap
 * rather than a wrong word.
 *
 * Order matters: the renderer takes the first entry whose template matches, so a
 * more specific template (one that carries a reference, or "no longer") must
 * precede the shorter one it would otherwise be swallowed by.
 */
export const notificationsEsPatterns: {
  match: string;
  es: string;
}[] = [
  // Case titles.
  { match: 'New case for your firm: {0}', es: 'Nuevo caso para su despacho: {0}' },
  { match: 'New case submitted to your firm: {0}', es: 'Nuevo caso enviado a su despacho: {0}' },
  { match: 'New case request: {0}', es: 'Nueva solicitud de caso: {0}' },
  { match: 'New case offered by {0}: {1}', es: 'Nuevo caso ofrecido por {0}: {1}' },
  { match: 'Your case {0} is under review', es: 'Su caso {0} está en revisión' },
  { match: 'Your case {0} has been assigned', es: 'Su caso {0} ha sido asignado' },
  { match: 'Your case {0} was declined', es: 'Su caso {0} ha sido rechazado' },
  { match: 'Your case {0} is marked complete', es: 'Su caso {0} está marcado como completado' },
  { match: 'Your case {0} is being assigned', es: 'Su caso {0} se está asignando' },
  { match: 'Work has started on {0}', es: 'Se ha empezado a trabajar en {0}' },
  { match: 'Nobody has taken {0} yet', es: 'Nadie ha tomado {0} todavía' },
  { match: '{0} passed on {1}', es: '{0} ha cedido {1}' },

  // Case bodies.
  { match: '{0} submitted “{1}”. Any lawyer in the firm may review and accept it.', es: '{0} ha enviado «{1}». Cualquier abogado del despacho puede revisarlo y aceptarlo.' },
  { match: '{0} submitted “{1}”. One of your registered lawyers must accept it.', es: '{0} ha enviado «{1}». Uno de sus abogados registrados debe aceptarlo.' },
  { match: '{0} submitted “{1}” and asked you to review it.', es: '{0} ha enviado «{1}» y le ha pedido que lo revise.' },
  { match: '{0} has opened “{1}” and is reviewing it.', es: '{0} ha abierto «{1}» y lo está revisando.' },
  { match: '{0} has accepted “{1}”. You can now message them inside the case.', es: '{0} ha aceptado «{1}». Ya puede enviarle mensajes dentro del caso.' },
  { match: '{0} declined “{1}”. Reason: {2}', es: '{0} ha rechazado «{1}». Motivo: {2}' },
  { match: '“{0}” is now completed.', es: '«{0}» ya está completado.' },
  { match: '“{0}” is now in progress.', es: '«{0}» ya está en curso.' },
  { match: '“{0}” has been released to the firm\'s lawyers. Take it, or pass and let a colleague pick it up.', es: '«{0}» se ha ofrecido a los abogados del despacho. Tómelo o céderlo para que lo recoja un colega.' },
  { match: '{0} has reviewed it and passed it to their lawyers. You will be told as soon as one takes it.', es: '{0} lo ha revisado y se lo ha pasado a sus abogados. Se le avisará en cuanto uno lo tome.' },
  { match: 'Every lawyer you offered it to has passed. You can release it again, or handle it yourself.', es: 'Todos los abogados a los que lo ofreció lo han cedido. Puede ofrecerlo de nuevo u ocuparse usted mismo.' },
  { match: '{0} lawyer(s) still have this offer.', es: '{0} abogado(s) aún tienen esta oferta.' },

  // Community titles.
  { match: 'A community post is waiting for review', es: 'Hay una publicación de la comunidad pendiente de revisión' },
  { match: 'Reply on “{0}”', es: 'Respuesta en «{0}»' },
  { match: 'Your post is on the board', es: 'Su publicación está en el tablero' },
  { match: 'Your question has been asked already', es: 'Su pregunta ya se ha formulado' },
  { match: 'Your post was hidden', es: 'Su publicación se ha ocultado' },
  { match: 'Your post was removed', es: 'Su publicación se ha eliminado' },
  { match: 'You were recommended', es: 'Le han recomendado' },

  // Community bodies.
  { match: '“{0}” — check whether the question has been asked already.', es: '«{0}»: compruebe si la pregunta ya se ha formulado.' },
  { match: '“{0}”: {1}', es: '«{0}»: {1}' },
  { match: '“{0}” is published. You will be told when somebody replies.', es: '«{0}» se ha publicado. Se le avisará cuando alguien responda.' },
  { match: 'Somebody posted “{0}” about {1}.', es: 'Alguien ha publicado «{0}» sobre {1}.' },
  { match: '“{0}” repeats an earlier post, and a moderator has linked the two. The answers are there.', es: '«{0}» repite una publicación anterior y un moderador ha vinculado ambas. Allí están las respuestas.' },
  { match: '“{0}” was hidden by a moderator.', es: 'Un moderador ha ocultado «{0}».' },
  { match: '“{0}” was removed by a moderator.', es: 'Un moderador ha eliminado «{0}».' },

  // Firm and credential alerts. The invitation-link wording is the longer one,
  // so it is checked before the plain "A lawyer joined X".
  { match: 'A lawyer joined {0} through your invitation link', es: 'Un abogado se ha unido a {0} a través de su enlace de invitación' },
  { match: 'A lawyer joined {0}', es: 'Un abogado se ha unido a {0}' },
  { match: '{0} invited you to join as a lawyer', es: '{0} le ha invitado a unirse como abogado' },
  { match: '{0} joined your firm', es: '{0} se ha unido a su despacho' },
  { match: 'You have been removed from {0}', es: 'Se le ha eliminado de {0}' },
  { match: 'Open your invitations to accept or decline.', es: 'Abra sus invitaciones para aceptar o rechazar.' },
  { match: 'You still have {0} open case(s) assigned to you. They remain yours to finish.', es: 'Todavía tiene {0} caso(s) abierto(s) asignado(s). Siguen siendo suyos para terminarlos.' },
  { match: 'They are now listed under Lawyers registered and can accept cases submitted to the firm.', es: 'Ahora figura en «Abogados registrados» y puede aceptar los casos enviados al despacho.' },
  { match: '{0} registered and is now linked to your firm.', es: '{0} se ha registrado y ya está vinculado a su despacho.' },
  { match: '{0} completed registration through your invitation link and is now registered with your firm.', es: '{0} ha completado el registro a través de su enlace de invitación y ya está registrado en su despacho.' },

  // Emergency alerts. "no longer" and the named guest are checked before the
  // plain forms they contain.
  { match: 'You are no longer {0}\'s emergency contact', es: 'Ya no es el contacto de urgencias de {0}' },
  { match: 'You are {0}\'s emergency contact', es: 'Usted es el contacto de urgencias de {0}' },
  { match: 'Urgent: {0} needs help now', es: 'Urgente: {0} necesita ayuda ahora' },
  { match: 'Urgent: {0}', es: 'Urgente: {0}' },
  { match: '{0} has taken your urgent request', es: '{0} ha tomado su solicitud urgente' },
  { match: 'The urgent call was cancelled', es: 'Se ha cancelado la llamada urgente' },
  { match: 'Your urgent call was closed', es: 'Su llamada urgente se ha cerrado' },
  { match: '{0} needs urgent representation. Call-back number {1}. Open the emergency queue to take it.', es: '{0} necesita representación urgente. Número de devolución de llamada: {1}. Abra la cola de urgencias para tomarla.' },
  { match: 'Case {0} has been opened and assigned. Join the video room — they are waiting there now.', es: 'Se ha abierto y asignado el caso {0}. Únase a la sala de vídeo: le están esperando allí ahora.' },
  { match: 'Urgent requests that reach the firm are assigned to you directly.', es: 'Las solicitudes urgentes que llegan al despacho se le asignan directamente.' },
  { match: 'Urgent requests for the firm will no longer be assigned to you automatically.', es: 'Las solicitudes urgentes del despacho ya no se le asignarán automáticamente.' },
  { match: '{0} — call-back {1}. Join the room to take it.', es: '{0} — devolución de llamada {1}. Únase a la sala para tomarla.' },
  { match: '“{0}” was withdrawn by the person who raised it. Nothing is owed for it.', es: '«{0}» ha sido retirada por la persona que la planteó. No se debe nada por ella.' },
  { match: '“{0}” was marked as dealt with by the lawyer who answered. If you need to speak again, raise a new request — it is not held against you.', es: 'El abogado que respondió ha marcado «{0}» como atendida. Si necesita hablar de nuevo, plantee una nueva solicitud: no se le tendrá en cuenta.' },

  // Enquiry alerts.
  { match: 'New enquiry: {0}', es: 'Nueva consulta: {0}' },
  { match: 'A general enquiry has arrived in the pool. Open it to see the details and claim it.', es: 'Ha llegado una consulta general a la bolsa. Ábrala para ver los detalles y reclamarla.' },

  // Support alerts. The ticket subject is part of the sentence, so it is a
  // placeholder; an account type is a stored enum and is left as it is.
  { match: 'Support reply on {0}', es: 'Respuesta de soporte sobre {0}' },
  { match: 'Support replied about “{0}”', es: 'Soporte ha respondido sobre «{0}»' },
  { match: 'Support marked “{0}” solved', es: 'Soporte ha marcado «{0}» como resuelto' },
  { match: 'Support: {0}', es: 'Soporte: {0}' },
  { match: '{0} ({1}) reported a problem. Ticket {2}.', es: '{0} ({1}) ha informado de un problema. Ticket {2}.' },
  { match: 'Ticket {0}. Open support to read the answer and reply.', es: 'Ticket {0}. Abra soporte para leer la respuesta y responder.' },
  { match: 'Ticket {0} is closed. If the problem comes back, raise a new ticket and quote this reference.', es: 'El ticket {0} está cerrado. Si el problema vuelve, cree un nuevo ticket e indique esta referencia.' },

  // Payment alerts. The wording about a simulated payment is kept exactly as
  // strong as the English.
  { match: 'A fee of {0} was requested', es: 'Se han solicitado honorarios de {0}' },
  { match: 'A fee of {0} was paid by transfer', es: 'Se han pagado honorarios de {0} mediante transferencia' },
  { match: 'Proof of payment was sent', es: 'Se ha enviado el justificante de pago' },
  { match: 'A fee request was withdrawn', es: 'Se ha retirado una solicitud de honorarios' },
  { match: 'On case {0}. Open the case to see the details and pay.', es: 'Sobre el caso {0}. Abra el caso para ver los detalles y pagar.' },
  { match: 'On case {0}, quoting reference {1}. Receipt {2}. The client has been asked for proof of payment. This is a simulated payment: the application did not move any money.', es: 'Sobre el caso {0}, con la referencia {1}. Recibo {2}. Se ha pedido al cliente el justificante de pago. Se trata de un pago simulado: la aplicación no ha movido dinero alguno.' },
  // The receipt-bearing form is checked before the plain one, which would
  // otherwise swallow "(receipt X)" into the amount.
  { match: 'On case {0}, for {1} (receipt {2}).', es: 'Sobre el caso {0}, por {1} (recibo {2}).' },
  { match: 'On case {0}, for {1}.', es: 'Sobre el caso {0}, por {1}.' },
  { match: 'On case {0}. Nothing is owed for it.', es: 'Sobre el caso {0}. No se debe nada por ella.' },

  // Receipt-layout alerts.
  { match: 'Your billing receipt layout is saved', es: 'Su formato de recibo de honorarios está guardado' },
  { match: 'Your billing receipts use the standard layout', es: 'Sus recibos de honorarios usan el formato estándar' },
  { match: 'New fee receipts you raise will use this letterhead. Receipts already issued are unchanged.', es: 'Los nuevos recibos de honorarios que emita usarán este membrete. Los recibos ya emitidos no cambian.' },

  // Review alerts. A reason may arrive as the literal "not stated", which is a
  // value and stays in English.
  { match: 'You received a {0}-star review', es: 'Ha recibido una opinión de {0} estrellas' },
  { match: 'Your review was hidden', es: 'Su opinión se ha ocultado' },
  { match: 'Your review was restored', es: 'Su opinión se ha restaurado' },
  { match: '{0} was reviewed on case {1}.', es: 'Se ha opinado sobre {0} en el caso {1}.' },
  { match: 'An administrator hid your review. Reason: {0}', es: 'Un administrador ha ocultado su opinión. Motivo: {0}' },
  { match: 'Your review is visible again.', es: 'Su opinión vuelve a ser visible.' },

  // Appointment titles and bodies. The bodies that name the case or the address
  // come before the shorter set that would otherwise match them; the bare
  // reschedule is last of the three "moved the meeting" forms.
  { match: 'You are asked to attend the office on {0}', es: 'Se le pide que acuda a la oficina el {0}' },
  { match: 'Meeting booked for {0}', es: 'Reunión reservada para el {0}' },
  { match: 'Your meeting moved to {0}', es: 'Su reunión se ha trasladado al {0}' },
  { match: '{0} will attend on {1}', es: '{0} asistirá el {1}' },
  { match: '{0} declined the office visit', es: '{0} ha rechazado la visita a la oficina' },
  { match: 'A meeting was cancelled', es: 'Se ha cancelado una reunión' },
  { match: '{0} has asked you to come to {1} about case {2}. Accept or decline this from My cases.', es: '{0} le ha pedido que acuda a {1} por el caso {2}. Acepte o rechace esto desde Mis casos.' },
  { match: '{0} has asked you to come to {1}. Accept or decline this from My cases.', es: '{0} le ha pedido que acuda a {1}. Acepte o rechace esto desde Mis casos.' },
  { match: '{0} has scheduled a video call with you about case {1}. Open My cases to join the conference room.', es: '{0} ha programado una videollamada con usted por el caso {1}. Abra Mis casos para unirse a la sala de conferencias.' },
  { match: '{0} has scheduled a video call with you. Open My cases to join the conference room.', es: '{0} ha programado una videollamada con usted. Abra Mis casos para unirse a la sala de conferencias.' },
  { match: '{0} has scheduled a phone call with you about case {1}.', es: '{0} ha programado una llamada telefónica con usted por el caso {1}.' },
  { match: '{0} has scheduled a phone call with you.', es: '{0} ha programado una llamada telefónica con usted.' },
  { match: 'They accepted the meeting at {0}.', es: 'Han aceptado la reunión en {0}.' },
  { match: 'They cannot come to the office for the meeting on {0}. You may want to offer a video call instead.', es: 'No pueden acudir a la oficina para la reunión del {0}. Puede que le convenga ofrecer una videollamada.' },
  { match: 'The client cancelled the meeting on {0}.', es: 'El cliente ha cancelado la reunión del {0}.' },
  { match: 'The meeting on {0} has been cancelled.', es: 'La reunión del {0} se ha cancelado.' },
  { match: '{0} moved the meeting from {1} to {2} at {3}. Accept or decline the new time from My cases.', es: '{0} ha trasladado la reunión del {1} al {2} en {3}. Acepte o rechace la nueva hora desde Mis casos.' },
  { match: '{0} moved the meeting from {1} to {2}. Open My cases to join the conference room.', es: '{0} ha trasladado la reunión del {1} al {2}. Abra Mis casos para unirse a la sala de conferencias.' },
  { match: '{0} moved the meeting from {1} to {2}.', es: '{0} ha trasladado la reunión del {1} al {2}.' },
  { match: '{0} is asking for an urgent call', es: '{0} está pidiendo una llamada urgente' },
  { match: 'On case {0}. Open the case and join the room to answer.', es: 'Sobre el caso {0}. Abra el caso y únase a la sala para responder.' },
];
