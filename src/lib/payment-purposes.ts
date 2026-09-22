/**
 * What a professional can charge for. Kept free of server imports so the client
 * form and the server schema can share one list.
 */
export const PAYMENT_PURPOSES = [
  { value: 'CONSULTATION', label: 'Consultation fee' },
  { value: 'CASE_ASSISTANCE', label: 'Case assistance fee' },
  { value: 'COURT_FEES', label: 'Court and filing fees' },
  { value: 'OTHER', label: 'Other' },
] as const;
