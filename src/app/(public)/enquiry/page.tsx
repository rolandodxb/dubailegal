import type { Metadata } from 'next';
import Link from 'next/link';
import { getI18n } from '@/lib/i18n';
import { legalAreaLabel } from '@/lib/i18n/labels';
import { LEGAL_AREAS } from '@/lib/constants';
import { PublicEnquiryForm } from '@/components/forms/PublicEnquiryForm';
import { Alert, Card } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.landing.enquirySend, description: t.publicPages.enquiry.metaDescription };
}

/**
 * The general enquiry form, reachable without an account.
 *
 * The legend is the important part: an enquiry goes into a shared pool, whereas an
 * account sends the matter to a professional you chose, with your documents and a
 * record attached. Saying so plainly is better than letting somebody pick the
 * slower route by accident.
 */
export default async function EnquiryPage() {
  const { t } = await getI18n();
  const enquiry = t.publicPages.enquiry;

  return (
    <div className="dl-container max-w-3xl py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{enquiry.title}</h1>
        <p className="mt-3 text-slate-600">{enquiry.intro}</p>
      </header>

      <Alert tone="info" title={enquiry.alertTitle}>
        {enquiry.alertBody}{' '}
        <Link href="/register" className="font-medium underline">
          {t.nav.createAccount}
        </Link>{' '}
        {t.publicPages.shell.or}{' '}
        <Link href="/directory" className="font-medium underline">
          {enquiry.browseDirectoryLink}
        </Link>{' '}
        {enquiry.instead}
      </Alert>

      <Card className="mt-6">
        <PublicEnquiryForm
          labels={{
            sentTitle: t.publicPages.enquiryForm.sentTitle,
            failedTitle: t.publicPages.enquiryForm.failedTitle,
            name: t.publicPages.enquiryForm.name,
            email: t.common.email,
            phone: t.common.phone,
            areaOfLaw: t.publicPages.enquiryForm.areaOfLaw,
            areaOptions: LEGAL_AREAS.map((area) => ({
              value: area.value,
              label: legalAreaLabel(t, area.value),
            })),
            notSure: t.publicPages.enquiryForm.notSure,
            subject: t.publicPages.enquiryForm.subject,
            subjectPlaceholder: t.publicPages.enquiryForm.subjectPlaceholder,
            question: t.publicPages.enquiryForm.question,
            questionHint: t.publicPages.enquiryForm.questionHint,
            pending: t.publicPages.enquiryForm.pending,
            submit: t.landing.enquirySubmit,
            poolNote: t.landing.enquiryPoolNote,
          }}
        />
      </Card>

      <p className="mt-6 text-sm text-slate-500">
        {t.landing.enquiryEmergencyLead}{' '}
        <Link href="/emergency" className="font-medium text-red-700 hover:underline">
          {t.landing.enquiryEmergencyLink}
        </Link>
        {enquiry.emergencyTail}
      </p>
    </div>
  );
}
