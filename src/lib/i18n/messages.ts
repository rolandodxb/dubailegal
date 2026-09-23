import type { Locale } from './locales';
import { messagesEs, messagesEsFragments, messagesEsPatterns } from './dict/messages';

/**
 * The reader's language for a server-returned message. English passes through untouched.
 *
 * Services and actions return plain English sentences with no request context, so rather
 * than thread a dictionary through every call site the boundary looks the exact sentence
 * up here. A sentence with no entry is returned unchanged: a visible English sentence is
 * a gap, while a guessed translation would be a wrong word.
 */
export function messageTranslator(locale: Locale | undefined): (message: string) => string {
  // English passes through byte for byte, which is what keeps the English build and the
  // existing test suites identical. Any language without a catalogue behaves the same way.
  if (locale !== 'es') return (message) => message;

  const table = messagesEs;

  return (message) => {
    // An exact match is always preferred, so a pattern can never shadow a full sentence.
    const exact = table[message];
    if (exact !== undefined) return exact;

    for (const pattern of PATTERNS) {
      const captured = pattern.regex.exec(message);
      if (captured === null) continue;

      // The template's placeholders are numbered in appearance order, while the Spanish
      // may use them in a different order and more than once, so map number -> value.
      const values: Record<string, string> = {};
      let translated = true;

      pattern.order.forEach((number, index) => {
        const raw = captured[index + 1] ?? '';
        // A name pasted into the sentence has to be translated too. When one is not
        // known, this pattern is abandoned rather than producing "Nombre completo is
        // required." — half a sentence in each language is worse than all of it in one.
        if (pattern.fragments) {
          const localised = localiseFragment(raw);
          if (localised === null) {
            translated = false;
            return;
          }
          values[number] = localised;
          return;
        }
        values[number] = raw;
      });

      if (!translated) continue;

      return pattern.es.replace(/\{(\d+)\}/g, (whole, digits: string) =>
        digits in values ? values[digits]! : whole,
      );
    }

    // Still nothing: hand the English back rather than inventing a translation.
    return message;
  };
}

type CompiledPattern = { regex: RegExp; order: number[]; es: string; fragments: boolean };

/** Escapes the literal parts of a template so they are matched, not interpreted. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a whole-message matcher from a template such as `Attach at most {0} files.`
 *
 * Each `{n}` becomes a non-greedy capture, so it takes the shortest run of characters
 * that still lets the rest of the template match. `order` records which placeholder
 * number each capture belongs to.
 */
function compile(entry: (typeof messagesEsPatterns)[number]): CompiledPattern {
  const { match, es, fragments = false } = entry;
  const parts = match.split(/\{(\d+)\}/g);
  const order: number[] = [];
  let source = '^';
  parts.forEach((part, index) => {
    if (index % 2 === 0) {
      source += escapeRegExp(part);
    } else {
      source += '(.*?)';
      order.push(Number(part));
    }
  });
  source += '$';
  return { regex: new RegExp(source, 's'), order, es, fragments };
}

/**
 * A name from inside a sentence, in Spanish — or `null` when one is not known.
 *
 * A field list arrives as "Full name, Date of birth" and a document list as
 * "Passport; Emirates ID", so the separators are preserved and each part is looked
 * up on its own. A number passes straight through, because a count is a count in
 * both languages.
 */
function localiseFragment(value: string): string | null {
  const tokens = value.split(/(\s*,\s*|\s*;\s*|\s+and\s+)/);
  let out = '';

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;

    // The odd tokens are the separators, kept exactly as they arrived.
    if (index % 2 === 1) {
      out += token;
      continue;
    }

    if (/^\d+$/.test(token)) {
      out += token;
      continue;
    }

    const known = messagesEsFragments[token];
    if (known === undefined) return null;
    out += known;
  }

  return out;
}

/** Compiled once at module load; the list is short and frozen. */
const PATTERNS: CompiledPattern[] = messagesEsPatterns.map(compile);

/**
 * A field's name on its own, for the places that list what is missing.
 *
 * The catalogue above translates whole sentences and, for the sentences that
 * paste a field name into them, refuses to translate at all unless the name is
 * known. This is that same name lookup, for the callers that want only the names
 * — "Falta: Nombre completo, Fecha de nacimiento" — rather than a sentence.
 */
export function fieldName(locale: Locale | undefined, name: string): string {
  if (locale !== 'es') return name;
  return localiseFragment(name) ?? name;
}
