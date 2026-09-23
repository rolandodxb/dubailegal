import Link from 'next/link';
import type { AccountType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { cached } from '@/lib/ttl-cache';
import { getSessionUser } from '@/lib/auth';
import { listPosts } from '@/server/services/blog-service';
import { CommunityPanel } from '@/components/community/CommunityPanel';
import { getI18n } from '@/lib/i18n';
import { landingContent } from '@/lib/i18n/content';
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

const CLIENT_FEATURES: { icon: IconName; domain: Domain }[] = [
  { icon: 'search', domain: 'directory' },
  { icon: 'shieldCheck', domain: 'verification' },
  { icon: 'folder', domain: 'case' },
  { icon: 'message', domain: 'case' },
  { icon: 'video', domain: 'meeting' },
  { icon: 'creditCard', domain: 'payment' },
  { icon: 'star', domain: 'review' },
];

const PROFESSIONAL_FEATURES: { icon: IconName; domain: Domain }[] = [
  { icon: 'inbox', domain: 'case' },
  { icon: 'briefcase', domain: 'case' },
  { icon: 'calendar', domain: 'meeting' },
  { icon: 'chart', domain: 'oversight' },
  { icon: 'alert', domain: 'emergency' },
  { icon: 'creditCard', domain: 'payment' },
];

const BADGE_TYPES: AccountType[] = ['USER', 'LAWYER', 'FIRM'];

/** How many community posts the panel on this page shows. */
const COMMUNITY_PREVIEW = 4;

/** The browser tab, in the language being read. */
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.landing.metaTitle, description: t.landing.metaDescription };
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ t, locale, effectiveLocale }, params, user] = await Promise.all([
    getI18n(),
    searchParams,
    getSessionUser(),
  ]);
  const activeTab = params.tab === 'community' ? 'community' : 'home';
  // The passages, in the language that is actually being shown.
  const content = landingContent(effectiveLocale);

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
                  {t.landing.emptyDirectory}{' '}
                  <Link
                    href="/register?type=LAWYER"
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {t.landing.beFirst}
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
                {t.landing.badgeHeading}
              </h2>
              <ul className="mt-4 space-y-4">
                {BADGE_TYPES.map((type, index) => (
                  <li key={type} className="flex items-start gap-3">
                    <VerificationBadge accountType={type} size="lg" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{t.badges[type]}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                        {content.badges[index]}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                {t.landing.badgeNote}
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
              {t.landing.clientsTitle}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {t.landing.clientsBody}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-domain-directory">
              {t.landing.clientsCta}
              <Icon name="arrowRight" size={16} className="rtl:rotate-180" />
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
              {t.landing.professionalsSectionTitle}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {t.landing.professionalsSectionBody}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-domain-oversight">
              {t.landing.clientsCta}
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
            {t.landing.clientsTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">{t.landing.clientsIntro}</p>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CLIENT_FEATURES.map((feature, index) => (
              <li key={feature.icon} className="rounded-xl border border-slate-200 bg-white p-5">
                <span className={domainChip(feature.domain)}>
                  <Icon name={feature.icon} size={20} />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{content.clients[index]?.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {content.clients[index]?.body}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-xl">
                <div className="flex items-center gap-2">
                  <VerificationBadge accountType="USER" size="md" />
                  <h3 className="font-semibold text-slate-900">{t.landing.needLawyer}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {t.landing.needLawyerBody}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/register?type=USER" className={buttonClasses('primary', 'lg')}>
                  {t.landing.createFreeAccount}
                </Link>
                <Link href="/directory" className={buttonClasses('secondary', 'lg')}>
                  {t.landing.searchFirst}
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
                {t.landing.emergencyEyebrow}
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                {t.landing.emergencyTitle}
              </h2>
              <p className="mt-3 leading-relaxed text-slate-700">
                {t.landing.emergencyBody}
              </p>
              <p className="mt-3 text-sm text-slate-600">
                {t.landing.emergencyNote}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/emergency" className={buttonClasses('primary', 'lg')}>
                  {t.landing.emergencyCta}
                </Link>
                <Link href="/register?type=LAWYER" className={buttonClasses('secondary', 'lg')}>
                  {t.landing.emergencyForProfessionals}
                </Link>
              </div>
            </div>

            <Card className="w-full max-w-sm">
              <h3 className="text-sm font-semibold text-slate-900">How it reaches someone</h3>
              <ol className="mt-3 space-y-3 text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">1</span>
                  {t.landing.emergencyStep1}
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">2</span>
                  {t.landing.emergencyStep2}
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">3</span>
                  {t.landing.emergencyStep3}
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
            {t.landing.professionalsSectionTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">{t.landing.professionalsSectionBody}</p>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROFESSIONAL_FEATURES.map((feature, index) => (
              <li key={feature.icon} className="rounded-xl border border-slate-200 bg-white p-5">
                <span className={domainChip(feature.domain)}>
                  <Icon name={feature.icon} size={20} />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">
                  {content.professionals[index]?.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {content.professionals[index]?.body}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {(
              [
                {
                  type: 'LAWYER' as const,
                  title: t.landing.lawyerCardTitle,
                  body: t.landing.lawyerCardBody,
                  cta: t.landing.lawyerCardCta,
                },
                {
                  type: 'FIRM' as const,
                  title: t.landing.firmCardTitle,
                  body: t.landing.firmCardBody,
                  cta: t.landing.firmCardCta,
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
                  {(DOCUMENT_REQUIREMENTS[option.type].required.length === 1
                    ? t.landing.documentsNeededOne
                    : t.landing.documentsNeeded.replace(
                        '{count}',
                        String(DOCUMENT_REQUIREMENTS[option.type].required.length),
                      ))}
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
              {t.landing.verificationSectionTitle}
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
                {t.landing.enquiryTitle}
              </h2>
              <p className="mt-3 leading-relaxed text-slate-600">
                {t.landing.enquiryBody}
              </p>

              <Alert tone="info" className="mt-5" title={t.landing.enquiryAlertTitle}>
                {t.landing.enquiryAlertBody}{' '}
                <Link href="/register" className="font-medium underline">
                  {t.nav.createAccount}
                </Link>{' '}
                instead.
              </Alert>

              <p className="mt-5 text-sm text-slate-600">
                {t.landing.enquiryEmergencyLead}{' '}
                <Link href="/emergency" className="font-medium text-domain-emergency hover:underline">
                  {t.landing.enquiryEmergencyLink}
                </Link>
                {t.landing.enquiryEmergencyTail}
              </p>
            </div>

            <Card>
              <h3 className="mb-4 font-semibold text-slate-900">{t.landing.enquirySend}</h3>
              <PublicEnquiryForm compact />
            </Card>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="dl-container py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {t.landing.howItWorks}
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: t.landing.step1Title,
                body: t.landing.step1Body,
              },
              {
                title: t.landing.step2Title,
                body: t.landing.step2Body,
              },
              {
                title: t.landing.step3Title,
                body: t.landing.step3Body,
              },
              {
                title: t.landing.step4Title,
                body: t.landing.step4Body,
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
              {t.landing.privacyTitle}
            </h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              {t.landing.privacyBody1}
              {t.landing.privacyBody2}
            </p>
          </div>

          <ul className="grid gap-5 sm:grid-cols-2">
            {content.trust.map((item) => (
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
            {t.landing.closingTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-50">
            {t.landing.closingBody}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/directory"
              className={buttonClasses('secondary', 'lg', 'bg-white ring-0 hover:bg-brand-50')}
            >
              {t.nav.directory}
            </Link>
            <Link
              href="/register"
              className={buttonClasses('ghost', 'lg', 'text-white hover:bg-brand-800')}
            >
              {t.nav.createAccount}
            </Link>
          </div>
        </div>
      </section>
        </>
      )}
    </>
  );
}
