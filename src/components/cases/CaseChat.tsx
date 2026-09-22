'use client';

import {
  useActionState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { postCaseMessageAction } from '@/app/actions/case-actions';
import { initialFormState } from '@/lib/form-state';
import { formatUaeDateTime } from '@/lib/time';
import { Avatar } from '@/components/Avatar';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, buttonClasses, cx } from '@/components/ui/primitives';
import { formatFileSize } from '@/lib/format';
import { Icon } from '@/components/icons';
import { PaymentBubble, type ChatPayment } from './PaymentBubble';
import { LogoMark } from '@/components/layout/Logo';

export type ChatAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type ChatMessage = {
  id: string;
  body: string;
  /** Files sent with the message, if any. */
  attachments?: ChatAttachment[];
  /** A Date on first render, a string when fetched from the API. */
  createdAt: string | Date;
  authorId: string;
  author: {
    id: string;
    email: string;
    profile: { fullName: string; avatarDocumentId: string | null } | null;
  };
};

/** Groups consecutive messages from the same author, as a chat client does. */
function isSameSpeaker(a: ChatMessage, b: ChatMessage): boolean {
  return a.authorId === b.authorId && Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) < 5 * 60 * 1000;
}

/**
 * The conversation inside a case.
 *
 * Laid out like a messenger rather than a form field: the panel fills the
 * available height, the thread scrolls, and the composer stays anchored at the
 * bottom and grows as you type. Scrolling to the top loads older messages and
 * keeps the reading position steady.
 */
