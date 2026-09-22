import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicEnquiryForm } from '@/components/forms/PublicEnquiryForm';
import { Alert, Card } from '@/components/ui/primitives';

export const metadata: Metadata = {
  title: 'Send an enquiry',
  description:
    'Send a general legal enquiry to lawyers and legal firms in the UAE. No account needed — but an account is faster.',
};

/**
 * The general enquiry form, reachable without an account.
 *
 * The legend is the important part: an enquiry goes into a shared pool, whereas an
 * account sends the matter to a professional you chose, with your documents and a
 * record attached. Saying so plainly is better than letting somebody pick the
 * slower route by accident.
 */
export default function EnquiryPage() {
  return (
    <div className="dl-container max-w-3xl py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Send a general enquiry
        </h1>
        <p className="mt-3 text-slate-600">
          No account needed. Your enquiry goes into a shared pool that every registered lawyer and
          firm can see, and the first to pick it up contacts you directly — your phone and email are
          shared with them.
        </p>
      </header>

      <Alert tone="info" title="An account is usually faster">
        A general enquiry is answered by whoever picks it up, and can take longer to be reviewed. With
        a free account you choose the lawyer or firm yourself, send the full details with your
        documents attached, follow the progress and keep every message and fee in one place.{' '}
        <Link href="/register" className="font-medium underline">
          Create an account
        </Link>{' '}
        or{' '}
        <Link href="/directory" className="font-medium underline">
          browse the directory
        </Link>{' '}
        instead.
      </Alert>

      <Card className="mt-6">
        <PublicEnquiryForm />
      </Card>

      <p className="mt-6 text-sm text-slate-500">
        In an emergency, do not send an enquiry —{' '}
        <Link href="/emergency" className="font-medium text-red-700 hover:underline">
          get a lawyer on video now
        </Link>
        , no account needed.
      </p>
    </div>
  );
}
