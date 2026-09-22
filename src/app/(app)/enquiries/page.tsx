import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth';
import {
  countOpenEnquiries,
  listClaimedEnquiries,
  listOpenEnquiries,
} from '@/server/services/enquiry-service';
import { LEGAL_AREA_LABEL } from '@/lib/constants';
import { minutesLabel } from '@/lib/time';
import { formatDateTime } from '@/lib/format';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import {
  ClaimEnquiryForm,
  CloseEnquiryForm,
  ContactLinks,
} from '@/components/forms/EnquiryPoolForms';

export const metadata: Metadata = { title: 'Enquiry pool' };

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
  const user = await requireProfessional();

  const [open, claimed, openCount] = await Promise.all([
    listOpenEnquiries(),
    listClaimedEnquiries(user.id),
    countOpenEnquiries(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Enquiry pool</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          General enquiries sent by members of the public who do not have an account. Every registered
          lawyer and firm sees the same pool; claiming one takes it out and makes it yours to answer.
        </p>
      </header>

      <Alert tone="info" title="These are enquiries, not cases">
        An enquiry has no documents, no conversation and no record, which is why the form tells people
        an account is the better route. When you contact somebody, suggest they create one — then the
        work can be run properly as a case.
      </Alert>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Open in the pool ({openCount})</h2>
        {open.length === 0 ? (
          <EmptyState
            title="The pool is empty"
            description="General enquiries from the public appear here. Nobody has asked anything yet."
          />
        ) : (
          <ul className="space-y-3">
            {open.map((enquiry) => (
              <Card as="li" key={enquiry.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-slate-900">{enquiry.subject}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {enquiry.caseType
                        ? `${LEGAL_AREA_LABEL[enquiry.caseType] ?? enquiry.caseType} · `
                        : ''}
                      {minutesLabel(enquiry.createdAt)}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                      {enquiry.message}
                    </p>
                    <p className="mt-3 text-sm text-slate-800">
                      <strong>{enquiry.name}</strong> · {enquiry.email} · {enquiry.phone}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <ClaimEnquiryForm enquiryId={enquiry.id} />
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
            Enquiries I claimed ({claimed.length})
          </h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {claimed.map((enquiry) => (
              <li key={enquiry.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{enquiry.subject}</p>
                    <p className="text-xs text-slate-500">
                      {enquiry.name} · claimed {formatDateTime(enquiry.claimedAt)}
                      {enquiry.status === 'CLOSED' ? ' · closed' : ''}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{enquiry.message}</p>
                    <div className="mt-3">
                      <ContactLinks email={enquiry.email} phone={enquiry.phone} />
                    </div>
                  </div>
                  <div className="shrink-0">
                    {enquiry.status === 'CLAIMED' ? <CloseEnquiryForm enquiryId={enquiry.id} /> : null}
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
