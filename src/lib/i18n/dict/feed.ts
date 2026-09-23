import type { Translated } from '../translated';
import type { Dictionary } from '../en';
import { BLOG_KINDS, BLOG_KIND_LABEL } from '@/lib/blog';
import { COMMUNITY_TOPICS, COMMUNITY_TOPIC_HINT, COMMUNITY_TOPIC_LABEL } from '@/lib/community';
import { blogKindLabel, communityTopicHint, communityTopicLabel } from '../labels';

/**
 * Community — the strings, in English first.
 *
 * English is the source of truth: the Spanish object below is typed against it,
 * so a key that exists here and not there is a build error rather than an
 * English sentence on a Spanish page.
 *
 * The words the feed shares with the rest of the site — the three reactions,
 * "Reply", "Comment", "Write a comment…", "Not verified" — and the enum
 * vocabulary in `t.labels.*` (the boards, the kinds, the reactions) are not
 * repeated here. They already live in `community`, `verificationStatus` and the
 * shared label dictionary, and are read from there.
 */
export const feedEn = {
  /**
   * What a post is, as the short chip on its card.
   *
   * Deliberately not `t.labels.blogKind`: that namespace holds the words the
   * composer offers ("Recommend a lawyer or firm"), while the card has always
   * said the shorter "Recommendation". The wording is unchanged.
   */
  kind: {
    recommendation: 'Recommendation',
    question: 'Question',
    note: 'Experience',
  },

  /** The role shown beside an author's name on a post card. */
  author: {
    legalFirm: 'Legal firm',
    lawyer: 'Lawyer',
    client: 'Client',
  },

  reactions: {
    /** The label of a reaction already held; `{label}` is the reaction's name. */
    remove: 'Remove your {label}',
    one: '{count} reaction',
    many: '{count} reactions',
  },

  comments: {
    one: '{count} comment',
    many: '{count} comments',
    seeAll: 'See all {count} comments',
    posted: 'Posted.',
  },

  vote: {
    upvote: 'Upvote',
    removeUpvote: 'Remove your upvote',
    downvote: 'Downvote',
    removeDownvote: 'Remove your downvote',
  },

  composer: {
    board: 'Which board?',
    boardHint: 'The subject, so somebody with the same problem finds it.',
    kind: 'What are you posting?',
    recommend: 'Recommending somebody?',
    recommendHint: 'Optional. Pick a profile from the directory and it appears on their page too.',
    nobody: 'Nobody in particular',
    listingFirm: 'legal firm',
    listingLawyer: 'lawyer',
    title: 'Title',
    titlePlaceholder: 'Recommended for a labour dispute — clear and quick',
    body: 'What happened?',
    bodyHint:
      'What you were dealing with, who helped, and what you would tell somebody in the same position. Never post anything confidential about a case.',
    moderationTitle: 'A moderator reads this first',
    moderationBody:
      'Posts are checked before they appear on the board, mostly so that a question which has already been asked and answered can be pointed at the thread that answers it. Yours is kept while it waits — nothing is lost.',
    sendForReview: 'Send for review',
    sendingForReview: 'Sending for review…',
  },

  /** The plain comment box, where the inline one does not fit. */
  commentForm: {
    posted: 'Posted.',
    reply: 'Reply',
    comment: 'Comment',
    replyPlaceholder: 'Reply to this…',
    addAnswerPlaceholder: 'Add your answer or experience…',
    posting: 'Posting…',
  },

  remove: {
    label: 'Delete',
    confirm: 'Delete your post and its replies? This cannot be undone.',
    pending: 'Deleting…',
  },

  moderation: {
    reason: 'Reason, if you hide it',
    reasonHint: 'Shown to the author. Be plain about what the problem is.',
    hide: 'Hide from the feed',
    remove: 'Remove',
    removeConfirm: 'Remove this post for good?',
    restore: 'Put it back in the feed',
  },

  /** The moderator's decision, on the review tool. */
  review: {
    legend: 'What should happen to it?',
    publishLabel: 'Publish it',
    publishBody: 'It goes on the board and the author is told.',
    duplicateLabel: 'Close it as a repeat',
    duplicateBody: 'The question is already answered elsewhere. Pick which post it repeats.',
    hideLabel: 'Hide it',
    hideBody: 'It leaves the board with a reason the author can read. Reversible.',
    removeLabel: 'Remove it',
    removeBody: 'The end of it. The author is told.',
    duplicateOf: 'Which post does it repeat?',
    duplicateHint: 'The automatic check is ordered by how close each one is.',
    chooseEarlier: 'Choose the earlier post…',
    reason: 'Reason',
    note: 'Note to the author',
    noteHint: 'Shown with the decision. Be plain about what the problem is.',
    alreadyDecided: 'This post has already been decided. Deciding again replaces that decision.',
    save: 'Save the decision',
    saving: 'Saving the decision…',
    reasons: {
      DUPLICATE: 'Already asked and answered',
      NOT_A_LEGAL_TOPIC: 'Not a legal question',
      CONFIDENTIAL_DETAIL: 'Gives away a case',
      ABUSIVE: 'Abusive',
      ADVERTISING: 'Advertising',
      OTHER: 'Something else',
    },
  },
};

export type FeedDict = Translated<typeof feedEn>;

