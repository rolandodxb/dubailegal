import Link from 'next/link';
import { buttonClasses } from '@/components/ui/primitives';

export default function NotFound() {
  return (
    <div className="dl-container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-medium text-brand-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">We could not find that page</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        The page may have moved, or the profile you are looking for may have been removed from the
        directory by its owner.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/directory" className={buttonClasses('primary', 'md')}>
          Browse the directory
        </Link>
        <Link href="/" className={buttonClasses('secondary', 'md')}>
          Go home
        </Link>
      </div>
    </div>
  );
}
