/** Public, deterministic orientation. This is neither a live model nor an action executor. */
import siteMap from '../../config/site-map.json' with { type: 'json' };

export type Locale = 'de' | 'nl' | 'fr';
export type PageContext = { page_id: string; path: string };
type Localized = Record<Locale, string>;
type SourcePage = { id: string; path: string; title: Localized; summary: Localized;
  access: { visibility: string; auth_required: boolean }; next_actions?: { type: string; target_id?: string }[] };
type PublicPage = { id: string; path: string; title: Localized; summary: Localized; nextIds: string[] };

const allowed = new Set(siteMap.public_allowlist);
const publicPages: PublicPage[] = (siteMap.pages as SourcePage[])
  .filter(page => allowed.has(page.id) && page.access.visibility === 'public' && page.access.auth_required === false)
  .map(page => ({ id: page.id, path: page.path, title: page.title, summary: page.summary,
    nextIds: (page.next_actions ?? []).filter(action => action.type === 'route' && typeof action.target_id === 'string')
      .map(action => action.target_id!) }));
const byPath = new Map(publicPages.map(page => [page.path, page]));
const byId = new Map(publicPages.map(page => [page.id, page]));

export class InputError extends Error {
  status: number;
  constructor(code: string, status = 422) { super(code); this.status = status; }
}

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new InputError('invalid_object');
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowedKeys: string[]) {
  if (Object.keys(value).some(key => !allowedKeys.includes(key))) throw new InputError('unexpected_field');
}
function sdkId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) throw new InputError('invalid_message_id');
  return value;
}
function plainText(value: unknown): string {
  if (typeof value !== 'string' || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) throw new InputError('invalid_text');
  return value;
}

export function validateOrientationInput(raw: unknown): { locale: Locale; context: PageContext; question: string } {
  const body = object(raw);
  keys(body, ['id', 'trigger', 'messageId', 'messages', 'page_path', 'locale']);
  if ('id' in body) sdkId(body.id);
  if ('trigger' in body && body.trigger !== 'submit-message' && body.trigger !== 'regenerate-message') throw new InputError('invalid_trigger');
  if ('messageId' in body) sdkId(body.messageId);
  if (body.locale !== 'de' && body.locale !== 'nl' && body.locale !== 'fr') throw new InputError('invalid_locale');
  if (typeof body.page_path !== 'string' || body.page_path.length > 240 || !byPath.has(body.page_path)) throw new InputError('invalid_public_page_context');
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 12) throw new InputError('invalid_message_count');
  const ids = new Set<string>();
  let characters = 0;
  let question = '';
  for (const rawMessage of body.messages) {
    const message = object(rawMessage);
    keys(message, ['id', 'role', 'parts']);
    const id = sdkId(message.id);
    if (ids.has(id)) throw new InputError('duplicate_message_id');
    ids.add(id);
    if (message.role !== 'user' && message.role !== 'assistant') throw new InputError('invalid_message_role');
    if (!Array.isArray(message.parts) || message.parts.length === 0 || message.parts.length > 12) throw new InputError('invalid_text_parts');
    const texts: string[] = [];
    for (const rawPart of message.parts) {
      const part = object(rawPart);
      keys(part, ['type', 'text', 'state']);
      if (part.type !== 'text') throw new InputError('text_parts_only');
      if ('state' in part && part.state !== 'streaming' && part.state !== 'done') throw new InputError('invalid_text_state');
      const text = plainText(part.text);
      characters += text.length;
      if (characters > 3000) throw new InputError('message_text_limit');
      texts.push(text);
    }
    if (message.role === 'user') question = texts.join(' ').trim();
  }
  if (!question) throw new InputError('user_question_required');
  if ('messageId' in body && !ids.has(body.messageId as string)) throw new InputError('unknown_message_id');
  const page = byPath.get(body.page_path)!;
  return { locale: body.locale, context: { page_id: page.id, path: page.path }, question };
}

const copy = {
  de: { heading: 'Textgeführte Orientierung ohne Live-KI.', limits: 'Diese Vorschau nutzt öffentliche Seiteninformationen und einen einfachen Wortabgleich. Dieser Webdienst speichert keinen Gesprächsverlauf und nutzt keine Sitzung. Er versendet nichts, bucht keine Termine und verändert keine Konten oder Guthaben.',
    current: 'Auf dieser Seite', next: 'Passende öffentliche Informationen und nächste Schritte', ending: 'Über diese Links kannst du dein Vorhaben weiter vorbereiten. Hier wurde keine Aktion ausgeführt.' },
  nl: { heading: 'Tekstgestuurde oriëntatie zonder live-AI.', limits: 'Deze preview gebruikt openbare pagina-informatie en eenvoudige woordherkenning. Deze webdienst slaat geen gespreksgeschiedenis op en gebruikt geen sessie. Er worden geen berichten verzonden, afspraken geboekt of accounts en tegoeden gewijzigd.',
    current: 'Op deze pagina', next: 'Passende openbare informatie en volgende stappen', ending: 'Via deze links kun je je project verder voorbereiden. Hier is geen actie uitgevoerd.' },
  fr: { heading: 'Orientation textuelle sans IA en direct.', limits: 'Cet aperçu utilise les informations publiques des pages et une simple comparaison de mots. Ce service web n’enregistre pas l’historique de la conversation et n’utilise aucune session. Aucun message n’est envoyé, aucun rendez-vous n’est réservé et aucun compte ou crédit n’est modifié.',
    current: 'Sur cette page', next: 'Informations publiques pertinentes et prochaines étapes', ending: 'Ces liens te permettent de préparer la suite de ton projet. Aucune action n’a été effectuée ici.' },
};
const stopWords = new Set(['eine', 'einen', 'einem', 'einer', 'für', 'und', 'mit', 'ich', 'sie', 'das', 'die', 'der', 'wie', 'was', 'ist', 'the', 'and', 'een', 'van', 'met', 'voor', 'les', 'des', 'une', 'pour', 'avec']);
function words(text: string): Set<string> {
  return new Set((text.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter(word => !stopWords.has(word)));
}

export function publicOrientation(input: ReturnType<typeof validateOrientationInput>): string {
  const page = byPath.get(input.context.path);
  if (!page || page.id !== input.context.page_id) throw new InputError('invalid_public_page_context');
  const terms = words(input.question);
  const candidates = publicPages.filter(candidate => candidate.id !== page.id).map(candidate => {
    const vocabulary = words(candidate.title[input.locale] + ' ' + candidate.summary[input.locale]);
    return { page: candidate, score: [...terms].filter(word => vocabulary.has(word)).length };
  }).filter(candidate => candidate.score > 0).sort((a, b) => b.score - a.score || a.page.id.localeCompare(b.page.id)).slice(0, 2).map(candidate => candidate.page);
  const next = [...new Map([...candidates, ...page.nextIds.map(id => byId.get(id)).filter((value): value is PublicPage => value !== undefined)]
    .filter(candidate => candidate.id !== page.id).map(candidate => [candidate.id, candidate])).values()].slice(0, 4);
  const c = copy[input.locale];
  const links = next.map(candidate => `- [${candidate.title[input.locale]}](${candidate.path}): ${candidate.summary[input.locale]}`).join('\n');
  return `${c.heading}\n\n${c.limits}\n\n${c.current}: ${page.title[input.locale]}\n${page.summary[input.locale]}\n\n${c.next}:\n${links || `[${page.title[input.locale]}](${page.path})`}\n\n${c.ending}`;
}
