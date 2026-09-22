import Link from 'next/link';
import type { AccountType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { cached } from '@/lib/ttl-cache';
import { getSessionUser } from '@/lib/auth';
import { listPosts } from '@/server/services/blog-service';
import { CommunityPanel } from '@/components/community/CommunityPanel';
import { getI18n } from '@/lib/i18n';
import { BADGE, DOCUMENT_REQUIREMENTS } from '@/lib/constants';
import { VerificationBadge } from '@/components/VerificationBadge';
import { Icon, type IconName } from '@/components/icons';
import { DOMAINS, domainChip, type Domain } from '@/lib/domains';
import { PublicEnquiryForm } from '@/components/forms/PublicEnquiryForm';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';

/**
 * Real numbers from the database — never invented, and honestly zero when empty.
 *
 * One query rather than five: they are five questions about the same two tables,
 * and the landing page is the first thing anybody sees.
 */
async function getFacts() {
  // Five totals that change only when somebody joins or is verified: cached for
  // a minute, because the landing page is the first thing anybody loads.
  return cached('landing:facts', 60_000, loadFacts);
}

async function loadFacts() {
  const [row] = await prisma.$queryRaw<
    { published: number; verified: number; reviews: number; lawyers: number; firms: number }[]
  >`
    select
      (select count(*)::int from listing l
        where l.published = true
          and not exists (
            select 1 from lawyer_profile lp
             where lp."userId" = l."userId" and lp."createdByFirmId" is not null and lp."affiliatedFirmId" is not null
          )) as published,
      (select count(*)::int from listing l
        join "user" u on u.id = l."userId"
        where l.published = true and u."verificationStatus" = 'APPROVED'
          and not exists (
            select 1 from lawyer_profile lp
             where lp."userId" = l."userId" and lp."createdByFirmId" is not null and lp."affiliatedFirmId" is not null
          )) as verified,
      (select count(*)::int from review where status = 'PUBLISHED') as reviews,
      (select count(*)::int from listing l
        where l.published = true and l.kind = 'LAWYER'
          and not exists (
            select 1 from lawyer_profile lp
             where lp."userId" = l."userId" and lp."createdByFirmId" is not null and lp."affiliatedFirmId" is not null
          )) as lawyers,
      (select count(*)::int from listing l
        where l.published = true and l.kind = 'FIRM') as firms`;

  return row ?? { published: 0, verified: 0, reviews: 0, lawyers: 0, firms: 0 };
}

const CLIENT_FEATURES: { icon: IconName; domain: Domain; title: string; body: string }[] = [
  {
    icon: 'search',
    domain: 'directory',
    title: 'Search by what matters',
    body: 'Filter by area of law and emirate — criminal, civil, commercial, family, labour, property and more — across all seven Emirates.',
  },
  {
    icon: 'shieldCheck',
    domain: 'verification',
    title: 'See who has been checked',
    body: 'A coloured badge means a reviewer examined that professional\u2019s Emirates ID and legal documents. Profiles without one say so plainly.',
  },
  {
    icon: 'folder',
    domain: 'case',
    title: 'Send a case, not an email',
    body: 'Name the matter, describe it, attach your papers. Follow it from Submitted to Under review to Assigned without chasing anyone.',
  },
  {
    icon: 'message',
    domain: 'case',
    title: 'Talk inside the case',
    body: 'A proper conversation with your lawyer, with your documents and your fees in the same place. Nobody has to repeat themselves.',
  },
  {
    icon: 'phoneCall',
    domain: 'meeting',
    title: 'Ask for a call when it matters',
    body: 'Your own conference room, with the professional handling your case in it. Ask for an urgent call and you go straight in while they are alerted.',
  },
  {
    icon: 'creditCard',
    domain: 'payment',
    title: 'Pay a fee and keep the receipt',
    body: 'Fees arrive in the conversation, not by surprise. Pay by card, get a receipt you can print, and send the proof of payment into the case file.',
  },
  {
    icon: 'star',
    domain: 'review',
    title: 'Reviews you can trust',
    body: 'Only a client whose case was actually accepted can review, and each case carries one review. No anonymous score-settling.',
  },
];

const PROFESSIONAL_FEATURES: { icon: IconName; domain: Domain; title: string; body: string }[] = [
  {
    icon: 'inbox',
    domain: 'case',
    title: 'A queue, not an inbox',
    body: 'Cases arrive ready to review. Accept the ones you want, decline the rest with a reason the client can act on.',
  },
  {
    icon: 'briefcase',
    domain: 'oversight',
    title: 'Your practice in one place',
    body: 'Portfolio, pending cases, clients and their details, all kept in step with what the client sees.',
  },
  {
    icon: 'calendar',
    domain: 'meeting',
    title: 'A diary you can actually run',
    body: 'Month, week and day views. Move, cancel or delete any meeting — the client is told about everything except a deletion.',
  },
  {
    icon: 'chart',
    domain: 'oversight',
    title: 'Run the firm, not just your cases',
    body: 'See every case, which lawyer holds it, how far each has got, and the whole firm\u2019s diary and rooms on one calendar.',
  },
  {
    icon: 'alert',
    domain: 'emergency',
    title: 'Take emergencies when you choose',
    body: 'Turn emergency availability on and urgent requests reach you directly. Firms can name one lawyer as their always-on contact.',
  },
  {
    icon: 'creditCard',
    domain: 'payment',
    title: 'Ask for your fee in the case',
    body: 'Raise a consultation or case fee where the conversation already is. The client pays by card, a receipt is issued, and the proof of payment lands in the case.',
  },
];

const BADGE_EXPLANATIONS: { type: AccountType; who: string }[] = [
  { type: 'USER', who: 'An individual whose Emirates ID and profile have been reviewed.' },
  {
    type: 'LAWYER',
    who: 'A lawyer whose Emirates ID and permit to provide legal representation have been reviewed.',
  },
  {
    type: 'FIRM',
    who: 'A firm whose Emirates ID, legal permit and trade licence have been reviewed.',
  },
];

/** How many community posts the panel on this page shows. */
const COMMUNITY_PREVIEW = 4;

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ t, locale }, params, user] = await Promise.all([
    getI18n(),
    searchParams,
    getSessionUser(),
  ]);
  const activeTab = params.tab === 'community' ? 'community' : 'home';

  // The community feed is identical for every visitor, so a signed-out reader
  // gets the cached copy; a member gets a live one, because their own votes and
  // reactions are in it.
  const [facts, communityPosts, listings] = await Promise.all([
    getFacts(),
    user
      ? listPosts(user.id, { limit: COMMUNITY_PREVIEW })
      : cached('community:landing', 30_000, () => listPosts(null, { limit: COMMUNITY_PREVIEW })),
    user
      ? prisma.listing.findMany({
          where: { published: true },
          orderBy: { displayName: 'asc' },
          take: 200,
          select: { id: true, displayName: true, kind: true },
        })
      : Promise.resolve([]),
  ]);

  const community = (
    <CommunityPanel
      t={t}
      user={user ? { id: user.id } : null}
      posts={communityPosts}
      listings={listings}
      nextPath={activeTab === 'community' ? '/?tab=community' : '/#community'}
    />
  );

  return (
    <>
      {activeTab === 'community' ? (
        <div className="bg-slate-50/60">{community}</div>
      ) : (
        <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="dl-container py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-800 ring-1 ring-brand-200">
                {t.landing.badge}
              </p>

              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                {t.landing.heroTitle}
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-700">
                {t.landing.heroBody}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/directory" className={buttonClasses('primary', 'lg')}>
                  {t.landing.findLawyer}
                </Link>
                <Link href="#for-professionals" className={buttonClasses('secondary', 'lg')}>
                  {t.landing.iAmProfessional}
                </Link>
                <Link href="/emergency" className={buttonClasses('ghost', 'lg')}>
                  <Icon name="alert" size={18} className={DOMAINS.emergency.text} />
                  {t.landing.urgentHelp}
                </Link>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-slate-200 pt-6">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-slate-500">{t.landing.legalFirms}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                    {facts.firms}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-slate-500">{t.landing.lawyers}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                    {facts.lawyers}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-slate-500">
                    {t.landing.clientReviews}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                    {facts.reviews}
                  </dd>
                </div>
              </dl>

              {facts.published === 0 ? (
                <p className="mt-6 text-sm text-slate-600">
                  The directory is empty right now. Nothing here is invented to make the page look
                  busy — profiles appear as real lawyers and firms join.{' '}
                  <Link
                    href="/register?type=LAWYER"
                    className="font-medium text-brand-700 hover:underline"
                  >
                    Be the first to list
                  </Link>
                  .
                </p>
              ) : (
                <p className="mt-6 text-sm text-slate-600">
                  <strong className="text-slate-900">{facts.published}</strong> published{' '}
                  {facts.published === 1 ? 'profile' : 'profiles'}, of which{' '}
                  <strong className="text-slate-900">{facts.verified}</strong>{' '}
                  {facts.verified === 1 ? 'is' : 'are'} verified.
                </p>
              )}
            </div>

            {/* The thing that matters most: what a verified profile was checked against. */}
            <Card className="p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                What a badge means
              </h2>
              <ul className="mt-4 space-y-4">
                {BADGE_EXPLANATIONS.map(({ type, who }) => (
                  <li key={type} className="flex items-start gap-3">
                    <VerificationBadge accountType={type} size="lg" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{BADGE[type].label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{who}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                Issued only after a named reviewer approves the documents — never automatically, and
                withdrawn if the evidence behind it changes.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Which side are you on ────────────────────────────────────────── */}
      <section className="dl-container py-12">
        <div className="grid gap-5 sm:grid-cols-2">
          <a
            href="#for-clients"
            className="group rounded-2xl border border-domain-directory/25 bg-domain-directory/5 p-6 transition-colors hover:border-domain-directory"
          >
            <span className={domainChip('directory', 'lg')}>
              <Icon name="search" size={22} />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Are you looking for legal assistance?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Find a lawyer or firm you can check, send your case, and follow it to the end. Free, with
              no obligation and no fee to search.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-domain-directory">
              What you get
              <Icon name="arrowRight" size={16} />
            </span>
          </a>

          <a
            href="#for-professionals"
            className="group rounded-2xl border border-domain-oversight/25 bg-domain-oversight/5 p-6 transition-colors hover:border-domain-oversight"
          >
            <span className={domainChip('oversight', 'lg')}>
              <Icon name="scale" size={22} />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Are you a legal firm or a legal representative?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Publish a verified practice, take the cases you want, and run the diary, the clients and
              the fees in one place.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-domain-oversight">
              What you get
              <Icon name="arrowRight" size={16} />
            </span>
          </a>
        </div>
      </section>

      {/* ── For clients ──────────────────────────────────────────────────── */}
      <section id="for-clients" className="border-y border-slate-200 bg-slate-50">
        <div className="dl-container py-16 sm:py-20">
          <span className={domainChip('directory', 'lg')}>
            <Icon name="search" size={22} />
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            Are you looking for legal assistance?
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Most people find a lawyer through a friend and hope for the best. Dubai Legal gives you the
            details to judge for yourself, and a record of everything afterwards. Everything below is
            what you get as a client — searching is free, and it stays free.
          </p>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CLIENT_FEATURES.map((feature) => (
              <li key={feature.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <span className={domainChip(feature.domain)}>
                  <Icon name={feature.icon} size={20} />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{feature.body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-xl">
                <div className="flex items-center gap-2">
                  <VerificationBadge accountType="USER" size="md" />
                  <h3 className="font-semibold text-slate-900">I need a lawyer</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  An account is what turns a directory listing into a case you can follow. It needs
                  your Emirates ID to verify you —{' '}
                  {DOCUMENT_REQUIREMENTS.USER.required.length} document
                  {DOCUMENT_REQUIREMENTS.USER.required.length === 1 ? '' : 's'} in total — and your
                  number is never published.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/register?type=USER" className={buttonClasses('primary', 'lg')}>
                  Create a free account
                </Link>
                <Link href="/directory" className={buttonClasses('secondary', 'lg')}>
                  Search first
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Emergency ────────────────────────────────────────────────────── */}
      <section className="border-y border-domain-emergency/20 bg-domain-emergency/5">
        <div className="dl-container py-14">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-domain-emergency ring-1 ring-domain-emergency/25">
                <Icon name="alert" size={14} />
                Emergency representation
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                When you cannot wait until Monday
              </h2>
              <p className="mt-3 leading-relaxed text-slate-700">
                Raise an urgent request and it is pushed straight to every lawyer and firm who takes
                emergencies. The first to take it has a case opened and assigned to them, and your
                call-back number goes with it.
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Dubai Legal connects you to a lawyer. It does not dispatch emergency services — if
                somebody is in danger, call 999.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/emergency" className={buttonClasses('primary', 'lg')}>
                  Get urgent help
                </Link>
                <Link href="/register?type=LAWYER" className={buttonClasses('secondary', 'lg')}>
                  Take emergency cases
                </Link>
              </div>
            </div>

            <Card className="w-full max-w-sm">
              <h3 className="text-sm font-semibold text-slate-900">How it reaches someone</h3>
              <ol className="mt-3 space-y-3 text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">1</span>
                  You describe what has happened and give a number.
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">2</span>
                  It is pushed to every professional who has opted into emergencies.
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">3</span>
                  The first to take it gets a case opened and assigned, and you are told who.
                </li>
              </ol>
            </Card>
          </div>
        </div>
      </section>

      {/* ── For professionals ────────────────────────────────────────────── */}
      <section id="for-professionals" className="border-y border-slate-200 bg-slate-50">
        <div className="dl-container py-16 sm:py-20">
          <span className={domainChip('oversight', 'lg')}>
            <Icon name="scale" size={22} />
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            Are you a legal firm or a legal representative?
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Listing yourself is the beginning. Dubai Legal gives lawyers and firms somewhere to run the
            work that follows — the queue, the diary, the clients, the firm and the fees. Everything
            below is what you get as a professional.
          </p>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROFESSIONAL_FEATURES.map((feature) => (
              <li key={feature.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <span className={domainChip(feature.domain)}>
                  <Icon name={feature.icon} size={20} />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{feature.body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {(
              [
                {
                  type: 'LAWYER' as const,
                  title: 'I am a lawyer',
                  body: 'Publish your practice, take the cases you want, and run your diary, your clients and your rooms here.',
                  cta: 'Create a lawyer account',
                },
                {
                  type: 'FIRM' as const,
                  title: 'I run a legal firm',
                  body: 'List your firm and its lawyers, oversee every case on one calendar, and designate an emergency contact.',
                  cta: 'Create a firm account',
                },
              ]
            ).map((option) => (
              <Card key={option.type} className="flex flex-col">
                <div className="flex items-center gap-2">
                  <VerificationBadge accountType={option.type} size="md" />
                  <h3 className="font-semibold text-slate-900">{option.title}</h3>
                </div>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{option.body}</p>
                <p className="mt-4 text-xs text-slate-500">
                  {DOCUMENT_REQUIREMENTS[option.type].required.length} document
                  {DOCUMENT_REQUIREMENTS[option.type].required.length === 1 ? '' : 's'} needed to
                  verify, including the permit to provide legal representation.
                </p>
                <Link
                  href={`/register?type=${option.type}`}
                  className={buttonClasses('secondary', 'md', 'mt-4 w-full')}
                >
                  {option.cta}
                </Link>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/how-verification-works" className={buttonClasses('ghost', 'lg')}>
              What verification involves
            </Link>
          </div>
        </div>
      </section>

      {/* ── Community ────────────────────────────────────────────────────── */}
      {community}

      {/* ── Enquiry pool ─────────────────────────────────────────────────── */}
      <section id="enquiry" className="border-y border-slate-200 bg-slate-50">
        <div className="dl-container py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <span className={domainChip('enquiry', 'lg')}>
                <Icon name="inbox" size={22} />
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                Not sure who to ask?
              </h2>
              <p className="mt-3 leading-relaxed text-slate-600">
                Send a general enquiry and it goes into a shared pool that every registered lawyer and
                firm can see. The first to pick it up contacts you directly.
              </p>

              <Alert tone="info" className="mt-5" title="An account gets you a faster, better answer">
                A general enquiry is worked by whoever picks it up, so it can take longer to be
                reviewed. With a free account you choose the professional yourself, attach your
                documents, follow the case and keep every message and fee in one place.{' '}
                <Link href="/register" className="font-medium underline">
                  Create an account
                </Link>{' '}
                instead.
              </Alert>

              <p className="mt-5 text-sm text-slate-600">
                In an emergency, do not send an enquiry —{' '}
                <Link href="/emergency" className="font-medium text-domain-emergency hover:underline">
                  get a lawyer on video now
                </Link>
                , with no account at all.
              </p>
            </div>

            <Card>
              <h3 className="mb-4 font-semibold text-slate-900">Send an enquiry</h3>
              <PublicEnquiryForm compact />
            </Card>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="dl-container py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            How getting a lawyer works
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Search',
                body: 'Filter by area of law and emirate. Compare what each professional publishes, including their licence and practice address.',
              },
              {
                title: 'Send your case',
                body: 'Name it, describe it, attach the papers. It arrives as a request the professional can accept or decline.',
              },
              {
                title: 'Agree and talk',
                body: 'Once accepted, message them inside the case. Meet by video or at their office.',
              },
              {
                title: 'Settle the fee',
                body: 'Fees are requested inside the case, where you can see exactly what is being charged for.',
              },
            ].map((step, index) => (
              <li key={step.title}>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-medium text-slate-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Trust ────────────────────────────────────────────────────────── */}
      <section className="dl-container py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Privacy is not a feature here. It is the product.
            </h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              Your identity documents are readable by you and by the reviewer checking them — nobody
              else. Case papers are visible only to you and the professional working your case.
              Conversations between a lawyer and a client may be privileged, so they are not opened
              even by platform administrators.
            </p>
          </div>

          <ul className="grid gap-5 sm:grid-cols-2">
            {[
              {
                title: 'Emirates ID never public',
                body: 'Your profile shows that your Emirates ID was verified. The number is never published.',
              },
              {
                title: 'Documents stay private',
                body: 'Evidence is stored away from anything public and served only to you and your reviewer.',
              },
              {
                title: 'One identity, one account',
                body: 'An Emirates ID can verify a single account, which is what makes a badge worth something.',
              },
              {
                title: 'You are told what happens',
                body: 'Every status change, message and meeting request raises an alert you can act on.',
              },
            ].map((item) => (
              <li key={item.title}>
                <div className="flex items-center gap-2">
                  <Icon name="checkCircle" size={18} className="text-green-700" />
                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Closing ──────────────────────────────────────────────────────── */}
      <section className="dl-container py-16">
        <div className="rounded-2xl bg-brand-700 px-8 py-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Stop guessing. Start checking.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-50">
            Search the directory for free, or create an account to send your first case.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/directory"
              className={buttonClasses('secondary', 'lg', 'bg-white ring-0 hover:bg-brand-50')}
            >
              Browse the directory
            </Link>
            <Link
              href="/register"
              className={buttonClasses('ghost', 'lg', 'text-white hover:bg-brand-800')}
            >
              Create an account
            </Link>
          </div>
        </div>
      </section>
        </>
      )}
    </>
  );
}
