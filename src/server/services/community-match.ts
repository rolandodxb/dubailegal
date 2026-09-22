/**
 * Is this question already on the board?
 *
 * A moderator's real job when a post arrives is not to judge the writing, it is
 * to notice that somebody asked the same thing last week. That is a job a
 * machine can do most of: compare the words in the new post with the words in
 * the posts already published, weight the rare ones more heavily than the common
 * ones, and show a moderator the closest matches with the reason.
 *
 * It is deliberately simple and explainable. No model, no service, no network:
 * a moderator can read why a post was flagged, which is the only way they can
 * overrule it with confidence.
 *
 * The score is a **suggestion**, never a decision. Nothing here publishes,
 * hides or rejects anything on its own.
 */

/** Words that carry no signal in a question, so they are ignored entirely. */
const STOPWORDS = new Set([
  'a', 'about', 'after', 'again', 'against', 'all', 'also', 'am', 'an', 'and', 'any', 'are', 'as',
  'at', 'be', 'because', 'been', 'before', 'being', 'between', 'both', 'but', 'by', 'can', 'cannot',
  'could', 'did', 'do', 'does', 'doing', 'done', 'during', 'each', 'few', 'for', 'from', 'further',
  'get', 'got', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'him', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'me', 'more', 'most', 'my', 'no', 'nor', 'not',
  'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'out', 'over', 'own', 'same',
  'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'them', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'us', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will',
  'with', 'would', 'you', 'your', 'yours', 'uae', 'dubai', 'abu', 'dhabi', 'emirates', 'please',
  'help', 'need', 'want', 'know', 'anyone', 'somebody', 'guys', 'thanks', 'thank', 'hi', 'hello',
]);

/** A crude stem, enough to match "dismissed" with "dismissal". */
function stem(word: string): string {
  return word
    .replace(/(ations?|ments?|ings?|ies|ed|es|s)$/, '')
    .replace(/([^aeiou])y$/, '$1');
}

/** The words worth comparing: lower case, letters only, no filler. */
export function keywords(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .map((word) => word.replace(/^\p{N}+|\p{N}+$/gu, ''))
    .filter((word) => word.length >= 4)
    .map(stem)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
}

export type ComparablePost = {
  id: string;
  title: string;
  body: string;
  topic: string;
  createdAt?: Date;
};

export type SimilarityMatch = {
  score: number;
  sharedTerms: string[];
  titleOverlap: number;
};

/**
 * How close two posts are, from 0 to 1.
 *
 * The title counts double, because two posts called "unpaid wages for three
 * months" are almost certainly the same question however differently they are
 * written underneath. A term that appears in both titles is worth more than one
 * that appears in both bodies, and a term that is rare across the board is worth
 * more than "contract", which is in everything.
 */
export function similarity(
  a: ComparablePost,
  b: ComparablePost,
  documentFrequency: Map<string, number> = new Map(),
  corpusSize = 1,
): SimilarityMatch {
  const weight = (term: string) => {
    const appearances = documentFrequency.get(term) ?? 1;
    // Inverse document frequency, damped so one rare word cannot dominate.
    return 1 + Math.log(1 + corpusSize / appearances);
  };

  const titleA = new Set(keywords(a.title));
  const titleB = new Set(keywords(b.title));
  const bodyA = new Set([...keywords(a.title), ...keywords(a.body)]);
  const bodyB = new Set([...keywords(b.title), ...keywords(b.body)]);

  const terms = new Set([...bodyA, ...bodyB]);
  let shared = 0;
  let total = 0;
  const sharedTerms: { term: string; weight: number }[] = [];

  for (const term of terms) {
    const inA = bodyA.has(term) ? weight(term) * (titleA.has(term) ? 2 : 1) : 0;
    const inB = bodyB.has(term) ? weight(term) * (titleB.has(term) ? 2 : 1) : 0;
    if (inA === 0 && inB === 0) continue;
    shared += Math.min(inA, inB);
    total += Math.max(inA, inB);
    if (inA > 0 && inB > 0) sharedTerms.push({ term, weight: Math.min(inA, inB) });
  }

  const dice = total === 0 ? 0 : shared / total;
  const titleOverlap =
    titleA.size === 0 || titleB.size === 0
      ? 0
      : [...titleA].filter((term) => titleB.has(term)).length / Math.min(titleA.size, titleB.size);

  // The same board is a weak signal on its own, but it is a real one: two posts
  // on the pay board are likelier to be the same question than two on different
  // boards.
  const sameTopic = a.topic === b.topic ? 0.08 : 0;
  const score = Math.min(1, dice * 0.7 + titleOverlap * 0.3 + sameTopic);

  return {
    score: Math.round(score * 1000) / 1000,
    sharedTerms: sharedTerms
      .sort((left, right) => right.weight - left.weight)
      .slice(0, 8)
      .map((entry) => entry.term),
    titleOverlap: Math.round(titleOverlap * 1000) / 1000,
  };
}

/** Scores above this are worth showing a moderator. */
export const SIMILARITY_THRESHOLD = 0.14;

/**
 * The closest existing posts to this one, best first.
 *
 * Compares against a bounded recent window rather than the whole table: a
 * question asked two years ago is not the same question, and the window keeps
 * the check instant at any size.
 */
export function rankSimilar(
  target: ComparablePost,
  candidates: ComparablePost[],
  limit = 5,
): { post: ComparablePost; match: SimilarityMatch }[] {
  const corpus = [target, ...candidates];
  const documentFrequency = new Map<string, number>();
  for (const post of corpus) {
    for (const term of new Set([...keywords(post.title), ...keywords(post.body)])) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  return candidates
    .map((post) => ({
      post,
      match: similarity(target, post, documentFrequency, corpus.length),
    }))
    .filter((entry) => entry.match.score >= SIMILARITY_THRESHOLD)
    .sort((left, right) => right.match.score - left.match.score)
    .slice(0, limit);
}

/** How alike two posts are, in the words a moderator would use. */
export function describeMatch(match: SimilarityMatch): string {
  const percent = Math.round(match.score * 100);
  if (match.sharedTerms.length === 0) return `${percent}% alike`;
  return `${percent}% alike · ${match.sharedTerms.join(', ')}`;
}
