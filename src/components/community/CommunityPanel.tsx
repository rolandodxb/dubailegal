import Link from 'next/link';
import { CommunityPostCard, type CommunityAuthor, type CommunityComment } from './CommunityPostCard';
import { PostForm } from '@/components/forms/BlogForms';
import { Alert, Card, buttonClasses } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';
import type { Dictionary } from '@/lib/i18n';
import { composerLabels } from '@/lib/i18n/dict/feed';

type Post = {
  id: string;
  kind: string;
  topic: string;
  title: string;
  body: string;
  score: number;
  myVote: number;
  createdAt: Date | string;
  author: CommunityAuthor;
  reactions?: { kind: string; userId: string }[];
  listing?: { id: string; displayName: string; kind?: string } | null;
  _count: { comments: number };
  comments: (CommunityComment & { parentId: string | null })[];
};

/**
 * The community, shown where the reader already is.
 *
 * This is the same community that lives at `/blog`, rendered as a panel so it can
 * appear on the landing page as a tab. Nobody has to reach a dashboard to take
 * part: a visitor reads it here, signs in from this panel, and comes straight
 * back to it — `next` is the tab they were looking at, not a dashboard.
 *
 * Signed out it is deliberately read-only: the post cards render without their
 * controls, and the invitation to sign in is one clear line rather than a card
 * full of buttons that do nothing.
 */
export function CommunityPanel({
  user,
  posts,
  listings,
  nextPath,
  t,
  heading,
  intro,
  compact = false,
}: {
  user: { id: string } | null;
  posts: Post[];
  listings: { id: string; displayName: string; kind: string }[];
  /** Where to come back to after signing in — the tab this panel is on. */
  nextPath: string;
  /** The dictionary for this request. */
  t: Dictionary;
  heading?: string;
  intro?: string;
  compact?: boolean;
}) {
  const title = heading ?? t.community.heading;
  const lead = intro ?? t.community.intro;
  const signIn = `/login?next=${encodeURIComponent(nextPath)}`;
  const register = `/register?next=${encodeURIComponent(nextPath)}`;

  return (
    <section id="community" className="dl-container py-10 sm:py-16">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-domain-review/10 text-domain-review">
          <Icon name="community" size={20} />
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h2>
      </div>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">{lead}</p>

      {user ? (
        <Card className="mt-6">
          <details>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 font-semibold text-slate-900">
              <span className="inline-flex items-center gap-2">
                <Icon name="pencil" size={17} />
                {t.community.writePost}
              </span>
              <Icon name="chevronDown" size={18} />
            </summary>
            <p className="mt-2 mb-4 text-sm text-slate-600">{t.community.writePostHelp}</p>
            <PostForm
              listings={listings}
              labels={composerLabels(t, {
                label: t.community.writePost,
                pending: `${t.community.writePost}…`,
              })}
            />
          </details>
        </Card>
      ) : (
        <Alert tone="info" className="mt-6" title={t.community.readOnlyTitle}>
          <p>{t.community.readOnlyBody}</p>
          <p className="mt-2 flex flex-wrap gap-3">
            <Link href={signIn} className="font-semibold underline">
              {t.nav.signIn}
            </Link>
            <Link href={register} className="font-semibold underline">
              {t.nav.createAccount}
            </Link>
          </p>
        </Alert>
      )}

      {posts.length === 0 ? (
        <Card className="mt-5">
          <p className="text-sm text-slate-700">{t.community.empty}</p>
        </Card>
      ) : (
        <ul className="mt-5 space-y-4">
          {posts.map((post) => (
            <li key={post.id}>
              <CommunityPostCard
                post={{
                  id: post.id,
                  kind: post.kind,
                  topic: post.topic,
                  title: post.title,
                  body: post.body,
                  score: post.score,
                  myVote: post.myVote,
                  createdAt: post.createdAt,
                  authorId: post.author.id,
                  author: post.author,
                  reactions: post.reactions,
                  listing: post.listing ?? null,
                  _count: post._count,
                }}
                viewerId={user?.id ?? null}
                comments={post.comments.filter((comment) => comment.parentId === null)}
                totalComments={post._count.comments}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/blog" className={buttonClasses('secondary', 'md')}>
          <Icon name="inbox" size={17} />
          {t.community.browseBoards}
        </Link>
        {!user ? (
          <Link href={register} className={buttonClasses('primary', 'md')}>
            {t.community.createToPost}
          </Link>
        ) : (
          <Link href="/blog" className={buttonClasses('primary', 'md')}>
            {t.community.openFull}
          </Link>
        )}
      </div>

      {!compact ? null : null}
    </section>
  );
}
