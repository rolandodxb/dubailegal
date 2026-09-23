'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MemberCasesDict } from '@/lib/i18n/dict/memberCases';
import { buttonClasses } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

/**
 * Print, save as a PDF, and go back to the conversation.
 *
 * "Download the receipt as a PDF" is the browser's own print-to-PDF, which is
 * what every web receipt does and needs no library. Once the print dialog closes
 * — whether the client saved a file or cancelled — the page returns to the case
 * conversation, where the fee card now reads as paid.
 */
export function ReceiptActions({
  caseId,
  receiptNumber,
  labels,
}: {
  caseId: string;
  receiptNumber: string;
  labels: MemberCasesDict['receiptActions'];
}) {
  const router = useRouter();
  const [returning, setReturning] = useState(false);

  const goBack = useCallback(() => {
    setReturning(true);
    router.push(`/cases/${caseId}`);
  }, [caseId, router]);

  useEffect(() => {
    const handleAfterPrint = () => {
      // Give the "saved" line a moment to be read before the page moves on.
      setReturning(true);
      window.setTimeout(() => router.push(`/cases/${caseId}`), 900);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [caseId, router]);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
      <button type="button" onClick={() => window.print()} className={buttonClasses('primary', 'lg')}>
        <Icon name="printer" size={18} />
        {labels.download}
      </button>

      <button type="button" onClick={goBack} className={buttonClasses('secondary', 'lg')}>
        {labels.backToCase}
      </button>

      <span className="text-xs text-slate-500">
        {returning ? labels.saved : labels.hint.replace('{number}', receiptNumber)}
      </span>
    </div>
  );
}