export const feedEs: FeedDict = {
  kind: {
    recommendation: 'Recomendación',
    question: 'Pregunta',
    note: 'Experiencia',
  },

  author: {
    legalFirm: 'Despacho',
    lawyer: 'Abogado',
    client: 'Cliente',
  },

  reactions: {
    remove: 'Quitar su reacción «{label}»',
    one: '{count} reacción',
    many: '{count} reacciones',
  },

  comments: {
    one: '{count} comentario',
    many: '{count} comentarios',
    seeAll: 'Ver los {count} comentarios',
    posted: 'Publicado.',
  },

  vote: {
    upvote: 'Voto a favor',
    removeUpvote: 'Quitar su voto a favor',
    downvote: 'Voto en contra',
    removeDownvote: 'Quitar su voto en contra',
  },

  composer: {
    board: '¿En qué tablero?',
    boardHint: 'El tema, para que alguien con el mismo problema lo encuentre.',
    kind: '¿Qué va a publicar?',
    recommend: '¿Recomienda a alguien?',
    recommendHint: 'Opcional. Elija un perfil del directorio y aparecerá también en su página.',
    nobody: 'Nadie en particular',
    listingFirm: 'despacho',
    listingLawyer: 'abogado',
    title: 'Título',
    titlePlaceholder: 'Recomendado para un conflicto laboral: claro y rápido',
    body: '¿Qué ocurrió?',
    bodyHint:
      'Con qué se enfrentaba, quién le ayudó y qué le diría a alguien en su misma situación. No publique nunca nada confidencial sobre un caso.',
    moderationTitle: 'Un moderador lo lee primero',
    moderationBody:
      'Las publicaciones se revisan antes de aparecer en el tablero, sobre todo para poder remitir al hilo que responde a una pregunta ya formulada y respondida. La suya se conserva mientras espera: no se pierde nada.',
    sendForReview: 'Enviar a revisión',
    sendingForReview: 'Enviando a revisión…',
  },

  commentForm: {
    posted: 'Publicado.',
    reply: 'Responder',
    comment: 'Comentar',
    replyPlaceholder: 'Responder a esto…',
    addAnswerPlaceholder: 'Añada su respuesta o su experiencia…',
    posting: 'Publicando…',
  },

  remove: {
    label: 'Eliminar',
    confirm: '¿Eliminar su publicación y sus respuestas? Esta acción no se puede deshacer.',
    pending: 'Eliminando…',
  },

  moderation: {
    reason: 'Motivo, si la oculta',
    reasonHint: 'Se muestra al autor. Sea claro sobre cuál es el problema.',
    hide: 'Ocultar del muro',
    remove: 'Eliminar',
    removeConfirm: '¿Eliminar esta publicación definitivamente?',
    restore: 'Volver a ponerla en el muro',
  },

  review: {
    legend: '¿Qué debería ocurrir con ella?',
    publishLabel: 'Publicarla',
    publishBody: 'Aparece en el tablero y se avisa al autor.',
    duplicateLabel: 'Cerrarla por repetida',
    duplicateBody: 'La pregunta ya está respondida en otro lugar. Elija la publicación que repite.',
    hideLabel: 'Ocultarla',
    hideBody: 'Sale del tablero con un motivo que el autor puede leer. Reversible.',
    removeLabel: 'Eliminarla',
    removeBody: 'Se acaba aquí. Se avisa al autor.',
    duplicateOf: '¿Qué publicación repite?',
    duplicateHint: 'La comprobación automática va ordenada de mayor a menor parecido.',
    chooseEarlier: 'Elija la publicación anterior…',
    reason: 'Motivo',
    note: 'Nota para el autor',
    noteHint: 'Se muestra con la decisión. Sea claro sobre cuál es el problema.',
    alreadyDecided: 'Esta publicación ya se ha decidido. Volver a decidir sustituye esa decisión.',
    save: 'Guardar la decisión',
    saving: 'Guardando la decisión…',
    reasons: {
      DUPLICATE: 'Ya se preguntó y se respondió',
      NOT_A_LEGAL_TOPIC: 'No es una cuestión jurídica',
      CONFIDENTIAL_DETAIL: 'Revela datos de un caso',
      ABUSIVE: 'Abusiva',
      ADVERTISING: 'Publicidad',
      OTHER: 'Otro motivo',
    },
  },
};

/**
 * The composer's words, plus the board and kind names, ready for the client
 * component. `submit` is overridable because the landing panel's button has
 * always said "Write a post" while the board's says "Send for review".
 */
export type ComposerLabels = FeedDict['composer'] & {
  submit: string;
  submitPending: string;
  /** The boards and the kinds, keyed by the code stored with a post. */
  topics: Record<string, string>;
  topicHints: Record<string, string>;
  kinds: Record<string, string>;
};

/** Resolves the composer's labels — sentences and enum names — for one request. */
export function composerLabels(
  t: Dictionary,
  submit?: { label: string; pending: string },
): ComposerLabels {
  const topics: Record<string, string> = {};
  const topicHints: Record<string, string> = {};
  for (const topic of COMMUNITY_TOPICS) {
    topics[topic.value] = communityTopicLabel(t, topic.value);
    topicHints[topic.value] = communityTopicHint(t, topic.value);
  }
  const kinds: Record<string, string> = {};
  for (const kind of BLOG_KINDS) kinds[kind.value] = blogKindLabel(t, kind.value);

  return {
    ...t.feed.composer,
    submit: submit?.label ?? t.feed.composer.sendForReview,
    submitPending: submit?.pending ?? t.feed.composer.sendingForReview,
    topics,
    topicHints,
    kinds,
  };
}

/**
 * The English fallback, so a parent that has not been wired yet still renders
 * exactly the words it did before rather than a blank.
 */
export const composerLabelsEn: ComposerLabels = {
  ...feedEn.composer,
  submit: feedEn.composer.sendForReview,
  submitPending: feedEn.composer.sendingForReview,
  topics: COMMUNITY_TOPIC_LABEL,
  topicHints: COMMUNITY_TOPIC_HINT,
  kinds: BLOG_KIND_LABEL,
};
