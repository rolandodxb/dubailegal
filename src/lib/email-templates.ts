/** Message bodies for outbound mail. Kept separate so they are easy to review. */

export function buildInquiryReplyEmail(params: {
  recipientName: string;
  senderName: string;
  subject: string;
  body: string;
  dashboardUrl: string;
}): { subject: string; body: string } {
  return {
    subject: `Dubai Legal — ${params.subject}`,
    body: [
      `Hello ${params.recipientName},`,
      '',
      `${params.senderName} sent you a message through Dubai Legal:`,
      '',
      params.subject,
      '----------------------------------------',
      params.body,
      '----------------------------------------',
      '',
      `Open it and reply from your dashboard: ${params.dashboardUrl}`,
      '',
      '— Dubai Legal',
    ].join('\n'),
  };
}
