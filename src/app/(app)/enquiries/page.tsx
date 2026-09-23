import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { legalAreaLabel } from '@/lib/i18n/labels';
import {
  countOpenEnquiries,
  listClaimedEnquiries,
  listOpenEnquiries,
} from '@/server/services/enquiry-service';
import { formatDateTime } from '@/lib/format';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import {
  ClaimEnquiryForm,
  CloseEnquiryForm,
  ContactLinks,
} from '@/components/forms/EnquiryPoolForms';
import { relativeTime } from '@/lib/i18n/format';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.items.enquiryPool };
}

/**
 * The shared enquiry pool.
 *
 * General enquiries from the public, with no account behind them. They are not
 * addressed to anyone: every registered lawyer and firm sees the same pool and
 * whoever claims one takes it on. Contact details are shown here because judging
 * whether to take the work requires them.
 */
export default async function EnquiryPoolPage() {
  // The pool is worked by lawyers and firms. An individual has no business
  // reading other people's enquiries — and their contact details, which the pool
  // shows — so this turns them away rather than offering a softened version.
  const [{ t }, user] = await Promise.all([getI18n(), requireProfessional()]);
  const labels = t.memberCases.enquiries;

  const [open, claimed, openCount] = await Promise.all([
    listOpenEnquiries(),
    listClaimedEnquiries(user.id),
    countOpenEnquiries(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{labels.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{labels.intro}</p>
      </header>

      <Alert tone="info" title={labels.notCasesTitle}>
        {labels.notCasesBody}
      </Alert>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {labels.openInPool.replace('{count}', String(openCount))}
        </h2>
        {open.length === 0 ? (
          <EmptyState title={labels.poolEmpty} description={labels.poolEmptyBody} />
        ) : (
          <ul className="space-y-3">
            {open.map((enquiry) => (
              <Card as="li" key={enquiry.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-slate-900">{enquiry.subject}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {enquiry.caseType ? `${legalAreaLabel(t, enquiry.caseType)} · ` : ''}
                      {relativeTime(t, enquiry.createdAt)}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                      {enquiry.message}
                    </p>
                    <p className="mt-3 text-sm text-slate-800">
                      <strong>{enquiry.name}</strong> · {enquiry.email} · {enquiry.phone}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <ClaimEnquiryForm enquiryId={enquiry.id} labels={t.memberCases.enquiryForms} />
                  </div>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>

      {claimed.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            {labels.claimedHeading.replace('{count}', String(claimed.length))}
          </h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {claimed.map((enquiry) => (
              <li key={enquiry.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{enquiry.subject}</p>
                    <p className="text-xs text-slate-500">
                      {labels.claimed
                        .replace('{name}', enquiry.name)
                        .replace('{date}', formatDateTime(enquiry.claimedAt))}
                      {enquiry.status === 'CLOSED' ? labels.closed : ''}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{enquiry.message}</p>
                    <div className="mt-3">
                      <ContactLinks
                        email={enquiry.email}
                        phone={enquiry.phone}
                        labels={t.memberCases.enquiryForms}
                      />
                    </div>
                  </div>
                  <div className="shrink-0">
                    {enquiry.status === 'CLAIMED' ? (
                      <CloseEnquiryForm
                        enquiryId={enquiry.id}
                        labels={t.memberCases.enquiryForms}
                      />
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
