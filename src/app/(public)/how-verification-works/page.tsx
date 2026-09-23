import type { Metadata } from 'next';
import Link from 'next/link';
import { getI18n } from '@/lib/i18n';
import { documentKindHint, documentKindLabel } from '@/lib/i18n/labels';
import { DOCUMENT_REQUIREMENTS } from '@/lib/constants';
import { VerificationBadge } from '@/components/VerificationBadge';
import { buttonClasses, Card, DescriptionList } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.publicPages.howVerification.metaTitle,
    description: t.publicPages.howVerification.metaDescription,
  };
}

export default async function HowVerificationWorksPage() {
  const { t } = await getI18n();
  const hv = t.publicPages.howVerification;

  return (
    <div className="dl-container max-w-3xl py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{hv.title}</h1>
      <p className="mt-3 text-slate-700">{hv.intro}</p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">{hv.badgesHeading}</h2>
        <ul className="mt-4 space-y-3">
          {(['USER', 'LAWYER', 'FIRM'] as const).map((type) => (
            <li key={type}>
              <Card>
                <div className="flex items-center gap-2">
                  <VerificationBadge accountType={type} size="lg" label={t.badges[type]} />
                  <span className="font-medium text-slate-900">{t.badges[type]}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {type === 'USER'
                    ? hv.userBadgeBody
                    : type === 'LAWYER'
                      ? hv.lawyerBadgeBody
                      : hv.firmBadgeBody}
                </p>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-600">
          {hv.unverifiedNoteLead}
          <Link href="/directory" className="font-medium text-brand-700 hover:underline">
            {t.nav.directory}
          </Link>
          {hv.unverifiedNoteTail}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">{hv.requirementsHeading}</h2>
        <div className="mt-4 space-y-4">
          {(['USER', 'LAWYER', 'FIRM'] as const).map((type) => {
            const requirements = DOCUMENT_REQUIREMENTS[type];
            return (
              <Card key={type}>
                <h3 className="font-medium text-slate-900">
                  {type === 'USER' ? hv.accountUser : type === 'LAWYER' ? hv.accountLawyer : hv.accountFirm}
                </h3>
                <div className="mt-3">
                  <DescriptionList
                    items={[
                      {
                        term: t.common.required,
                        detail: (
                          <ul className="space-y-2">
                            {requirements.required.map((kind) => (
                              <li key={kind}>
                                <span className="font-medium">{documentKindLabel(t, kind)}</span>
                                <span className="block text-slate-600">
                                  {documentKindHint(t, kind)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ),
                      },
                      {
                        term: t.common.optional,
                        detail: (
                          <ul className="space-y-1">
                            {requirements.optional.map((kind) => (
                              <li key={kind}>{documentKindLabel(t, kind)}</li>
                            ))}
                          </ul>
                        ),
                      },
                      {
                        term: hv.profileTerm,
                        detail: hv.profileDetail,
                      },
                    ]}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">{hv.reviewerHeading}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>{hv.reviewerName}</li>
          <li>{hv.reviewerReuse}</li>
          <li>{hv.reviewerPermit}</li>
          <li>{hv.reviewerLicence}</li>
          <li>{hv.reviewerExpiry}</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">{hv.withdrawnHeading}</h2>
        <p className="mt-3 text-sm text-slate-700">{hv.withdrawnBody}</p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/register" className={buttonClasses('primary', 'lg')}>
          {t.nav.createAccount}
        </Link>
        <Link href="/directory" className={buttonClasses('secondary', 'lg')}>
          {t.publicPages.shell.browseDirectory}
        </Link>
      </div>
    </div>
  );
}
