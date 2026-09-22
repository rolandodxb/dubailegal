import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BADGE,
  DOCUMENT_KIND_HINT,
  DOCUMENT_KIND_LABEL,
  DOCUMENT_REQUIREMENTS,
} from '@/lib/constants';
import { VerificationBadge } from '@/components/VerificationBadge';
import { buttonClasses, Card, DescriptionList } from '@/components/ui/primitives';

export const metadata: Metadata = {
  title: 'How verification works',
  description:
    'What each Dubai Legal badge means, which documents every account type must supply, and how a reviewer reaches a decision.',
};

export default function HowVerificationWorksPage() {
  return (
    <div className="dl-container max-w-3xl py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        How verification works
      </h1>
      <p className="mt-3 text-slate-700">
        A verification badge on Dubai Legal is a statement that a named reviewer looked at specific
        documents and approved them. It is never issued automatically, and it is withdrawn if the
        evidence behind it changes.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">The three badges</h2>
        <ul className="mt-4 space-y-3">
          {(['USER', 'LAWYER', 'FIRM'] as const).map((type) => (
            <li key={type}>
              <Card>
                <div className="flex items-center gap-2">
                  <VerificationBadge accountType={type} size="lg" />
                  <span className="font-medium text-slate-900">{BADGE[type].label}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {type === 'USER'
                    ? 'Issued to an individual once their Emirates ID and profile details have been reviewed.'
                    : type === 'LAWYER'
                      ? 'Issued to a lawyer once their Emirates ID and their permit to provide legal representation have been reviewed.'
                      : 'Issued to a legal firm once its Emirates ID, legal permit and trade licence have been reviewed.'}
                </p>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-600">
          An unverified member is not hidden, but their profile is labelled plainly — never dressed
          up as verified. You can restrict results to verified members only from the{' '}
          <Link href="/directory" className="font-medium text-brand-700 hover:underline">
            directory
          </Link>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">What each account must supply</h2>
        <div className="mt-4 space-y-4">
          {(['USER', 'LAWYER', 'FIRM'] as const).map((type) => {
            const requirements = DOCUMENT_REQUIREMENTS[type];
            return (
              <Card key={type}>
                <h3 className="font-medium text-slate-900">
                  {type === 'USER' ? 'Individual account' : type === 'LAWYER' ? 'Lawyer account' : 'Legal firm account'}
                </h3>
                <div className="mt-3">
                  <DescriptionList
                    items={[
                      {
                        term: 'Required',
                        detail: (
                          <ul className="space-y-2">
                            {requirements.required.map((kind) => (
                              <li key={kind}>
                                <span className="font-medium">{DOCUMENT_KIND_LABEL[kind]}</span>
                                <span className="block text-slate-600">{DOCUMENT_KIND_HINT[kind]}</span>
                              </li>
                            ))}
                          </ul>
                        ),
                      },
                      {
                        term: 'Optional',
                        detail: (
                          <ul className="space-y-1">
                            {requirements.optional.map((kind) => (
                              <li key={kind}>{DOCUMENT_KIND_LABEL[kind]}</li>
                            ))}
                          </ul>
                        ),
                      },
                      {
                        term: 'Profile',
                        detail:
                          'Name, date of birth, place of birth, country of residence, phone number, a description of your work and your education background. All of it is required before a reviewer can look at your file.',
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
        <h2 className="text-lg font-semibold text-slate-900">What a reviewer checks</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>That the name on the Emirates ID matches the name on the profile.</li>
          <li>That the Emirates ID has not already been used to verify another account.</li>
          <li>That a lawyer&rsquo;s permit to provide legal representation is current and matches the licensing authority.</li>
          <li>That a firm&rsquo;s trade licence names the licensed legal activity and the signatory.</li>
          <li>That any expiry date shown on a document has not passed.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">If a badge is withdrawn</h2>
        <p className="mt-3 text-sm text-slate-700">
          Replacing an Emirates ID, a legal permit, a trade licence or a required document after
          approval withdraws the badge and puts the account back in the review queue. This is
          deliberate: the badge described the documents that were reviewed, and those documents no
          longer describe the account.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/register" className={buttonClasses('primary', 'lg')}>
          Create an account
        </Link>
        <Link href="/directory" className={buttonClasses('secondary', 'lg')}>
          Browse the directory
        </Link>
      </div>
    </div>
  );
}
