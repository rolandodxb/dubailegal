import type { Translated } from '../translated';

/**
 * The emergency forms — the busiest shared component in the app.
 *
 * Eight small forms, used by the public emergency page, the guest room, a firm's
 * own lawyer list and the professional's emergency desk. They are not one area's
 * words, which is why they live here rather than in any of the page dictionaries.
 *
 * One group per form, in the order they appear in `EmergencyForms.tsx`. The
 * component is a client component, so the page that renders it hands each form
 * its group as `labels`.
 */
export const emergencyEn = {
  /** The form a member fills in to raise an urgent request. */
  request: {
    sentTitle: 'Your request is out',
    failedTitle: 'The request was not sent',
    title: 'What has happened?',
    titleHint: 'A few words — for example “Police questioning tonight”.',
    areaOfLaw: 'Area of law',
    description: 'What do you need right now?',
    descriptionHint:
      'At least 30 characters. A professional reads this before calling you back.',
    phone: 'Number to call you back on',
    phoneHint:
      'This is shared with the professionals who take emergencies. It may differ from your profile number.',
    dangerTitle: 'Before you send',
    dangerBody:
      'Your request goes to every professional who takes emergencies. It is not a substitute for the police, an ambulance or emergency services — if somebody is in danger, call your local emergency number first.',
    pending: 'Sending to every emergency lawyer…',
    submit: 'Send my urgent request',
  },

  /** A professional takes an urgent request, opening and assigning a case. */
  accept: {
    pending: 'Taking it…',
    confirm: 'Take this urgent request? A case will be opened and assigned to you.',
    submit: 'Take this case',
  },

  /** A member withdraws their own urgent request. */
  cancel: {
    confirm: 'Withdraw your urgent request?',
    submit: 'Withdraw',
  },

  /** A lawyer turns their own emergency availability on or off. */
  availability: {
    available: 'Available for emergencies',
    notAvailable: 'Not available for emergencies',
    pending: 'Saving…',
    stop: 'Stop taking emergencies',
    start: 'Make me available',
  },

  /** The note a lawyer shows alongside that availability. */
  note: {
    label: 'What you cover, and when',
    hint: 'Shown with your availability, for example “Criminal matters, 24/7” or “Urgent injunctions, weekdays”.',
    pending: 'Saving…',
    submit: 'Save availability note',
  },

  /** A firm names one of its lawyers as its always-active emergency contact. */
  firm: {
    pending: 'Saving…',
    removeConfirm: "Remove {name} as your firm's emergency contact?",
    makeConfirm:
      "Make {name} your firm's emergency contact? Urgent requests will be assigned to them directly.",
    active: 'Emergency contact',
    make: 'Make emergency contact',
  },

  /** The caller calls the whole thing off, from inside the room. */
  cancelGuest: {
    confirm:
      'Cancel this urgent request? Every lawyer who saw it is told it is over, and the room closes.',
    pending: 'Cancelling…',
    submit: 'Cancel this urgent request',
    note: 'Pressed it by mistake, or no longer need a lawyer? This stops the request immediately.',
  },

  /** The professional who answered ends the call. */
  close: {
    confirm: 'End this call and mark the request as dealt with? The caller is told.',
    pending: 'Closing…',
    submit: 'End the call',
  },
};

export type EmergencyDict = Translated<typeof emergencyEn>;

export const emergencyEs: EmergencyDict = {
  request: {
    sentTitle: 'Su solicitud ya se ha enviado',
    failedTitle: 'No se envió la solicitud',
    title: '¿Qué ha ocurrido?',
    titleHint: 'Unas pocas palabras — por ejemplo, «Interrogatorio policial esta noche».',
    areaOfLaw: 'Área del derecho',
    description: '¿Qué necesita ahora mismo?',
    descriptionHint: 'Al menos 30 caracteres. Un profesional lo lee antes de devolverle la llamada.',
    phone: 'Número en el que devolverle la llamada',
    phoneHint:
      'Se comparte con los profesionales que atienden urgencias. Puede ser distinto del número de su perfil.',
    dangerTitle: 'Antes de enviar',
    dangerBody:
      'Su solicitud llega a todos los profesionales que atienden urgencias. No sustituye a la policía, a una ambulancia ni a los servicios de emergencia: si alguien está en peligro, llame primero al número de emergencias local.',
    pending: 'Enviando a todos los abogados de urgencias…',
    submit: 'Enviar mi solicitud urgente',
  },

  accept: {
    pending: 'Aceptando…',
    confirm: '¿Aceptar esta solicitud urgente? Se abrirá un caso y se le asignará a usted.',
    submit: 'Aceptar este caso',
  },

  cancel: {
    confirm: '¿Retirar su solicitud urgente?',
    submit: 'Retirar',
  },

  availability: {
    available: 'Disponible para urgencias',
    notAvailable: 'No disponible para urgencias',
    pending: 'Guardando…',
    stop: 'Dejar de atender urgencias',
    start: 'Ponerme disponible',
  },

  note: {
    label: 'Qué cubre y cuándo',
    hint: 'Se muestra con su disponibilidad; por ejemplo, «Asuntos penales, 24/7» o «Medidas cautelares urgentes, días laborables».',
    pending: 'Guardando…',
    submit: 'Guardar la nota de disponibilidad',
  },

  firm: {
    pending: 'Guardando…',
    removeConfirm: '¿Quitar a {name} como contacto de urgencias de su despacho?',
    makeConfirm:
      '¿Nombrar a {name} contacto de urgencias de su despacho? Las solicitudes urgentes se le asignarán directamente.',
    active: 'Contacto de urgencias',
    make: 'Nombrar contacto de urgencias',
  },

  cancelGuest: {
    confirm:
      '¿Cancelar esta solicitud urgente? Se avisa a todos los abogados que la vieron de que ha terminado, y la sala se cierra.',
    pending: 'Cancelando…',
    submit: 'Cancelar esta solicitud urgente',
    note: '¿La ha pulsado por error o ya no necesita un abogado? Esto detiene la solicitud de inmediato.',
  },

  close: {
    confirm: '¿Dar por terminada esta llamada y marcar la solicitud como atendida? Se avisa a quien llamó.',
    pending: 'Cerrando…',
    submit: 'Terminar la llamada',
  },
};