export function CaseChat({
  caseId,
  initialMessages,
  hasMoreInitially,
  viewerId,
  isClient,
  payments = [],
  disabled,
  disabledReason,
}: {
  caseId: string;
  initialMessages: ChatMessage[];
  hasMoreInitially: boolean;
  viewerId: string;
  /** Whether the viewer is the client, which decides who can pay a fee. */
  isClient: boolean;
  /** Fee requests, shown in the thread beside the messages. */
  payments?: ChatPayment[];
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [state, formAction] = useActionState(postCaseMessageAction, initialFormState);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [pending, setPending] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Take a file back off the list, and clear it from the input as well. */
  const removeFile = useCallback(
    (index: number) => {
      setPending((current) => current.filter((_, position) => position !== index));
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [],
  );
  const [hasMore, setHasMore] = useState(hasMoreInitially);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** Scroll height captured before older messages are prepended. */
  const pendingScrollHeight = useRef<number | null>(null);
  const firstRender = useRef(true);

  // ── Load older messages when the top comes into view ───────────────────────
  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    const container = scrollRef.current;
    if (!container) return;

    setLoadingOlder(true);
    pendingScrollHeight.current = container.scrollHeight;

    try {
      const response = await fetch(
        `/api/cases/${caseId}/messages?before=${encodeURIComponent(messages[0]!.id)}`,
        { headers: { accept: 'application/json' } },
      );
      if (!response.ok) {
        setHasMore(false);
        return;
      }
      const payload = (await response.json()) as { messages: ChatMessage[]; hasMore: boolean };
      setMessages((current) => [...payload.messages, ...current]);
      setHasMore(payload.hasMore);
    } catch {
      // A failed page of history is not worth interrupting the conversation for.
      setHasMore(false);
    } finally {
      setLoadingOlder(false);
    }
  }, [caseId, hasMore, loadingOlder, messages]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = scrollRef.current;
    if (!sentinel || !container || disabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadOlder();
      },
      { root: container, rootMargin: '120px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadOlder, disabled]);

  // Keep the reader where they were when history is prepended; otherwise pin to
  // the newest message.
  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (pendingScrollHeight.current !== null) {
      container.scrollTop = container.scrollHeight - pendingScrollHeight.current;
      pendingScrollHeight.current = null;
      return;
    }
    if (firstRender.current) {
      firstRender.current = false;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // A sent message should appear at the bottom straight away.
  useEffect(() => {
    if (state?.ok) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
      if (textareaRef.current) {
        textareaRef.current.value = '';
        textareaRef.current.style.height = 'auto';
      }
      setPending([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [state]);

  // Re-fetch nothing: the action revalidates the route, which re-renders this
  // component with fresh props. Merge anything the server now knows about.
  useEffect(() => {
    setMessages((current) => {
      const known = new Set(current.map((message) => message.id));
      const additions = initialMessages.filter((message) => !known.has(message.id));
      return additions.length === 0 ? current : [...current, ...additions];
    });
  }, [initialMessages]);

  /**
   * Messages and fee requests in one thread, ordered by time.
   *
   * A fee request is part of the conversation — that is where both sides are
   * already talking — so it is woven in rather than exiled to another screen.
   * Payments are never paged, because a case has few and they must all stay
   * visible.
   */
  const timeline = useMemo(() => {
    const items: (
      | { kind: 'message'; at: number; message: ChatMessage; index: number }
      | { kind: 'payment'; at: number; payment: ChatPayment }
    )[] = [
      ...messages.map((message, index) => ({
        kind: 'message' as const,
        at: new Date(message.createdAt).getTime(),
        message,
        index,
      })),
      ...payments.map((payment) => ({
        kind: 'payment' as const,
        at: new Date(payment.createdAt).getTime(),
        payment,
      })),
    ];
    return items.sort((a, b) => a.at - b.at);
  }, [messages, payments]);

  const grow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {/* ── Who this conversation is with ───────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <LogoMark size={26} />
          <div>
            <p className="text-xs font-semibold text-slate-900">Dubai Legal</p>
            <p className="text-[11px] text-slate-500">
              Case conversation · private to the two parties on this case
            </p>
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Icon name="lock" size={12} />
          Messages and files are encrypted
        </p>
      </div>

      {/* ── Thread ─────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="h-[calc(100dvh-28rem)] min-h-[20rem] overflow-y-auto overscroll-contain px-4 py-4 sm:h-[30rem] lg:h-[calc(100dvh-20rem)] lg:min-h-[28rem]"
      >
        <div ref={topSentinelRef} aria-hidden="true" className="h-px w-full" />

        {loadingOlder ? (
          <p className="py-3 text-center text-xs text-slate-500">Loading earlier messages…</p>
        ) : hasMore ? (
          <p className="py-3 text-center text-xs text-slate-400">
            Scroll up for earlier messages
          </p>
        ) : timeline.length > 0 ? (
          <p className="py-3 text-center text-xs text-slate-400">This is the start of the case.</p>
        ) : null}

        {/* The empty state depends on the whole thread, not just the messages:
            a fee request on a case nobody has written in yet must still show. */}
        {timeline.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No messages yet. Anything you write here is visible to the other party on this case.
          </p>
        ) : (
          <ul className="space-y-1">
            {timeline.map((item) => {
              if (item.kind === 'payment') {
                return (
                  <PaymentBubble key={`pay-${item.payment.id}`} payment={item.payment} isClient={isClient} />
                );
              }

              const { message, index } = item;
              const mine = message.authorId === viewerId;
              const name = message.author.profile?.fullName?.trim() || message.author.email || 'Member';
              const previous = index > 0 ? messages[index - 1] : undefined;
              const grouped = previous ? isSameSpeaker(previous, message) : false;

              return (
                <li key={message.id} className={cx('flex gap-2.5', mine && 'flex-row-reverse')}>
                  <span className={cx('w-8 shrink-0', grouped && 'invisible')}>
                    <Avatar
                      userId={message.authorId}
                      name={name}
                      hasPhoto={Boolean(message.author.profile?.avatarDocumentId)}
                      size={32}
                    />
                  </span>

                  <div className={cx('max-w-[75%] min-w-0', mine && 'text-right')}>
                    {!grouped ? (
                      <p className="mb-1 px-1 text-[11px] text-slate-500">
                        {mine ? 'You' : name} ·{' '}
                        {formatUaeDateTime(new Date(message.createdAt))}
                      </p>
                    ) : null}
                    {message.body ? (
                      <div
                        className={cx(
                          'inline-block whitespace-pre-line break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed text-left',
                          mine
                            ? 'bg-brand-700 text-white'
                            : 'border border-slate-200 bg-white text-slate-800',
                        )}
                      >
                        {message.body}
                      </div>
                    ) : null}

                    {message.attachments && message.attachments.length > 0 ? (
                      <ul className={cx('mt-1 space-y-1', mine && 'text-right')}>
                        {message.attachments.map((attachment) => (
                          <li key={attachment.id}>
                            <a
                              href={`/api/case-files/${attachment.id}`}
                              className={cx(
                                'inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs',
                                mine
                                  ? 'border-brand-200 bg-white text-brand-900 hover:bg-brand-50'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                              )}
                            >
                              <Icon name="paperclip" size={14} />
                              <span className="min-w-0">
                                <span className="block max-w-64 truncate font-medium">
                                  {attachment.fileName}
                                </span>
                                <span className="block text-[11px] text-slate-500">
                                  {formatFileSize(attachment.sizeBytes)} ·{' '}
                                  {attachment.fileName.split('.').pop()?.toUpperCase() ?? 'FILE'}
                                </span>
                              </span>
                              <Icon name="download" size={14} />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Composer ───────────────────────────────────────────────────── */}
      {disabled ? (
        <div className="border-t border-slate-200 bg-white p-4">
          <Alert tone="neutral">
            {disabledReason ?? 'The conversation is closed on this case.'}
          </Alert>
        </div>
      ) : (
        <form
          action={formAction}
          className="space-y-2 border-t border-slate-200 bg-white p-3 sm:p-4"
        >
          {state?.ok && state.message ? (
            <p className="text-xs font-medium text-green-700">{state.message}</p>
          ) : null}
          {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

          <input type="hidden" name="caseId" value={caseId} />

          {pending.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {pending.map((entry, index) => (
                <li
                  key={`${entry.name}-${index}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700"
                >
                  <Icon name="paperclip" size={14} />
                  <span className="max-w-48 truncate">{entry.name}</span>
                  <span className="text-slate-400">{formatFileSize(entry.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-slate-400 hover:text-red-600"
                    aria-label={`Remove ${entry.name}`}
                  >
                    <Icon name="x" size={13} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex items-end gap-2">
            {/* Files: documents, images and archives. The input is hidden behind
                the clip so the composer stays a composer. */}
            <input
              ref={fileInputRef}
              type="file"
              name="files"
              multiple
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.zip,.rar,.7z,.gz,.tar,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
              onChange={(event) => {
                const chosen = Array.from(event.target.files ?? []);
                setPending((current) => [...current, ...chosen].slice(0, 5));
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={buttonClasses('secondary', 'md', 'shrink-0')}
              aria-label="Attach files"
              title="Attach files — documents, images, spreadsheets or archives"
            >
              <Icon name="paperclip" size={18} />
            </button>

            <label htmlFor="case-message" className="sr-only">
              Message
            </label>
            <textarea
              id="case-message"
              name="body"
              ref={textareaRef}
              required
              rows={3}
              maxLength={4000}
              onInput={grow}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Write a message…"
              className="min-h-[4.5rem] flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500"
            />
            <SubmitButton className="shrink-0" pendingLabel="Sending…">
              Send
              <Icon name="send" size={16} />
            </SubmitButton>
          </div>

          <p className="text-[11px] text-slate-400">
            Enter posts the message, Shift + Enter starts a new line. Attach up to 5 files — documents,
            images, spreadsheets and archives up to 25 MB each.
          </p>
        </form>
      )}
    </div>
  );
}
