import type { Metadata } from 'next';
import Link from 'next/link';
import { requireActiveUser } from '@/lib/auth';
import { calculateAge, formatDate } from '@/lib/format';
import { ACCOUNT_TYPE_LABEL } from '@/lib/constants';
import { getProfileForEdit } from '@/server/services/profile-service';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { ProfilePhotoCard } from '@/components/forms/ProfilePhotoCard';
import { Alert, buttonClasses, Card, DescriptionList } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'My profile' };

export default async function ProfilePage() {
  const user = await requireActiveUser();
  const profile = await getProfileForEdit(user.id);

  // The form requires a non-null profile row to edit, and registration always
  // creates one, so this is a safety net rather than an expected path.
  if (!profile) {
    return (
      <Alert tone="error" title="Profile missing">
        Your profile record could not be loaded. Please sign out and in again.
      </Alert>
    );
  }

  const age = calculateAge(profile.dateOfBirth);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">My profile</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          These are the basics every account must supply. Only your work description, education and
          country of residence appear on a public listing — your Emirates ID, date of birth and
          place of birth are never published.
        </p>
      </header>

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900">Profile picture</h2>
        <ProfilePhotoCard
          userId={user.id}
          name={profile.fullName || 'Your account'}
          hasPhoto={Boolean(profile.avatarDocumentId)}
          documentId={profile.avatarDocumentId}
        />
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-900">What you have on file</h2>
        <div className="mt-3">
          <DescriptionList
            items={[
              { term: 'Account type', detail: ACCOUNT_TYPE_LABEL[user.accountType] },
              { term: 'Full name', detail: profile.fullName || 'Not provided' },
              {
                term: 'Age',
                detail: age !== null ? `${age} (from date of birth)` : 'Date of birth not provided',
              },
              {
                term: 'Date of birth',
                detail: profile.dateOfBirth ? formatDate(profile.dateOfBirth) : 'Not provided',
              },
              { term: 'Place of birth', detail: profile.placeOfBirth ?? 'Not provided' },
              {
                term: 'Country of residence',
                detail: profile.countryOfResidence ?? 'Not provided',
              },
              { term: 'Nationality', detail: profile.nationality ?? 'Not provided' },
              { term: 'Phone', detail: profile.phone ?? 'Not provided' },
            ]}
          />
        </div>
      </Card>

      <Card>
        <h2 className="mb-5 font-semibold text-slate-900">Edit your details</h2>
        <ProfileForm
          profile={{
            fullName: profile.fullName,
            dateOfBirth: profile.dateOfBirth,
            placeOfBirth: profile.placeOfBirth,
            countryOfResidence: profile.countryOfResidence,
            nationality: profile.nationality,
            phone: profile.phone,
            emiratesIdNumber: profile.emiratesIdNumber,
            emiratesIdExpiry: profile.emiratesIdExpiry,
            workDescription: profile.workDescription,
            educationBackground: profile.educationBackground,
          }}
        />
      </Card>

      {user.accountType !== 'USER' ? (
        <Card>
          <h2 className="font-semibold text-slate-900">Next step</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add your {user.accountType === 'FIRM' ? 'firm\u2019s legal registration' : 'legal licence'}{' '}
            details, then upload your documents.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/credentials" className={buttonClasses('primary', 'md')}>
              Edit legal details
            </Link>
            <Link href="/verification" className={buttonClasses('secondary', 'md')}>
              Go to documents
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="font-semibold text-slate-900">Next step</h2>
          <p className="mt-1 text-sm text-slate-600">
            Upload your Emirates ID to submit your account for verification.
          </p>
          <Link href="/verification" className={buttonClasses('primary', 'md', 'mt-4')}>
            Go to documents
          </Link>
        </Card>
      )}
    </div>
  );
}
