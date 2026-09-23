import type { Metadata } from 'next';
import Link from 'next/link';
import { requireActiveUser } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { accountTypeLabel } from '@/lib/i18n/labels';
import { calculateAge, formatDate } from '@/lib/format';
import { getProfileForEdit } from '@/server/services/profile-service';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { ProfilePhotoCard } from '@/components/forms/ProfilePhotoCard';
import { Alert, buttonClasses, Card, DescriptionList } from '@/components/ui/primitives';
import { countryNamesFor } from '@/lib/i18n/country-names';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.items.myProfile };
}

export default async function ProfilePage() {
  const [{ t, effectiveLocale }, user] = await Promise.all([getI18n(), requireActiveUser()]);
  const profile = await getProfileForEdit(user.id);

  // The form requires a non-null profile row to edit, and registration always
  // creates one, so this is a safety net rather than an expected path.
  if (!profile) {
    return (
      <Alert tone="error" title={t.memberCore.profile.missingTitle}>
        {t.memberCore.profile.missingBody}
      </Alert>
    );
  }

  const age = calculateAge(profile.dateOfBirth);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.myProfile}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{t.memberCore.profile.intro}</p>
      </header>

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900">{t.memberCore.profile.picture}</h2>
        <ProfilePhotoCard
          userId={user.id}
          name={profile.fullName || t.memberCore.profile.yourAccount}
          hasPhoto={Boolean(profile.avatarDocumentId)}
          documentId={profile.avatarDocumentId}
          labels={t.memberCore.profilePhoto}
        />
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-900">{t.memberCore.profile.onFile}</h2>
        <div className="mt-3">
          <DescriptionList
            items={[
              {
                term: t.memberCore.profile.accountType,
                detail: accountTypeLabel(t, user.accountType),
              },
              { term: t.memberCore.profile.fullName, detail: profile.fullName || t.memberCore.profile.notProvided },
              {
                term: t.memberCore.profile.age,
                detail:
                  age !== null
                    ? t.memberCore.profile.ageFromDob.replace('{age}', String(age))
                    : t.memberCore.profile.dobNotProvided,
              },
              {
                term: t.memberCore.profile.dateOfBirth,
                detail: profile.dateOfBirth
                  ? formatDate(profile.dateOfBirth)
                  : t.memberCore.profile.notProvided,
              },
              {
                term: t.memberCore.profile.placeOfBirth,
                detail: profile.placeOfBirth ?? t.memberCore.profile.notProvided,
              },
              {
                term: t.memberCore.profile.countryOfResidence,
                detail: profile.countryOfResidence ?? t.memberCore.profile.notProvided,
              },
              {
                term: t.memberCore.profile.nationality,
                detail: profile.nationality ?? t.memberCore.profile.notProvided,
              },
              { term: t.common.phone, detail: profile.phone ?? t.memberCore.profile.notProvided },
            ]}
          />
        </div>
      </Card>

      <Card>
        <h2 className="mb-5 font-semibold text-slate-900">{t.memberCore.profile.editDetails}</h2>
        <ProfileForm
          profile={{
            fullName: profile.fullName,
            dateOfBirth: profile.dateOfBirth,
            placeOfBirth: profile.placeOfBirth,
            countryOfResidence: profile.countryOfResidence,
            nationality: profile.nationality,
            // The country *codes* are what the pickers bind to. Without them the
            // form reopens on "Not specified" and the stored answer looks lost.
            countryOfBirthCode: profile.countryOfBirthCode,
            nationalityCode: profile.nationalityCode,
            countryOfResidenceCode: profile.countryOfResidenceCode,
            declaresNoResidencePermit: profile.declaresNoResidencePermit,
            phone: profile.phone,
            emiratesIdNumber: profile.emiratesIdNumber,
            emiratesIdExpiry: profile.emiratesIdExpiry,
            workDescription: profile.workDescription,
            educationBackground: profile.educationBackground,
          }}
          countryNames={countryNamesFor(effectiveLocale)}
          labels={t.memberCore.profileForm}
        />
      </Card>

      {user.accountType !== 'USER' ? (
        <Card>
          <h2 className="font-semibold text-slate-900">{t.memberCore.profile.nextStep}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {user.accountType === 'FIRM'
              ? t.memberCore.profile.firmRegistration
              : t.memberCore.profile.licence}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/credentials" className={buttonClasses('primary', 'md')}>
              {t.memberCore.profile.editLegalDetails}
            </Link>
            <Link href="/verification" className={buttonClasses('secondary', 'md')}>
              {t.memberCore.profile.goToDocuments}
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="font-semibold text-slate-900">{t.memberCore.profile.nextStep}</h2>
          <p className="mt-1 text-sm text-slate-600">{t.memberCore.profile.uploadEmiratesId}</p>
          <Link href="/verification" className={buttonClasses('primary', 'md', 'mt-4')}>
            {t.memberCore.profile.goToDocuments}
          </Link>
        </Card>
      )}
    </div>
  );
}
