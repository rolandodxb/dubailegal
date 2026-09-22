import Link from 'next/link';
import { CommunityPostCard, type CommunityAuthor, type CommunityComment } from './CommunityPostCard';
import { PostForm } from '@/components/forms/BlogForms';
import { Alert, Card, buttonClasses } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

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
  heading = 'Ask the people who have been through it',
  intro = 'Real answers from members who have been through it: what a process involves, what it cost, who helped. Anyone can read it; an account is what lets you react, reply or ask your own question.',
  compact = false,
}: {
  user: { id: string } | null;
  posts: Post[];
  listings: { id: string; displayName: string; kind: string }[];
  /** Where to come back to after signing in — the tab this panel is on. */
  nextPath: string;
  heading?: string;
  intro?: string;
  compact?: boolean;
}) {
  const signIn = `/login?next=${encodeURIComponent(nextPath)}`;
  const register = `/register?next=${encodeURIComponent(nextPath)}`;

  return (
    <section id="community" className="dl-container py-10 sm:py-16">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-domain-review/10 text-domain-review">
          <Icon name="community" size={20} />
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {heading}
        </h2>
      </div>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">{intro}</p>

      {user ? (
        <Card className="mt-6">
          <details>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 font-semibold text-slate-900">
              <span className="inline-flex items-center gap-2">
                <Icon name="pencil" size={17} />
                Write a post
              </span>
              <Icon name="chevronDown" size={18} />
            </summary>
            <p className="mt-2 mb-4 text-sm text-slate-600">
              Ask something, recommend a professional you used, or write down what happened. A
              moderator reads it first — mostly to check the question has not been answered already.
            </p>
            <PostForm listings={listings} />
          </details>
        </Card>
      ) : (
        <Alert tone="info" className="mt-6" title="Read it all; sign in to take part">
          <p>
            Every post and reply here is open to anyone. To react, comment or ask your own question,{' '}
            <Link href={signIn} className="font-semibold underline">
              sign in
            </Link>{' '}
            or{' '}
            <Link href={register} className="font-semibold underline">
              create an account
            </Link>{' '}
            — you will come straight back to this page.
          </p>
        </Alert>
      )}

      {posts.length === 0 ? (
        <Card className="mt-5">
          <p className="text-sm text-slate-700">
            Nothing has been posted yet. The feed is empty rather than filled with examples —
            recommendations here come from real clients, and the first one will be real too.
          </p>
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
          Browse the boards
        </Link>
        {!user ? (
          <Link href={register} className={buttonClasses('primary', 'md')}>
            Create an account to post
          </Link>
        ) : (
          <Link href="/blog" className={buttonClasses('primary', 'md')}>
            Open the full community
          </Link>
        )}
      </div>

      {!compact ? null : null}
    </section>
  );
}
