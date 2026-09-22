-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('USER', 'LAWYER', 'FIRM');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'REVIEWER');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_EMAIL', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LegalArea" AS ENUM ('CRIMINAL_PENAL', 'CIVIL', 'COMMERCIAL', 'FAMILY_PERSONAL_STATUS', 'LABOUR_EMPLOYMENT', 'REAL_ESTATE_PROPERTY', 'IMMIGRATION_RESIDENCY', 'ARBITRATION', 'INTELLECTUAL_PROPERTY', 'BANKING_FINANCE', 'TAX', 'ADMINISTRATIVE', 'MARITIME', 'CYBERCRIME', 'OTHER');

-- CreateEnum
CREATE TYPE "Emirate" AS ENUM ('ABU_DHABI', 'DUBAI', 'SHARJAH', 'AJMAN', 'UMM_AL_QUWAIN', 'RAS_AL_KHAIMAH', 'FUJAIRAH');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('EMIRATES_ID', 'PASSPORT', 'PROFILE_PHOTO', 'LAWYER_LICENSE', 'FIRM_TRADE_LICENSE', 'POWER_OF_ATTORNEY', 'PROFESSIONAL_INDEMNITY_INSURANCE', 'BRAND_LOGO', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('AWAITING_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'READ', 'RESPONDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "LegalCaseStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'DISTRIBUTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('BOOKED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AppointmentMode" AS ENUM ('VIDEO_CALL', 'OFFICE_VISIT', 'PHONE_CALL');

-- CreateEnum
CREATE TYPE "AppointmentConfirmation" AS ENUM ('NOT_REQUIRED', 'PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('SCHEDULED', 'CASE_REQUEST');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "EmergencyStatus" AS ENUM ('OPEN', 'ACCEPTED', 'CANCELLED', 'RESOLVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('REQUESTED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'PASSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('OPEN', 'CLAIMED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportCategory" AS ENUM ('ACCOUNT_ACCESS', 'VERIFICATION', 'CASE_OR_MEETING', 'PAYMENT', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'ANSWERED', 'SOLVED');

-- CreateEnum
CREATE TYPE "CommunityTopic" AS ENUM ('LABOUR_EMPLOYMENT', 'TENANCY_PROPERTY', 'FAMILY_PERSONAL_STATUS', 'CRIMINAL_PENAL', 'TRAFFIC_FINES', 'VISAS_RESIDENCY', 'BUSINESS_CONTRACTS', 'MONEY_DEBT', 'COURTS_PROCEDURE', 'COSTS_FEES', 'USING_DUBAI_LEGAL', 'OTHER');

-- CreateEnum
CREATE TYPE "BlogPostKind" AS ENUM ('RECOMMENDATION', 'QUESTION', 'NOTE');

-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('PENDING', 'PUBLISHED', 'DUPLICATE', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "BlogCommentStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "ReactionKind" AS ENUM ('LIKE', 'HEART', 'WOW');

-- CreateEnum
CREATE TYPE "BlogModerationReason" AS ENUM ('DUPLICATE', 'NOT_A_LEGAL_TOPIC', 'ABUSIVE', 'ADVERTISING', 'CONFIDENTIAL_DETAIL', 'OTHER');

-- CreateEnum
CREATE TYPE "ReceiptLayout" AS ENUM ('STANDARD', 'CUSTOM');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_EMAIL',
    "roles" "Role"[] DEFAULT ARRAY['MEMBER']::"Role"[],
    "emailVerifiedAt" TIMESTAMP(3),
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "suspendedReason" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "twoFactorSecret" TEXT,
    "twoFactorEnabledAt" TIMESTAMP(3),
    "twoFactorRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "pendingFirmInviteHash" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "placeOfBirth" TEXT,
    "countryOfResidence" TEXT,
    "nationality" TEXT,
    "phone" TEXT,
    "emiratesIdNumber" TEXT,
    "emiratesIdExpiry" DATE,
    "emiratesIdFingerprint" TEXT,
    "emiratesIdCheckDigitOk" BOOLEAN,
    "workDescription" TEXT,
    "educationBackground" TEXT,
    "avatarDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lawyer_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licensingAuthority" TEXT NOT NULL,
    "licenseIssuedOn" DATE,
    "licenseExpiresOn" DATE,
    "yearsOfExperience" INTEGER,
    "barAssociationNumber" TEXT,
    "affiliatedFirmId" TEXT,
    "createdByFirmId" TEXT,
    "acceptsEmergency" BOOLEAN NOT NULL DEFAULT false,
    "emergencyNote" TEXT,
    "isFirmEmergency" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bankAccountName" TEXT,
    "bankName" TEXT,
    "bankIban" TEXT,
    "bankAccountNumber" TEXT,
    "bankSwift" TEXT,
    "bankBranch" TEXT,
    "bankInstructions" TEXT,

    CONSTRAINT "lawyer_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "firm_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeLicenseNumber" TEXT NOT NULL,
    "tradeLicenseAuthority" TEXT NOT NULL,
    "tradeLicenseIssuedOn" DATE,
    "tradeLicenseExpiresOn" DATE,
    "legalStructure" TEXT,
    "registeredEmirate" "Emirate",
    "registeredAddress" TEXT,
    "website" TEXT,
    "firmSize" INTEGER,
    "authorisedSignatory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bankAccountName" TEXT,
    "bankName" TEXT,
    "bankIban" TEXT,
    "bankAccountNumber" TEXT,
    "bankSwift" TEXT,
    "bankBranch" TEXT,
    "bankInstructions" TEXT,

    CONSTRAINT "firm_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AccountType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "primaryEmirate" "Emirate" NOT NULL,
    "emirates" "Emirate"[],
    "areas" "LegalArea"[],
    "languages" TEXT[],
    "yearsOfExperience" INTEGER,
    "acceptsNewClients" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "addressLine" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'AWAITING_REVIEW',
    "documentNumber" TEXT,
    "expiresOn" DATE,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "caseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_case" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "status" "CaseStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "decisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "twoFactorPassedAt" TIMESTAMP(3),

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_token" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_message" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "toEmail" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "replyBody" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_case" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caseType" "LegalArea" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "LegalCaseStatus" NOT NULL DEFAULT 'SUBMITTED',
    "clientId" TEXT NOT NULL,
    "firmId" TEXT,
    "lawyerId" TEXT,
    "listingId" TEXT,
    "actionedByUserId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "distributedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseSequence" (
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CaseSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "case_file" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_message" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_message_attachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_message_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_status_event" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fromStatus" "LegalCaseStatus",
    "toStatus" "LegalCaseStatus" NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_status_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment" (
    "id" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "firmId" TEXT,
    "clientId" TEXT NOT NULL,
    "caseId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'BOOKED',
    "note" TEXT,
    "mode" "AppointmentMode" NOT NULL DEFAULT 'OFFICE_VISIT',
    "officeAddress" TEXT,
    "roomCode" TEXT,
    "confirmation" "AppointmentConfirmation" NOT NULL DEFAULT 'NOT_REQUIRED',
    "confirmedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "source" "AppointmentSource" NOT NULL DEFAULT 'SCHEDULED',
    "requestedById" TEXT,
    "rescheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "firm_invitation" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedByUserId" TEXT NOT NULL,
    "lawyerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "firm_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "app_setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "traffic_log" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "userId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traffic_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "hiddenReason" TEXT,
    "moderatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_request" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "guestEmail" TEXT,
    "roomCode" TEXT,
    "guestTokenHash" TEXT,
    "title" TEXT NOT NULL,
    "caseType" "LegalArea" NOT NULL,
    "description" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "status" "EmergencyStatus" NOT NULL DEFAULT 'OPEN',
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "legalCaseId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_request" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "amountFils" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "purpose" TEXT NOT NULL,
    "details" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'REQUESTED',
    "method" "PaymentMethod",
    "bankAccountName" TEXT,
    "bankName" TEXT,
    "bankIban" TEXT,
    "bankAccountNumber" TEXT,
    "bankSwift" TEXT,
    "bankBranch" TEXT,
    "bankInstructions" TEXT,
    "reference" TEXT,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "cardholderName" TEXT,
    "receiptNumber" TEXT,
    "receiptIssuedAt" TIMESTAMP(3),
    "proofDocumentId" TEXT,
    "proofRequestedAt" TIMESTAMP(3),
    "proofSubmittedAt" TIMESTAMP(3),
    "proofNote" TEXT,
    "paidById" TEXT,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_offer" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_enquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "caseType" "LegalArea",
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'OPEN',
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" "SupportCategory" NOT NULL DEFAULT 'OTHER',
    "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
    "contextPath" TEXT,
    "ownerReadAt" TIMESTAMP(3),
    "solvedAt" TIMESTAMP(3),
    "solvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_message" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "fromStaff" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "BlogPostKind" NOT NULL DEFAULT 'NOTE',
    "topic" "CommunityTopic" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "listingId" TEXT,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'PENDING',
    "duplicateOfId" TEXT,
    "similarityScore" DOUBLE PRECISION,
    "similarityPostId" TEXT,
    "similarityTerms" TEXT,
    "moderationReason" "BlogModerationReason",
    "reviewedAt" TIMESTAMP(3),
    "score" INTEGER NOT NULL DEFAULT 0,
    "moderatedAt" TIMESTAMP(3),
    "moderatedById" TEXT,
    "moderationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "status" "BlogCommentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_reaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ReactionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blogCommentId" TEXT,

    CONSTRAINT "blog_reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comment_reaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ReactionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_comment_reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_vote" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comment_vote" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_comment_vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_template" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "layout" "ReceiptLayout" NOT NULL DEFAULT 'STANDARD',
    "brandName" TEXT,
    "headerLine" TEXT,
    "footerNote" TEXT,
    "accentColor" TEXT,
    "logoDocumentId" TEXT,
    "showLicence" BOOLEAN NOT NULL DEFAULT true,
    "showFirm" BOOLEAN NOT NULL DEFAULT true,
    "showContact" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_signal" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "fromKey" TEXT NOT NULL,
    "fromUserId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_recording" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "appointmentId" TEXT,
    "emergencyRequestId" TEXT,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_recording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_presence" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "participantKey" TEXT NOT NULL,
    "userId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_presence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_accountType_verificationStatus_idx" ON "user"("accountType", "verificationStatus");

-- CreateIndex
CREATE INDEX "user_status_idx" ON "user"("status");

-- CreateIndex
CREATE UNIQUE INDEX "profile_userId_key" ON "profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_emiratesIdFingerprint_key" ON "profile"("emiratesIdFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "lawyer_profile_userId_key" ON "lawyer_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "firm_profile_userId_key" ON "firm_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "listing_userId_key" ON "listing"("userId");

-- CreateIndex
CREATE INDEX "listing_published_kind_idx" ON "listing"("published", "kind");

-- CreateIndex
CREATE INDEX "listing_primaryEmirate_idx" ON "listing"("primaryEmirate");

-- CreateIndex
CREATE INDEX "listing_areas_idx" ON "listing" USING GIN ("areas");

-- CreateIndex
CREATE INDEX "listing_emirates_idx" ON "listing" USING GIN ("emirates");

-- CreateIndex
CREATE UNIQUE INDEX "document_storageKey_key" ON "document"("storageKey");

-- CreateIndex
CREATE INDEX "document_userId_kind_status_idx" ON "document"("userId", "kind", "status");

-- CreateIndex
CREATE INDEX "document_caseId_idx" ON "document"("caseId");

-- CreateIndex
CREATE INDEX "verification_case_status_submittedAt_idx" ON "verification_case"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "verification_case_userId_status_idx" ON "verification_case"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "session_tokenHash_key" ON "session"("tokenHash");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "session_expiresAt_idx" ON "session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_token_tokenHash_key" ON "email_token"("tokenHash");

-- CreateIndex
CREATE INDEX "email_token_userId_purpose_idx" ON "email_token"("userId", "purpose");

-- CreateIndex
CREATE INDEX "email_message_status_createdAt_idx" ON "email_message"("status", "createdAt");

-- CreateIndex
CREATE INDEX "inquiry_toUserId_status_idx" ON "inquiry"("toUserId", "status");

-- CreateIndex
CREATE INDEX "inquiry_fromUserId_idx" ON "inquiry"("fromUserId");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_actorUserId_createdAt_idx" ON "audit_log"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "legal_case_reference_key" ON "legal_case"("reference");

-- CreateIndex
CREATE INDEX "legal_case_clientId_status_idx" ON "legal_case"("clientId", "status");

-- CreateIndex
CREATE INDEX "legal_case_status_submittedAt_idx" ON "legal_case"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "legal_case_lawyerId_status_idx" ON "legal_case"("lawyerId", "status");

-- CreateIndex
CREATE INDEX "legal_case_firmId_status_idx" ON "legal_case"("firmId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "case_file_storageKey_key" ON "case_file"("storageKey");

-- CreateIndex
CREATE INDEX "case_file_caseId_idx" ON "case_file"("caseId");

-- CreateIndex
CREATE INDEX "case_message_caseId_createdAt_idx" ON "case_message"("caseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "case_message_attachment_storageKey_key" ON "case_message_attachment"("storageKey");

-- CreateIndex
CREATE INDEX "case_message_attachment_messageId_idx" ON "case_message_attachment"("messageId");

-- CreateIndex
CREATE INDEX "case_status_event_caseId_createdAt_idx" ON "case_status_event"("caseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_roomCode_key" ON "appointment"("roomCode");

-- CreateIndex
CREATE INDEX "appointment_lawyerId_startsAt_idx" ON "appointment"("lawyerId", "startsAt");

-- CreateIndex
CREATE INDEX "appointment_clientId_startsAt_idx" ON "appointment"("clientId", "startsAt");

-- CreateIndex
CREATE INDEX "notification_userId_readAt_idx" ON "notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "firm_invitation_tokenHash_key" ON "firm_invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "firm_invitation_firmId_status_idx" ON "firm_invitation"("firmId", "status");

-- CreateIndex
CREATE INDEX "firm_invitation_email_status_idx" ON "firm_invitation"("email", "status");

-- CreateIndex
CREATE INDEX "traffic_log_createdAt_idx" ON "traffic_log"("createdAt");

-- CreateIndex
CREATE INDEX "traffic_log_userId_createdAt_idx" ON "traffic_log"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "traffic_log_path_createdAt_idx" ON "traffic_log"("path", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "review_caseId_key" ON "review"("caseId");

-- CreateIndex
CREATE INDEX "review_targetUserId_status_idx" ON "review"("targetUserId", "status");

-- CreateIndex
CREATE INDEX "review_listingId_status_idx" ON "review"("listingId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_request_roomCode_key" ON "emergency_request"("roomCode");

-- CreateIndex
CREATE INDEX "emergency_request_status_createdAt_idx" ON "emergency_request"("status", "createdAt");

-- CreateIndex
CREATE INDEX "emergency_request_clientId_status_idx" ON "emergency_request"("clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_request_receiptNumber_key" ON "payment_request"("receiptNumber");

-- CreateIndex
CREATE INDEX "payment_request_caseId_status_idx" ON "payment_request"("caseId", "status");

-- CreateIndex
CREATE INDEX "payment_request_requestedById_status_idx" ON "payment_request"("requestedById", "status");

-- CreateIndex
CREATE INDEX "case_offer_lawyerId_status_idx" ON "case_offer"("lawyerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "case_offer_caseId_lawyerId_key" ON "case_offer"("caseId", "lawyerId");

-- CreateIndex
CREATE INDEX "public_enquiry_status_createdAt_idx" ON "public_enquiry"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "support_ticket_reference_key" ON "support_ticket"("reference");

-- CreateIndex
CREATE INDEX "support_ticket_status_updatedAt_idx" ON "support_ticket"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "support_ticket_userId_updatedAt_idx" ON "support_ticket"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "support_message_ticketId_createdAt_idx" ON "support_message"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "blog_post_status_createdAt_idx" ON "blog_post"("status", "createdAt");

-- CreateIndex
CREATE INDEX "blog_post_status_topic_idx" ON "blog_post"("status", "topic");

-- CreateIndex
CREATE INDEX "blog_post_status_score_idx" ON "blog_post"("status", "score");

-- CreateIndex
CREATE INDEX "blog_post_listingId_status_idx" ON "blog_post"("listingId", "status");

-- CreateIndex
CREATE INDEX "blog_post_authorId_createdAt_idx" ON "blog_post"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "blog_comment_postId_createdAt_idx" ON "blog_comment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "blog_reaction_postId_idx" ON "blog_reaction"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_reaction_userId_postId_key" ON "blog_reaction"("userId", "postId");

-- CreateIndex
CREATE INDEX "blog_comment_reaction_commentId_idx" ON "blog_comment_reaction"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_comment_reaction_userId_commentId_key" ON "blog_comment_reaction"("userId", "commentId");

-- CreateIndex
CREATE INDEX "blog_vote_postId_idx" ON "blog_vote"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_vote_userId_postId_key" ON "blog_vote"("userId", "postId");

-- CreateIndex
CREATE INDEX "blog_comment_vote_commentId_idx" ON "blog_comment_vote"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_comment_vote_userId_commentId_key" ON "blog_comment_vote"("userId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_template_userId_key" ON "receipt_template"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscription_endpoint_key" ON "push_subscription"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscription_userId_idx" ON "push_subscription"("userId");

-- CreateIndex
CREATE INDEX "room_signal_roomCode_createdAt_idx" ON "room_signal"("roomCode", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "room_recording_storageKey_key" ON "room_recording"("storageKey");

-- CreateIndex
CREATE INDEX "room_recording_roomCode_createdAt_idx" ON "room_recording"("roomCode", "createdAt");

-- CreateIndex
CREATE INDEX "room_presence_roomCode_idx" ON "room_presence"("roomCode");

-- CreateIndex
CREATE UNIQUE INDEX "room_presence_roomCode_participantKey_key" ON "room_presence"("roomCode", "participantKey");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lawyer_profile" ADD CONSTRAINT "lawyer_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lawyer_profile" ADD CONSTRAINT "lawyer_profile_affiliatedFirmId_fkey" FOREIGN KEY ("affiliatedFirmId") REFERENCES "firm_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lawyer_profile" ADD CONSTRAINT "lawyer_profile_createdByFirmId_fkey" FOREIGN KEY ("createdByFirmId") REFERENCES "firm_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firm_profile" ADD CONSTRAINT "firm_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "verification_case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_case" ADD CONSTRAINT "verification_case_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_case" ADD CONSTRAINT "verification_case_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_token" ADD CONSTRAINT "email_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_message" ADD CONSTRAINT "email_message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_case" ADD CONSTRAINT "legal_case_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_case" ADD CONSTRAINT "legal_case_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "firm_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_case" ADD CONSTRAINT "legal_case_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "lawyer_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_case" ADD CONSTRAINT "legal_case_actionedByUserId_fkey" FOREIGN KEY ("actionedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_file" ADD CONSTRAINT "case_file_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "legal_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_file" ADD CONSTRAINT "case_file_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_message" ADD CONSTRAINT "case_message_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "legal_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_message" ADD CONSTRAINT "case_message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_message_attachment" ADD CONSTRAINT "case_message_attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "case_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_event" ADD CONSTRAINT "case_status_event_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "legal_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_event" ADD CONSTRAINT "case_status_event_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "lawyer_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "firm_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "legal_case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firm_invitation" ADD CONSTRAINT "firm_invitation_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "firm_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firm_invitation" ADD CONSTRAINT "firm_invitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firm_invitation" ADD CONSTRAINT "firm_invitation_lawyerUserId_fkey" FOREIGN KEY ("lawyerUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_setting" ADD CONSTRAINT "app_setting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traffic_log" ADD CONSTRAINT "traffic_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "legal_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_request" ADD CONSTRAINT "emergency_request_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_request" ADD CONSTRAINT "emergency_request_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_request" ADD CONSTRAINT "emergency_request_legalCaseId_fkey" FOREIGN KEY ("legalCaseId") REFERENCES "legal_case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_request" ADD CONSTRAINT "payment_request_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "legal_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_request" ADD CONSTRAINT "payment_request_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_request" ADD CONSTRAINT "payment_request_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_offer" ADD CONSTRAINT "case_offer_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "legal_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_offer" ADD CONSTRAINT "case_offer_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "lawyer_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_enquiry" ADD CONSTRAINT "public_enquiry_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_solvedById_fkey" FOREIGN KEY ("solvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_message" ADD CONSTRAINT "support_message_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_message" ADD CONSTRAINT "support_message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "blog_post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment" ADD CONSTRAINT "blog_comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment" ADD CONSTRAINT "blog_comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment" ADD CONSTRAINT "blog_comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "blog_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_reaction" ADD CONSTRAINT "blog_reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_reaction" ADD CONSTRAINT "blog_reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_reaction" ADD CONSTRAINT "blog_reaction_blogCommentId_fkey" FOREIGN KEY ("blogCommentId") REFERENCES "blog_comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment_reaction" ADD CONSTRAINT "blog_comment_reaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "blog_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment_reaction" ADD CONSTRAINT "blog_comment_reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_vote" ADD CONSTRAINT "blog_vote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_vote" ADD CONSTRAINT "blog_vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment_vote" ADD CONSTRAINT "blog_comment_vote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "blog_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment_vote" ADD CONSTRAINT "blog_comment_vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_template" ADD CONSTRAINT "receipt_template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_signal" ADD CONSTRAINT "room_signal_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_recording" ADD CONSTRAINT "room_recording_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_recording" ADD CONSTRAINT "room_recording_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_recording" ADD CONSTRAINT "room_recording_emergencyRequestId_fkey" FOREIGN KEY ("emergencyRequestId") REFERENCES "emergency_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_presence" ADD CONSTRAINT "room_presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── A partial unique index, which the Prisma schema language cannot express ──
--
-- A lawyer cannot be double-booked into the same slot. Only *booked diary
-- entries* count: a cancelled meeting does not block the slot being offered
-- again, and an urgent call raised by a client is a room rather than a diary
-- entry, so it must not take a slot either. This is the constraint that
-- actually holds under a race between two bookings; the application checks
-- first only to give a clear message in the common case.
CREATE UNIQUE INDEX "appointment_lawyer_slot_booked_key"
  ON "appointment" ("lawyerId", "startsAt")
  WHERE "status" = 'BOOKED' AND "source" = 'SCHEDULED';
