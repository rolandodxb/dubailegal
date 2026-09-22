# Dubai Legal

A mobile-first web app where people find lawyers and legal firms in the United Arab Emirates,
filter by area of law and emirate, submit a case to a professional, follow that case from
submission to assignment, and message the other side inside it — while every professional profile
can be checked against documents a named human reviewer actually examined.

---

## Quick start

```bash
# 1. Database (a dedicated container, so nothing else on your machine is touched)
docker run -d --name dubailegal-postgres \
  -e POSTGRES_USER=dubailegal -e POSTGRES_PASSWORD=dubailegal -e POSTGRES_DB=dubailegal \
  -p 5433:5432 -v dubailegal-postgres-data:/var/lib/postgresql/data postgres:16-alpine

# 2. Install and prepare
cp .env.example .env          # then set APP_SECRET to a long random value
npm install
npm run db:deploy             # applies prisma/migrations

# 3. Run
npm run dev                   # http://localhost:3100
```

### The admin account

`BOOTSTRAP_REVIEWER_EMAILS` in `.env` is set to `crisdoraodxb@gmail.com`. Registering with that
address grants the REVIEWER role at signup, and reviewers are taken straight to
`/admin/verifications` after signing in rather than to their own dashboard.

For any other address, grant the role afterwards:

```bash
npm run grant:reviewer -- someone@example.com          # add
npm run grant:reviewer -- someone@example.com --remove  # take away
```

### Sample data

```bash
npm run seed:demo              # 1 lawyer + 1 legal firm, ready to interact with
npm run seed:demo -- --pending # same, but left in the review queue for you to approve
```

The seed creates one lawyer and one legal firm with complete profiles, licences, published
listings and uploaded documents, and registers the lawyer as one of the firm's lawyers. If a
reviewer account already exists they are approved automatically; otherwise they wait in the queue.

They are the **only fabricated records in the product**, they are flagged `isDemo`, and the reviewer
console labels them "Seeded demo data" so a sample profile can never be mistaken for a real member.
Re-running the seed replaces them rather than accumulating duplicates.

**Nothing else is ever mocked.** There is no fabricated enquiry, emergency, fee, meeting, review or
support ticket anywhere in the product: a page that shows nothing is telling the truth about an empty
installation, and it says so. When you no longer want the sample accounts, *Settings → Sample data →
Delete all sample data* removes every `isDemo` account with its documents, cases and messages in one
action, typing `DELETE SAMPLE DATA` to confirm. Real accounts are never touched, whatever they are
called.

| | Email | Password |
|---|---|---|
| Lawyer | `demo.lawyer@dubai-legal.local` | `DemoLawyer2026!` |
| Legal firm | `demo.firm@dubai-legal.local` | `DemoFirm2026!` |

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | Development and production server on port 3100 |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:migrate` / `db:deploy` | Create / apply migrations |
| `npm run db:verify` | Checks eight verification invariants and fails loudly if any is broken |
| `npm run db:check` | What the app is connected to: host, role, tables, migrations, encryption key |
| `npm run seed:demo` | Creates the two sample accounts |
| `npm run grant:reviewer -- <email>` | Grants or removes reviewer access |
| `npm run e2e` | All ten end-to-end suites against the real database and a running server |
| `npm run e2e:account` | Account, verification and authorization suite |
| `npm run e2e:cases` | Case workflow, calendar, firm roster and chat suite |
| `npm run e2e:admin` | Admin operations, reviews, photos and feature switches suite |
| `npm run e2e:roles` | Directory membership, firm lawyers, message paging, administrator confinement and on-profile reviews |
| `npm run e2e:features` | Push, emergencies, conference rooms, office requests, simulated payments and account deletion |
| `npm run e2e:collab` | Firm case distribution, the enquiry pool, two-factor and the no-login emergency room |
| `npm run e2e:flows` | Meeting changes and deletions, urgent calls from a case, support tickets, sample-data deletion and the two landing-page audiences |
| `npm run e2e:brand` | The mark, the receipt layouts, the fixed administrator letterhead and an operator's own account |
| `npm run e2e:round2` | The pool restriction, chat attachments, encryption at rest, the page layout, call control, recordings and bank-transfer fees |
| `npm run e2e:community` | Boards, the review queue, the automatic duplicate check, the moderator's decisions, threads and reactions |
| `npm run shots` | Screenshots of every page at three widths, into `var/shots/` (development only) |

---

## Email confirmation is currently switched off

`REQUIRE_EMAIL_VERIFICATION=false`. This installation has **no mail provider**, so new accounts are
activated at signup and no confirmation link is generated — requiring a confirmation that could not
be delivered would lock every new user out. The confirmation and outbox screens say so plainly.

Set `REQUIRE_EMAIL_VERIFICATION=true` once a real transport exists in `src/lib/email.ts`, and the
original flow returns: a token is issued, the account is held at `PENDING_EMAIL`, and
`/verify-email` gates the signed-in area. The end-to-end suite exercises whichever mode is active.

Email itself still goes to the **outbox** (`EMAIL_PROVIDER=outbox`): every message is written to the
database and readable in full at `/admin/outbox`, including confirmation and reset links. Nothing is
ever reported to a user as delivered when it was not.

---

## Account types and what each must supply

The type is chosen at signup and cannot be changed afterwards, because it determines what a
reviewer will demand.

| | Individual | Lawyer | Legal firm |
|---|---|---|---|
| Profile basics | required | required | required |
| Emirates ID number + card | required | required | required |
| Permit to provide legal representation | — | required | required |
| Firm trade licence | — | — | required |
| Optional extras | passport, photo | + indemnity insurance, passport | + power of attorney, indemnity insurance |

"Profile basics" means: full name, date of birth, place of birth, country of residence, phone
number, a description of the work you actually do, and your education background. Age is **derived**
from the date of birth and never stored separately, so the two cannot disagree.

## Who appears in the directory

The directory lists **independent** practitioners and firms. A lawyer is left out of it, and shown
under *Lawyers at this firm* on their firm's profile instead, when **both** of these are true:

- the account was **created inside a firm** rather than through the public signup form, and
- they are **still registered with that firm**.

Both conditions matter. A lawyer who signed up through the public form and later joined a firm
keeps their own listing, because they are an independent practitioner who happens to be affiliated.
And a lawyer the firm created becomes independent again — and their listing returns automatically —
if they leave it.

Firms are always listed. A hidden profile is still reachable by its owner, by the firm that created
it and by a reviewer, so it can be edited and checked; everyone else gets a `404`, and the profile
says plainly why it is not public.

## What the badges mean

A badge is rendered **only** when a reviewer has recorded an approval. It is never granted
automatically, and it is withdrawn if the evidence behind it changes.

| Badge | Colour | Issued to |
|---|---|---|
| Verified account | blue `#1D9BF0` | An individual whose Emirates ID and profile were reviewed |
| Verified lawyer | green `#16A34A` | A lawyer whose Emirates ID and legal permit were reviewed |
| Verified legal firm | black `#0A0A0A` | A firm whose Emirates ID, legal permit and trade licence were reviewed |

Unverified members are **not hidden** — they are labelled with their real status
("Submitted, awaiting review", "Under review", "Not verified") and sorted below verified ones. The
directory carries a prominent *Verified members only* filter.

### What a profile shows once verified

- The **licence number, issuing authority and dates**, with the expiry interpreted for the reader:
  "currently valid", "expires in N days", or "expired".
- A **Verified documents** list naming each document a reviewer accepted.
- The **Emirates ID as a status only** — "Emirates ID verified". Its number is never published, and
  neither is the member's account email or place of birth.

Licence details are withheld entirely until verification, because showing an unchecked licence
number would imply a check that never happened.

---

## Who can do what

| | Individual | Lawyer | Legal firm | Administrator |
|---|---|---|---|---|
| Submit a case | yes | — | — | — |
| Accept a case | no | yes | only through a registered lawyer | **never** |
| Work a case | — | assigned only | through its lawyers | no |
| Review verification requests | no | no | no | yes |
| Ban or reinstate accounts | no | no | no | yes |
| Feature switches, maintenance | no | no | no | yes |
| Ask for an urgent call on their own case | yes | — | — | — |
| Move, cancel or delete a meeting | cancel only | own diary | its lawyers' diaries | **never** |
| Raise a support ticket | yes | yes | yes | no — operators report to each other |
| Answer a support ticket | own ticket | own ticket | own ticket | any ticket, and close it |
| Raise an emergency request | yes | — | — | — |
| Take an emergency request | no | yes | through a registered lawyer | no |
| Enter a conference room | own rooms | own rooms | own firm's rooms | **never** |
| Delete a meeting silently | no | yes | yes | no |
| Work the enquiry pool | **no** | yes | yes | oversight only |
| Post, vote and reply in the community | yes | yes | yes | yes — and moderate it |
| Send files in a case conversation | on their cases | on their cases | on their cases | **never** |
| Play a call recording | the calls they were on | the calls they were on | the calls they were on | **never** |
| Set a billing receipt letterhead | — | yes | yes | no — the platform mark is fixed |

An administrator **oversees but does not practise**. There is no accept, decline or progress control
anywhere in the console, and no reviewer can become a party to a case. Their own account works like
anybody else's — profile, password, two-factor and alerts are all theirs, and the console links
straight to them — because an operator who cannot secure their own account is a liability.

### Verification requests are not cases

These are deliberately different things and the interface never confuses them:

* A **verification request** is an account submitting documents to be checked. It has a reviewer, a
  round number and a decision.
* A **case** is a client engaging a lawyer or firm. It has parties, a status, files and a chat.

They share no vocabulary in the UI, and neither flow can create the other. You will see
"Verification requests" in the console and "Cases" in the directory and dashboards, never the same
word for both.

### The administrator is not a member

Administrator access is a separate role, and it is deliberately narrow: an operator runs the
platform and is never a party to anything on it.

- `/dashboard` redirects them to the console, and every member page — cases, portfolio, pending,
  clients, calendar, inquiries, reviews, listing, legal details, verification, invitations and the
  firm pages — turns them away. Their navigation offers only the console, their alerts, their own
  account and the public directory.
- They cannot send a case, accept one, decline one, book a meeting, write a review or submit
  verification for themselves — each is refused by the server, not merely hidden.
- Self-verification is impossible as a result: a reviewer can never approve their own account.

### The administrator console

The console also watches the **enquiry pool** — how many enquiries are open, and how many were
claimed — because enquiries nobody picks up are the clearest signal that professionals are not
watching it.

| Page | What it is for |
|---|---|
| **Verification queue** | Approve or refuse accounts, document by document |
| **Cases (oversight)** | Every case on the platform, read-only |
| **Accounts** | Search, suspend (ban) and reinstate individuals, lawyers and firms; grant reviewer access; **delete an account permanently** |
| **Enquiries** | The public enquiry pool, claim rate, and which are still unanswered |
| **Emergencies** | Urgent requests, answer rate, and how many professionals are on call |
| **Meetings and rooms** | Every meeting, how it is held, whether the client answered, and room signalling volume |
| **Payments** | Fee activity, clearly labelled as simulated |
| **Reviews** | Hide or restore a review after moderation |
| **Push notifications** | Whether push is configured, which browsers subscribed, and which are failing |
| **Activity register** | Every page view and API call served, with filters and 24-hour totals |
| **Settings** | Turn app functions on and off, maintenance mode, and the danger zone |
| **Outbox** | Every recorded message in full, plus the audit trail |

**Case oversight is deliberately partial.** An administrator can see that a case exists, who is on
it, its state, its timeline and how many files and messages it has — but not the client's
description, the message contents, or the file contents. Those may be legally privileged, and
exposing them to a platform operator is a risk worth naming rather than taking quietly. Say if you
want that changed.

### Deleting an account

Deletion is the hard delete — it is what removes a seeded sample firm or a spam
account for good — and it is guarded by typing the account's email address, so a
mistyped id cannot remove the wrong person. It is refused if the target is the
only reviewer account, so an operator cannot lock themselves out of the console.
The audit trail records that the deletion happened, and who did it.

### Feature switches and maintenance

Each of these is a single click, takes effect immediately, is refused server-side (not merely hidden),
and is written to the audit log with the operator's name:

`registration` · `directory` · `case_submission` · `inquiries` · `appointments` · `reviews` ·
`verification_submission`

**Maintenance mode** shows a notice to everyone except reviewers, who keep their access — so
maintenance can never lock an operator out of turning it back off.

**Shutting down the server** is in the danger zone. It requires typing `SHUT DOWN`, is audited, and
stops the application process. Nothing is deleted, but there is no way to bring it back from the
browser: it must be started again from a terminal. The screen says so before you press it.

### The activity register

Every page view and API call is recorded — method, path, status, duration, and the account
responsible. IP addresses are stored only as a keyed digest, never in the clear. Records are pruned
automatically after 30 days, and clearing the register is itself audited.

## The case workflow

```
client submits ──► SUBMITTED ──► UNDER_REVIEW ──► ASSIGNED ──► IN_PROGRESS ──► COMPLETED
                       │              │
                       └──────────────┴──► DECLINED (with a reason the client reads)
```

1. From a directory profile the client chooses **Get in touch**, names the case, picks its type,
   describes the matter and attaches files.
2. It arrives as **Submitted**. The professional is alerted (in-app — see *Alerts* below).
3. The lawyer opens it with **Review the case**: the client sees **Under review**. Opening it does
   not commit them.
4. **Accept the case** assigns it to that lawyer and the client sees **Assigned**.
5. Either side can then message the other inside the case, and share the papers already attached.
6. The assigned lawyer can mark work started and the case completed. Declining requires a written
   reason.

Every transition is written to an append-only `CaseStatusEvent` with the actor and a note, and the
case page shows that history.

### Cases sent to a law firm

A case can be addressed to a firm instead of a named lawyer, and it follows a deliberate route:

1. It lands in the firm's **pending box**. Nothing has been offered to anybody yet.
2. The firm opens it, reads it, and decides whether it has a lawyer who fits the work.
3. It presses **Accept and send to our lawyers**. Every lawyer registered with the firm is then
   offered the case and alerted — this is the only way a firm case reaches them.
4. Each lawyer **takes it or passes**. Passing is not a refusal of the client: the case stays with
   the firm for a colleague. The firm sees who has answered, who passed and why.
5. The first lawyer to take it is assigned, and every *unanswered* offer is stood down automatically.
   A colleague who had already passed keeps their answer, which is what they said.
6. If **everybody** passes, the firm is told — so a case can never quietly stall.

A firm account is deliberately **not** a lawyer: it can see, discuss and release a case but cannot
take one itself. The UI says so rather than silently disabling the button, and releasing is refused
with a clear message if the firm has no lawyers registered yet.

### The enquiry pool

Somebody who is not ready to send a case can send a **general enquiry** from the landing page, with
no account. It goes into a shared pool that **every registered lawyer and firm** sees, and whoever
claims it takes it on. The form carries a legend saying plainly that an account is the faster route —
an enquiry has no documents, no conversation and no record, and is answered by whoever picks it up.

**The pool itself is for professionals.** An individual has no business reading other people's
enquiries — and the contact details the pool shows — so `/enquiries` turns them away to their
dashboard rather than offering them a softened version, and the link is not in their navigation.
Sending an enquiry stays open to everyone, including people with no account: sending and working are
different things.

Claiming is guarded so two professionals cannot take the same enquiry. The enquirer is told who
picked it up, and that message is honest about the fact that it is recorded rather than delivered.

## Two-factor authentication

Optional for **every** account, set up from *Account and security*. Time-based codes (RFC 6238) work
with any authenticator app, and eight single-use recovery codes are issued for the day the phone is
lost.

Two details make it safe rather than decorative:

- It is only switched on **after a working code is proven**, so a half-finished enrolment cannot lock
  anybody out.
- Recovery codes are stored as keyed digests and consumed as they are used, so a database read cannot
  use them and a leaked list is worth one sign-in rather than many.

Turning it on revokes every **other** session — a stolen session cannot outlive the second factor —
while leaving the session that is reading the recovery codes alone, because signing somebody out
before they can save them would be a trap. A session that has given only a password can reach the
prompt and nothing else.

## Emergency response

The public emergency route is the one place in the product with no authentication at all. It is
described under *Cases sent to a law firm* above: name and number in, video room out, and every
lawyer on call pushed a link to it.

## Colour, and what it means

Colour is assigned by **domain**, never at random. One accent belongs to one part of the product and
is used for it everywhere, so a violet chip means a meeting on any screen and a rose one means an
emergency. The tokens live in `globals.css` and the mapping in `src/lib/domains.ts`:

| Domain | Accent |
|---|---|
| Directory | blue |
| Verification | emerald |
| Cases | indigo |
| Emergency | rose |
| Meetings and rooms | violet |
| Fees | teal |
| Reviews | amber |
| Enquiries | cyan |
| Oversight | slate |

The three reserved verification badge colours are never borrowed for anything else, and the side
navigation stays monochrome so it never competes with a button.

## Emergencies without an account

The emergency route sits **outside the signed-in area entirely**. Somebody being detained cannot be
expected to remember an email and a password, so there is no login, no sign-up and no verification:

1. Name, a number to call back on, and what is happening. Nothing else is required.
2. A **video room is opened immediately** and they are dropped into it. There is no request to be
   reviewed and no queue to wait in.
3. Every lawyer on emergency call is pushed a link to that room. Joining it **is** answering —
   the first professional through the door is recorded as the one who took it.
4. The person holds a token in their link, which is the only thing admitting them. It is stored as a
   digest, and there is nothing else to remember.

An administrator cannot join that room, and neither can a lawyer who is not on emergency call.

### Case files are private

Attachments are written outside the static tree with mode `0600` and served only through
`/api/case-files/[id]`, which runs the same authorization resolver the case pages use. The client,
the assigned lawyer, and the lawyers of the firm handling the case may read them; a file that does
not exist and a file the caller may not read both return `404`.

### Alerts

With no mail provider, an in-app **alert** is how somebody is told something happened. Alerts are
created on: a case being submitted, opened for review, assigned, declined, started, completed; a new
message in a case; and a meeting being booked or cancelled. They appear behind the bell in the
header, with an unread count in the sidebar and tab bar, at `/notifications`.

---

## Practice dashboards

Lawyer and firm accounts get a practice dashboard rather than a client one.

| Section | What it is |
|---|---|
| **Dashboard** | Counts for portfolio, pending review, clients and today's meetings; today's diary; alerts; verification state |
| **My portfolio** | Every case this professional has accepted, ongoing first, then completed |
| **Cases pending review** | New cases nobody has picked up, plus the ones already opened for review |
| **Clients** | One card per client with their details and every case you share, linking into each case |
| **Calendar** | Month, week and day views; click a day, pick a free hour, choose a client and register the booking |
| **Lawyers registered** | *(firms)* The roster, plus registering new professionals |
| **My profile / Legal details / Directory listing** | The professional's own information and public listing |
| **Verification** | Documents and review state |

Client accounts get *My cases* and *Meetings you are expected to attend* instead, and are redirected
away from the practice pages.

### Messages inside a case

The conversation takes the full width of the page, because that is what the page is for; the actions
and the other party's details sit underneath it rather than squeezing the thread into two thirds of a
screen. Files go through it too — see *Files in a conversation*.


The conversation is built like a messenger rather than a text box. The panel fills the available
height — viewport-relative on desktop, viewport-relative and shorter on a phone — with the thread
scrolling and the composer anchored underneath. The composer starts at three lines and grows as you
type, capped so it cannot swallow the thread.

Long conversations **page back through history**: the case page loads the most recent 30 messages,
and scrolling to the top fetches the previous page from `/api/cases/[id]/messages` and prepends it
while holding your reading position steady. The endpoint runs the same authorisation resolver as the
case page, so a case you cannot open returns `404` whether it exists or not.

Opening a thread marks every message from the other side as read, not merely the page that loaded, so
the unread badge cannot get stuck.

### The calendar

Working hours are 09:00–17:00 UAE time in one-hour slots. Each day view lists every slot as
available or taken; only genuinely free slots are offered, and the client list contains only people
with an accepted case.

Booking a meeting alerts the client that they are expected to attend.

**A meeting can be moved, cancelled or deleted, by the lawyer whose diary it is or by the firm they
belong to.**

- *Move it* — another date, hour and mode; the client is told the old time and the new one, and an
  office visit at a new time asks them to accept again because they have to travel.
- *Cancel it* — the meeting stays on the record as cancelled, and the client is told.
- *Delete it* — the arrangement is erased and **the client is told nothing**. The button says so
  before it is pressed, and the audit record notes that no notification was sent. Cancel and delete
  are deliberately different actions.

A firm sees every diary held by its lawyers on one calendar, with the availability of each lawyer for
the selected day, and can manage any meeting on it. A firm does not book on a lawyer's behalf: only
the lawyer whose diary it is registers a new meeting.

Double-booking is prevented by a **partial unique index** on `(lawyerId, startsAt) WHERE status =
'BOOKED'`, so the guarantee holds under a race while a *cancelled* meeting does not block the slot.
Month, week and day views are plain links carrying view and date in the URL, so the calendar works
without JavaScript and any view can be bookmarked.

### Registering new professionals

A firm has two ways to add a lawyer.

**Create the account directly** — for when the firm is hiring and wants the lawyer on the roster
now. It supplies the lawyer's name, email, a temporary password and their licence details. The
account is created active and affiliated to the firm immediately, and a **draft** listing is
prepared from the firm's own practice areas, emirates and address. That draft is deliberately not
published: the lawyer appears under **Lawyers at this firm** on the firm's profile, not as a
separate entry in the directory. If they ever leave the firm the draft becomes theirs to publish.

The password is shown **once** on creation for the firm to pass on, and the firm is recorded as the
account's creator, so whoever set the initial password is visible to the lawyer and to a reviewer.

Creating an account does **not** verify anyone: a reviewer must still examine that lawyer's own
Emirates ID and licence.

**Invite by email** — still available, and the better route when the lawyer already has an account:

- **The address already has a lawyer account** — the invitation appears in that lawyer's
  `/invitations` to accept or decline.
- **No account exists** — the firm is given a shareable registration link
  (`/register?type=LAWYER&invite=…`), because this installation cannot send email. Registering
  through it and saving a licence links the lawyer to the firm automatically.

---

## Icons and the directory card

**There is no emoji in the interface.** Every icon is an inline SVG from
`src/components/icons.tsx`: one 24x24 grid, 1.75px strokes, round caps, `fill="none"`, and
`stroke="currentColor"` so each icon is monochrome and inherits its text colour. Emoji were removed
because they render differently on every platform, cannot be aligned to a text baseline, and bring
their own colour into a palette that only has room for three reserved badge colours.

The **side navigation** is monochrome by design — dark icons and labels on white, with the current
section marked by weight and a subtle surface rather than colour. Blue in this product is reserved
for actions, so the navigation never competes with a button.

The **directory card** is a single column so every element shares one left edge. The facts list uses
a fixed `6.5rem` label column, which is what keeps "Experience", "Languages", "Emirates" and
"Contact" values aligned down the page instead of drifting with each label's length. Sections are
separated by hairlines rather than floating panels, and the card lifts on hover.

## What a firm profile shows

A firm's profile carries three things a lawyer's does not:

- **Lawyers at this firm** — every registered lawyer with their photo, licence number, licensing
  authority, validity and verification badge. This is where a firm's lawyers are found, and any of
  them can accept a case sent to the firm.
- **Legal representative** — the person accountable for the firm and named as its authorised
  signatory, in place of the work-and-education card a lawyer has. A firm has a person answerable
  for it, not a work history.
- **Firm registration** — legal name, trade licence, authority, structure and registered address.

## A professional's page

A profile in the directory is laid out the way a page like this is read, because that is what people
already know how to use:

- **The face, the name**, what they are and where, and a line of real numbers — the rating, how many
  recommendations, years of experience. No cover image: a blue band says nothing about a lawyer.
- **Actions** across the top: *Send a case* and *Recommend*. A guest is offered *Sign in to recommend*
  rather than a button that fails. General messages go through the case conversation, so there is no
  second, emptier way to reach somebody.
- **Tabs** — Posts, About, Recommendations, Contact — as links, so the page works without JavaScript
  and any tab can be shared.
- **An intro column** with the headline, a clip of the bio, their practice areas and the facts, and a
  **Page info** card with only the contact details the member chose to publish.
- **The body**: the community posts that recommend them, and for a firm, **Lawyers at this firm** on
  the tab the page opens on — because those are who a client would actually instruct.

Every claim on it is the claim the rest of the product makes: a licence number appears only for a
member whose documents a named reviewer approved, and an unverified profile says so at the top.

## Two audiences on the landing page

The public home page answers one question before it sells anything: are you looking
for legal assistance, or are you a legal firm or a legal representative? The two
answers are two sections, and each carries only its own side's benefits.

- **Are you looking for legal assistance?** — checking credentials, sending a case,
  the conversation, the client's own conference room, paying a fee and keeping the
  receipt, and reviews that only a real client can leave. The account it offers is
  the free client account.
- **Are you a legal firm or a legal representative?** — the case queue, the
  practice dashboard, a diary that can be moved or cancelled, firm-wide oversight,
  emergency availability and the fee request. The accounts it offers are the lawyer
  and firm accounts.

An audience never has to read the other side's sales pitch to find its own, and each
section is one click from the top of the page.

## Navigation

Navigation lives in the **sidebar**, which is sticky and scrolls **independently** of the page — a
long navigation must not drag the content with it. The header carries the *Directory* and *How verification
works* links only when nobody is signed in, along with the footer's public links; once somebody has
an account those links would merely duplicate the sidebar, so they are dropped and the header keeps
only the account chip, alerts and sign-out. Signed-in visitors to public pages get the same sidebar
as the member area, so navigation does not change underneath them.

## The mark, and where it appears

The supplied artwork is the product's mark. It is used **exactly as supplied** — navy and gold on a
transparent ground, with no plate, badge or circle behind it — so it sits on white, on a tinted panel
and on paper without being redrawn or boxed in.

```
public/logo.svg          traced vector art, transparent (the file the interface uses)
public/logo.png          the same artwork as a transparent PNG
public/logo-mark.png     a small transparent PNG
public/icon-192.png      PWA and notification icons, on white so they read anywhere
public/icon-512.png
public/apple-touch-icon.png
src/app/icon.png         the browser favicon
tools/brand/             the generator, and the artwork it was made from
```

`logo.svg` is **real vector art**, not a bitmap wrapped in an `<svg>` tag: each ink colour is traced
into Bezier paths from a 3x upscale of the artwork, which is what keeps the thin rules in the sail and
the marks on the clock face. Regenerate every asset with:

```bash
cd tools/brand && python3 make_logo.py     # needs pillow and potracer
```

It appears in the header, the footer, the sign-in and maintenance screens, the case conversation, the
conference rooms, the emergency pages, every receipt, and on anything printed from the application —
the member layout puts a print-only letterhead above whatever page is printed.

Clicking it goes to the **dashboard when somebody is signed in**, whatever their role, and to the
landing page when nobody is.

## Billing receipts, and whose letterhead they carry

A fee produces a receipt. What that receipt looks like is the professional's decision, from
*Receipt layout* in the sidebar (or *Account and security*):

- **The standard layout** — the Dubai Legal receipt. Nothing to fill in, and nothing that can be
  wrong. Every account starts here.
- **Their own letterhead** — their name, their strapline, their mark, their accent colour, their
  footer note, and their own choice about showing the licence, the firm and their contact details.

Whichever is chosen, the Dubai Legal mark is on the document: at the head on the standard layout,
at the foot — "Issued through Dubai Legal" — on a custom one, because a receipt is issued through
this platform. A receipt always carries the amount, the reason, who was paid, who paid, the card
used, the receipt number and the case; those are facts about a payment, not decoration.

**A new account has no template, which means the standard layout.** Nothing has to be configured for
a receipt to be correct. Uploading a mark of their own replaces the platform mark at the head of
their receipts, and they can go back to the standard layout at any time, which also removes the file
they uploaded.

**An administrator has no letterhead and cannot be given one.** The service refuses it, not just the
interface: the platform mark is theirs by definition.

## Profile pictures

Every account type — individual, lawyer and firm — can upload a profile picture from *My profile*.
A picture stays editable while a verification request is open, because it is not evidence a reviewer
is judging; identity documents do not.

**Nothing reviews a profile picture.** It is saved, set as your avatar and shown immediately — in
the header, on your listing, in a conversation — and it is never put in front of a reviewer, because
a photo is not evidence of anything and waiting for one to be "approved" would be a queue nobody
needs. It is also never cached by a browser, so replacing it appears at once rather than five minutes
later.

A photo is served through `/api/avatar/[userId]`, which widens access in this order: the owner
always; a reviewer while checking documents; anyone who shares a case with them, because you should
see who you are dealing with; and the public **only** when the owner has published a directory
listing. Listing yourself is choosing to be seen.

## Reviews

Reviews are written **on the profile itself**. Opening a lawyer or firm shows an active review
section with a one-to-five star selector and a case picker, so the act is available the moment
somebody looks — no separate page to find. When the reader is not eligible, the section says exactly
why: they are signed out, it is their own profile, or they have no accepted case with that
professional yet.

A review can only be written by the client on a case the professional **actually accepted**, and each
case carries exactly one review — enforced by a unique constraint, not by convention. That is the
whole reason a rating here is worth reading: it cannot be manufactured.

Reviews show the stars, the rating, the reviewer's own verification badge, and the case reference
they relate to (without disclosing anything about the case). A professional sees everything written
about them, including anything hidden.

**Moderation hides, it never deletes.** Hiding keeps the record intact, tells the author why, and is
audited, so the moderation history cannot quietly disappear.

**Nothing in the directory is ordered by rating.** Verified profiles sort first and then by age, so a
score cannot be gamed to buy position.

## Emergency representation

For urgent legal help. A client raises a request with a call-back number; it is
pushed to the professionals who take emergencies, and the first to take it has a
**case opened and assigned** to them straight away. Raising one does not open a
case — that only happens on acceptance, which keeps the emergency queue free of
abandoned entries.

Who is told, in order:

1. lawyers who have turned emergency availability on;
2. lawyers their firm has designated as its always-active emergency contact;
3. the owners of those firms, so a firm knows its contact was pinged;
4. and if that adds up to nobody — which would mean an urgent request going
   silently nowhere — **every registered lawyer and firm** instead.

Lawyers set their own availability and a note ("Criminal matters, 24/7") from the
Emergency page. A firm names one lawyer as its emergency contact from *Lawyers
registered*; only one at a time, so it is always clear who is on call, and a firm
account taking an urgent request hands it to that person rather than to a queue.

Requests expire after 24 hours, and the public interface says plainly that this
is not a substitute for the police or an ambulance.

**The two sides are kept apart.** The request form — name, number, what is
happening — is the client side, and it is the *only* thing on the public
emergency page. A signed-in lawyer or firm who opens `/emergency` is redirected to
`/emergency/desk`, and the desk carries no request form at all: it shows the queue
of people asking for help, the availability switch, and the requests already
taken. A lawyer filling in the request form would be asking themselves for legal
help, so the form is not offered to them anywhere, and that is enforced on the
server as well as in the navigation.

## The community

*Community* is its own section of the product: boards, threads, votes and a review queue. It is where
members recommend the lawyers and firms they actually used, ask what a process really involves, and
answer each other. It is the one public thing members write here, so nothing confidential belongs in a
post — the case conversation is the private channel.

### The community is reachable without a dashboard

It appears in two places, and neither of them is behind a sign-in wall:

- **On the landing page, as a tab** (`/?tab=community`). A visitor reads it there. The invitation to
  take part is on that panel, and its sign-in link carries `next=/?tab=community` — so somebody who
  signs in from the community **comes back to the community tab**, not to a dashboard. Once they are
  in, the same panel grows the composer, the reaction bars and the comment boxes in place.
- **At `/blog`, the full board index**: every topic, sorted, with the whole thread on each post.

The tabs are plain links, not a client-side widget: they work with JavaScript off, they can be
bookmarked and shared, and the page behind them is rendered on the server.

### Boards

The community opens on a **topic index**, because somebody arriving with a problem has a subject in
mind and not a lawyer's name. Twelve boards, each saying what belongs on it: pay and dismissal; rent,
landlords and property; family and personal status; police and detention; traffic and fines; visas and
residency; business and contracts; money and debt; courts and procedure; fees and costs; using Dubai
Legal; and everything else. A board with nothing on it is still shown, with a zero — an empty board is
a true thing to say, and hiding it would make the place look fuller than it is.

Pick a board and you get its threads, sorted by *Most useful* (score against age) or *Newest*.

**A post is one card, with everything said about it inside it.** Not a card for the post and a stack of
separate cards for the comments: the author and their badge, what they wrote, then the reaction bar,
the comments, and the box to add one — the way a social feed reads. On the feed the first three
comments ride along with the post and the rest are one click away; on the post page the whole thread is
there, with a **Reply** button under each comment. A guest gets the same card without any of the
controls, and the invitation to sign in sits **outside** it, because a card full of disabled buttons
says nothing.

**Three reactions — 👍 like, ❤️ love, 😮 surprised — on posts and on comments**, with the counts on
the same line as the comment count. A person holds one reaction per thing: pressing a different one
replaces it, pressing the one already held takes it back, so nobody counts twice. Emoji are used here
and deliberately nowhere else in the interface: the rest of the product uses monochrome line icons so
navigation never looks like a different product from one screen to the next, but a reaction is content
rather than chrome — people recognise these three before they read a word — and each one carries a
written label for anybody using a screen reader.

The up and down arrows stay, quieter, because they do a different job: they decide the order of the
feed. A feed orders by score and reacts with a heart, and those are not the same gesture.

### Every post is read before it goes up

Writing needs an account — reading does not. A post that is written **waits for a moderator**, and is
visible while it waits to its author, with the reason it is waiting, and to nobody else. The author
sees it listed at the top of the community under *Waiting for a moderator*, so nothing looks lost.

The reason a moderator reads it first is specific: **the most useful thing they do is notice that the
question has been asked and answered already**, and send the author to that thread. Everything else
about moderation follows from that.

### The automatic check

The review screen runs a check against every post already on the board and shows the closest matches
with the words they share:

- text is lower-cased, split into words, stripped of filler and lightly stemmed, so *dismissed* and
  *dismissal* match;
- a word in both **titles** counts double, because two posts called "unpaid salary for three months"
  are almost certainly the same question however differently they are written underneath;
- a **rare** word counts for more than a common one, damped so a single unusual word cannot dominate;
- the same board adds a little, and anything at or above **14%** is flagged.

Two questions about unpaid wages for three months score around **0.46** with the shared terms named
(`salar, month, employer, paid, wag, june, unpaid`); a tenancy question against the same post scores
**0.00**. The check is deterministic, explainable, and makes no network calls, so a moderator can read
*why* something was flagged and overrule it with confidence.

**It never decides anything.** It reads, ranks and explains; a person looks and chooses.

### The moderator's decision

From `/admin/blog`, which opens on the queue — every waiting post with its closest match already
computed — and from the review screen for each one:

| | What it does |
|---|---|
| **Publish** | Goes on the board; the author is told. A recommendation of a professional tells them too, but only now, when it is actually public |
| **Close as a repeat** | Keeps the post, links it to the earlier one, and sends the author to the answers — usually more use to them than a rejection |
| **Hide** | Leaves the board with a reason the author can read. Reversible |
| **Remove** | The end of it: not even the author can read it afterwards |

The score, the post it matched and the shared words are **recorded with the decision**, so the record
shows what the moderator was looking at rather than what a later run of the check would say. A removed
post is nobody's; everything else that is not published belongs to its author and the console.

**Signing in from the community comes back to the community**, not to a dashboard. Only a path on
this site is honoured when the app decides where to send somebody, so a sign-in link cannot be turned
into an open redirect. The community is in the header of the landing page next to the directory, and
in the sidebar once somebody is signed in.

**Every post says who wrote it**: their badge if a reviewer approved their documents, "Not verified"
in plain words if not, what kind of member they are — client, lawyer or legal firm — and where they
are. A recommendation is only as good as the person behind it, so that is on the post rather than
behind a click.

**A practice can post to its own page**, which is how a firm announces a move or a change of hours.
Those posts go through the same review, appear on the page's Posts tab labelled *Posted by the
practice*, and sit alongside the recommendations clients wrote.
- A post is a **recommendation**, a **question** or an **experience**, and a recommendation may name a
  profile from the directory. Naming one puts the post on that professional's page and tells them.
- **Votes** put the useful answers at the top. The feed defaults to *Most useful* — score against age,
  the same idea a link-sharing site uses, so a good post from yesterday outranks a dull one from a
  minute ago — with *Newest* a click away. A second press of the same arrow takes a vote back.
- **Replies** nest one level deep, which is what keeps a thread readable on a phone.
- **Moderation** is hiding, restoring or removing a post from `/admin/blog`. Hiding is reversible, the
  author is told, and they can still see their own post with the reason on it.

The landing page carries the newest posts, and an empty feed says it is empty rather than filling
itself with examples.

## Support

*Support*, in the sidebar, is a **conversation**, not a form that disappears into
an inbox. A user, a lawyer or a firm opens a ticket — a subject, what it is about,
and what happened — and it appears in the administrator's *Support* queue with
their account beside it: type, verification state, when they joined, and whether
it is a seeded sample account.

It is **readable only by the reporter and administrators**. Not the other side of
a case, and not the professional a client might be reporting — a support ticket can
contain anything about an account, so it is not shared with anyone it names.

The administrator answers from the ticket screen; the reporter is alerted and
replies from *Support*, which puts the ticket back in the queue. When the problem
is dealt with, the administrator presses **Mark solved and close**. That closes the
ticket for both sides — nobody can post to it afterwards, not even an
administrator — the reporter is told who closed it and when, and the sidebar
counter clears. If the problem comes back it is a new ticket with its own record,
which is what makes closing one meaningful.

The **sidebar counter** shows what is waiting on you: unanswered tickets for an
administrator, and replies you have not read for everybody else. Administrators
raise tickets with the other operators rather than through this queue, so the
queue cannot be filled with its own operators' problems.

## Conference rooms and office requests

When a professional books a meeting they choose how it happens:

- **Video call** — a conference room is created with a short room code, and both
  sides join from *My cases*. The call is **direct between the two of them**:
  WebRTC signalling (session descriptions and ICE candidates) is relayed through
  the server, but the audio and video never pass through it. Nothing is recorded.
  On a restrictive network a direct connection may not be possible without a TURN
  relay; the room says so, and offers an external provider instead if
  `VIDEO_PROVIDER_URL` is set.
- **Office visit** — a request rather than a booking, because the client has to
  travel. They accept or decline from *My cases*, and declining tells the
  professional to offer something else rather than cancelling the meeting.
- **Phone call** — no room needed.

**A client has their own way in.** *Conference rooms* (`/rooms`) lists every case
with a professional on it, names the lawyer handling it, and offers a button to
ask for a call now. Pressing it opens a room and drops the client straight into
it while the professional is alerted — a client should never have to wait for
somebody else to book a meeting before they can speak to their own lawyer.

That room is a `CASE_REQUEST` appointment: a real conference room with a room
code, resolved by the same `resolveRoomForUser` path as anything else, but **not a
diary entry**. It takes no slot in the diary and never appears on the calendar,
which is enforced by the partial unique index covering only `source = 'SCHEDULED'`
rows. Asking twice returns the room that is already open rather than ringing
again, and a room is only offered once a professional has accepted the case.

**A call is recorded, from both sides.** Each participant's browser records its own camera and
microphone with `MediaRecorder`, and the file is uploaded when the call ends. Both recordings are kept
against the room, and **both parties can play both of them back** from the room page — a client and
their lawyer should each be able to go over what was said. A guest who reached an emergency room with
a token can play the recordings of that room too.

Recording is disclosed on screen for the whole call, with a running timer and a *Stop recording*
button; nothing is captured without the person being recorded knowing.

**An administrator cannot play a recording.** The rule is the room's rule: `/admin/meetings` reports
how many recordings exist and how many rooms they belong to, and there is deliberately no control that
opens one. The files are encrypted like every other upload and are deleted with the meeting or the
emergency request they belong to.

**An administrator cannot enter a conference room.** A call between a lawyer and
their client may be privileged, so `/admin/meetings` shows that a room exists and
who it is for, and nothing more.

## Fees (simulated)

After a professional accepts a case they can raise a consultation, case
assistance or court fee. It appears **inside the case conversation**, where both
sides already are.

**A fee is paid by bank transfer.** A professional cannot raise one until their bank details are
filled in on *Legal details* — account holder, bank, and an IBAN or account number — and those details
are **copied onto the request itself**, so the client is never sent to a page that has since changed
under them. The account, the SWIFT, the branch and the transfer instructions appear on the fee card in
the conversation and in full on the payment page, together with the reference to quote.

**Card payment is offered as a choice and says it is being developed**, rather than showing a form
that cannot work: choosing it explains that it will be ready soon and points back at the method that
does work. Nothing on the payment page contacts a bank; the client makes the transfer in their own
banking app, records it with the reference their bank gave them, a receipt is issued, and the proof of
payment is asked for next.

The card is **identical for the client and for the lawyer** — same amount, same
reason, same state, same receipt — because they are looking at one fact, not two.
Only the actions at the foot of it differ. The order is deliberate:

1. The card reads **Payment pending**, with a *Pay* button for the client.
2. *Pay* opens a page of its own: the account to send the money to, the
   reference to quote, and a box to record the transfer once it has been made.
3. Confirming issues a **receipt** — amount, reason, the lawyer and their licence,
   the firm and its trade licence, the case, the card used, the receipt number and
   the time — which prints or saves as a PDF from the browser. Closing the print
   dialog returns to the conversation.
4. The card then reads **Payment completed** for both sides, and only then is the
   client asked to **send proof of payment**, which is stored as a document and
   attached to the case. Asking for evidence of a payment before the payment was
   the wrong way round, so it no longer happens.

**No money moves.** There is no bank integration and no card processor. Every screen that shows a
payment says so, including the receipt and the administrator's view. Receipt numbers are derived from
the payment's own id rather than a counter, so two payments completing at once can never be handed the
same one.

A fee cannot be requested before the case is accepted, which means a client is
never asked for money on a case nobody has taken.

## Files in a conversation

A message can carry up to five files: documents, images, spreadsheets, text, and **archives** — a
`.zip` of emails, a `.rar` bundle of scans, a `.docx`, a `.xlsx`. A client and their lawyer routinely
need to pass each other a bundle, so the conversation accepts one.

Every file is identified by its **magic bytes**, not by its name or the type the browser claims, and
anything that is not a document, an image, an archive or a recognised media container is refused.
Archives are always served as a *download*, never rendered, which is what makes accepting them safe.
Files are capped at 25 MB each in a conversation (10 MB as evidence), and each one is stored
encrypted. They are served through the same route as the case papers, under the same authorisation:
the two parties on the case, and nobody else — a stranger gets a 404, identical to a file that does
not exist.

## Encryption at rest

Two things are encrypted before they touch the disk or the database:

- **every uploaded file** — identity documents, case papers, conversation attachments, profile
  pictures, billing marks, call recordings — with AES-256-GCM, written with a `DLE1` header;
- **the text of every case message**, stored as an authenticated ciphertext in the message column.

The key lives in the environment (`ENCRYPTION_KEY`, base64 of 32 bytes: `openssl rand -base64 32`) and
nowhere else. A copy of the upload directory or a database dump is therefore not a copy of anybody's
papers or conversations. **In production the variable is required**: an installation that silently
wrote plaintext because a variable was missing would be the worst possible failure mode for the
promise the interface makes. In development a key is derived from `APP_SECRET` and the interface says
so, on the security notice, rather than pretending.

Anything written before this change is plaintext and is still read correctly, so nothing that was
already uploaded stopped working.

**What this is not:** end-to-end encryption. The server holds the key, because it has to hand a file
back to its owner. The notice in the product says exactly that, and the wording is checked against the
code rather than the other way round. Access control is separate and unchanged: an administrator can
see that a case exists, and cannot read the conversation inside it.

## Push notifications

A member turns notifications on from *Account and security*, and every in-app
alert is then also delivered as a browser push — so a case update, a new message,
an urgent request or a meeting request reaches a phone with the tab closed.

It is a real Web Push implementation: a VAPID key pair, a service worker at
`/sw.js`, and a stored subscription per browser. Delivery is best effort by
design — a push service rejecting a message drops that subscription (immediately
on `404`/`410`, or after five consecutive failures) and **never** undoes the
in-app alert that raised it.

Push is only offered when it can actually work. With no VAPID keys the account
page says so rather than showing a button that cannot do anything, and the
administrator's *Push notifications* screen reports the same. Permission is
requested when the member presses the button, never on page load.

## Architecture

Next.js 15 App Router (React 19, Server Components and Server Actions), PostgreSQL via Prisma,
Tailwind CSS v4, Zod for validation. One process, one port, no separate API service.

```
prisma/schema.prisma          Data model, with the integrity rules expressed as constraints
src/lib/
  constants.ts                Reference data, required-document rules, badge colours, case statuses
  auth.ts                     Sessions, page guards, role routing
  password.ts                 scrypt hashing and constant-time verification
  emirates-id.ts              Emirates ID format, check digit, masking
  storage.ts                  Upload validation (magic-byte sniffing) and file storage
  time.ts                     UAE (UTC+04:00) calendar arithmetic, slots and date keys
  email.ts, audit.ts, tokens.ts, validation.ts, rate-limit.ts
src/server/services/          auth, profile, credential, listing, document, verification,
                              directory, inquiry, case, appointment, firm, notification, admin, emergency,
  payment, room, enquiry, two-factor, support
src/app/actions/              Server Actions that pages and forms call
src/app/api/documents/[id]/   Authorised, non-cacheable serving of identity documents
src/app/api/case-files/[id]/  Authorised serving of case papers
src/app/api/avatar/[userId]/  Profile photos, public only for published listings
scripts/e2e.ts                Account, verification and authorization suite (76 checks)
scripts/e2e-cases.ts          Case workflow, calendar, chat and firm roster suite (74)
scripts/e2e-admin.ts          Console, reviews, photos and feature switches (47)
scripts/e2e-roles.ts          Directory membership, firm lawyers, paging, reviewer confinement (76)
scripts/e2e-features.ts       Push, emergencies, rooms, office requests, the fee flow, deletion (152)
scripts/e2e-collab.ts         Case distribution, enquiry pool, two-factor, guest emergency (90)
scripts/e2e-flows.ts          Meeting changes, urgent calls, support, sample data, audiences (124)
scripts/e2e-brand.ts          The mark, receipt layouts, the fixed admin letterhead (91)
scripts/e2e-round2.ts         Pool, attachments, encryption, page, calls, transfers (134)
scripts/e2e-community.ts      Boards, review queue, duplicate check, moderation, threads, reactions (94)
scripts/shots.ts              Screenshots of every page, for looking at rather than imagining
tools/brand/make_logo.py      Generates logo.svg and the icons from the supplied artwork
scripts/verify-db.ts          Eight data-integrity invariants
scripts/seed-demo.ts          The two sample accounts
```

Business logic sits in services rather than in Server Actions so that the same code paths are used
by the UI and by the end-to-end suites. The suites therefore test the real thing, not a copy.

---

## Security decisions worth knowing

- **Passwords** use scrypt (N=16384, r=8, p=1) from Node's built-in crypto. Verification is
  constant-time.
- **Sessions** store only a SHA-256 digest of the token; cookies are `httpOnly`, `SameSite=Lax`, and
  `Secure` **when the connection is HTTPS**, with idle and absolute expiry. The flag follows the
  connection rather than `NODE_ENV`, because a browser refuses a `Secure` cookie over plain HTTP —
  with one exception, `http://localhost`, which it treats as trustworthy. Deciding it from the build
  therefore worked on localhost and signed people out the moment the app was opened at a local
  network address such as `http://192.168.1.85:3100`. A proxy's `x-forwarded-proto` decides it when
  one is present; otherwise the scheme of `APP_URL` does.
- **Emirates IDs** are stored in full (a reviewer must read them) and masked everywhere else. A keyed
  HMAC fingerprint alongside is **unique**, so one identity cannot verify two accounts.
- **Identity documents are never public.** Owner or reviewer only, non-cacheable, `nosniff`, no
  probing (a missing document and a forbidden one are both `404`), and reviewer reads are audited.
- **Case authorization is resolved in one place** (`resolveCaseAccess`) and reused by every case
  page, action and the file route, so permission cannot drift between them.
- **Uploads are validated by content**, not by file name or declared type.
- **Account enumeration is not possible** through sign-in or password reset: identical messages, and
  the password is verified against a dummy hash so timing does not differ either.
- **A password reset cannot be consumed by a mail scanner** — links act only on a button press.
- **Suspension and sign-out take effect immediately**, including every session on password change.
- **Firm invitations** are single-use tokens stored only as digests.

---

## Verification

```bash
npm run e2e        # 477 checks across six suites, then removes everything it created
npm run db:verify  # 8 data-integrity invariants
```

The suites drive the real service layer and the real HTTP routes. Covered:

- **Accounts** — registration, confirmation (in whichever mode is active), reuse prevention,
  sign-in controls, enumeration resistance, profile and Emirates ID validation, upload rejection.
- **Verification** — the full review path for an individual and a lawyer, refusal to approve until
  each document is individually accepted, queue behaviour, badge withdrawal when evidence changes,
  role administration, suspension, session revocation.
- **Cases** — submission with attachments, reference format, the Submitted → Under review →
  Assigned → Completed path, decline reasons, notifications at each step, chat both ways with unread
  counts, and that a client cannot accept or complete their own case.
- **Firms** — a case addressed to a firm, the firm account being unable to accept it, a lawyer
  joining through an invitation link, and that lawyer then accepting it.
- **Calendar** — slot availability, booking, double-booking refusal, booking with a non-client,
  booking into another lawyer's diary, cancellation freeing the slot, and re-booking it.
- **HTTP authorization** — documents and case files refused to anonymous callers and to unrelated
  members, allowed to owners and to professionals working the case; a stranger gets `404` on a case
  page; client accounts are redirected away from every practice page.
- **Administration** — that an administrator can approve a verification request but cannot accept a
  case, that oversight exposes no message contents, that hiding a review removes it publicly while
  keeping the record and telling the author, and that every switch change is audited.
- **Feature switches and maintenance** — closing registration and disabling the directory change what
  the pages serve, maintenance hides the site from visitors while leaving reviewers a way back in,
  and the activity register records real page views with hashed addresses.
- **Profile pictures** — visible to the owner, to a professional sharing a case, and to the public
  only when a listing is published; hidden from an unrelated member.
- **Directory membership** — a firm-created lawyer kept out of the directory while still reachable
  by their firm, a self-registered lawyer who joins a firm keeping their own listing, the firm
  profile listing its lawyers and its legal representative, and the header links appearing only when
  signed out.
- **Role corrections** — a firm creating a lawyer who is affiliated and able to sign in
  immediately, with the invitation route still working beside it; a 45-message conversation paging
  back to its first message without duplicating or losing any, and refusing the endpoint to
  strangers; an administrator turned away from all fifteen member pages while keeping the console
  and their own account; and the review form appearing on a profile for an eligible client,
  explaining itself when not, and disappearing once the case has been reviewed.

Latest run: **960 passed, 0 failed**, across ten suites, with zero rows and zero files left behind,
and every setting and flag the suites changed restored.

The suites also clean up after themselves where they reach beyond their own fixtures. Some
notifications fan out to people a suite never created — an emergency reaches every professional on
call, an enquiry reaches every registered professional, and a support ticket reaches every reviewer —
and a guest emergency room has no account behind it to cascade away. Those are removed by the run that
created them, so a real account's alert list comes back exactly as it was found.

---

## Supabase as the database

Supabase is PostgreSQL, so nothing about the data model changes: Prisma talks to it
directly, and the application never holds a Supabase anon key or talks to the database from the
browser. There is no `@supabase/supabase-js` dependency, deliberately — a key in a browser bundle is
a second, weaker way into the same tables, and the server is already the only thing that should
touch them.

### This installation runs on Supabase

The database **is** Supabase: project `qeyfnnwfaptebrhqfnti` in **`sa-east-1` (São Paulo)**,
PostgreSQL 17.6, reached through the session pooler on port 5432. The local Docker database is kept
untouched as the rollback — its two URLs are still in `.env`, commented out.

Two things about the connection matter more than anything else in this section.

**The session pooler, not the transaction pooler.** Measured from this machine, on the same project at
the same moment: **57 ms** per query through the session pooler against **275 ms** through the
transaction pooler. The transaction pooler is built for serverless functions that cannot hold a
connection; this is a long-running server, so it holds them open, and the session pooler is both
faster and correct for migrations.

**The pooler serves only 15 clients, and they are shared.** Pushing past that does not degrade
gracefully — new connections are refused outright with `EMAXCONNSESSION`, which is worse than an
occasional slow page. `DATABASE_URL` therefore carries `connection_limit=5`, and the warm-up opens
four of them.

### On a phone

The application is meant to be used on a phone, so the phone is the case it is designed for rather
than the one it tolerates.

**Navigation is one button, and it carries everything.** Below 640px the header keeps its logo, the
alert bell, the avatar and a menu button; every destination is gathered behind it in named groups —
*Your cases*, *Find help*, *Your account*, or *Your practice* / *Your profile* for a professional —
as full-width rows at least 48px tall. There is **no bottom tab bar**: two navigations for the same
links was confusing, and a bar that covers the bottom of every screen is a poor trade for one tap.

The groups are the single source of truth. The desktop sidebar is those groups flattened in order and
the phone menu is the groups themselves, so the two cannot list different things — which they did
when the sidebar, the header and the bottom bar each carried their own copy.

**A fixed panel inside a blurred header does not work.** The menu is rendered through a React portal
into `document.body`, and that is not decoration: the header is `position: sticky` with
`backdrop-blur`, and a backdrop filter makes an element the *containing block* for its fixed-position
descendants. A panel with `fixed inset-0` therefore resolved against the 64px-tall header instead of
the viewport — it was in the DOM, and invisible on screen. Tapping the button appeared to do nothing.

**Controls are sized for a thumb.** Every button carries a minimum height — 36px small, 44px normal,
48px large — set on the shared button primitive rather than left to padding, so it holds everywhere.
The menu closes on navigation, on Escape and on a press outside, and it is a real `<button>` with
`aria-expanded`, so a keyboard and a screen reader both work.

**Content collapses instead of scrolling forever.** Filter panels and the post composer are
`<details>` disclosures with a rotating chevron. The directory's filters open themselves when a
filter is active, so a narrowed list never hides the reason it is narrow.

**The small things that make it feel native**: no grey flash when a link is tapped, no accidental
text selection when a button is held, no 300ms tap delay, no sideways rubber-banding, text that
respects the system size, and the page drawing into the notch and the home-indicator area. Vertical
scrolling is left exactly as it is — fighting that is how a page comes to feel broken. Motion is used
only to make a change legible, and `prefers-reduced-motion` switches all of it off.

## Deploying to Cloudflare Workers

Partly prepared, and the parts that are not are named precisely below rather than glossed over.

**What works.** `npm run cf:build` builds the app with the OpenNext Cloudflare adapter and writes
`.open-next/worker.js`; `wrangler.jsonc` sets `nodejs_compat`, static-asset serving, and
`placement: { mode: "smart" }` so the Worker runs near the database rather than near the visitor. The
Worker boots under `wrangler dev` and serves static assets and pages that need no database. The
Prisma client is created lazily, which is required there: Workers populate `process.env` per request,
so a client built at module load finds no `DATABASE_URL`.

**The blocker.** Pages that query the database fail inside the Worker with:

```
PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime
"debian-openssl-1.1.x"
```

Prisma's default engine is a native binary, which cannot exist in a V8 isolate. The documented answer
is a driver adapter, and `@prisma/adapter-pg` is installed, wired, and **verified working** — forced
with `DB_DRIVER=pg` on Node it queries this database correctly. It is not enough yet: in the Worker
bundle `PrismaPg` does not appear at all while `libquery_engine` does, so the adapter is being
dropped at build time and the client falls back to the engine it cannot load. Closing that gap needs
one of:

1. Prisma's newer **`prisma-client` generator** (no Rust engine at all), which means changing the
   generator block and the client import path across the codebase; or
2. **Prisma Accelerate**, which moves the engine off the Worker entirely.

**The second blocker is storage.** Workers have no filesystem, so `UPLOAD_DIR` and `src/lib/storage.ts`
cannot work there: identity documents and case files must go to a bucket. The seam is small — four
functions — and Cloudflare R2 is the natural target, but it is unverified until a bucket exists.

Both are real work, not configuration, and neither has been guessed at. The Node deployment is
unaffected: it is what the application runs on today, and all 983 checks pass on it.

## Installable from the browser

It installs from the browser like an app: **Add to Home Screen** on iOS, **Install app** on Android
and Chrome, an install button in the desktop address bar.

| | |
|---|---|
| `public/manifest.webmanifest` | name, short name, standalone display, theme colour, start url, and three icons |
| Icons | 192px and 512px, plus a **maskable** 512px drawn with the mark inside the safe zone so Android can crop it to a circle without cutting it |
| `public/sw.js` | the push worker, extended with a **fetch** handler — which is what a browser waits for before offering to install |
| `/offline` | what an installed app shows with no connection: no session, no settings, no database, because the point is that it works when nothing can be reached |

**Installing needs HTTPS.** A service worker only runs in a *secure context*, and a browser will not
offer to install an app without one. `https://…` and `http://localhost` qualify; a bare network
address such as `http://192.168.1.85:3100` does not, so on a phone the install prompt will not appear
until the app is served over HTTPS — through a tunnel, a reverse proxy with a certificate, or the real
deployment. The app itself works fine over plain HTTP on a local network; only the install does not.

The fetch handler is deliberately conservative. Navigations are **network-first**, so a page is never
stale while the network is there, with the last good copy as the fallback. Icons and stylesheets are
cache-first, because they never change. **Nothing else is cached** — not an API route, not an uploaded
document, not a page that reads the session — because caching a response that belongs to one
signed-in member and serving it to another would be a leak.

## Performance: what a network-away database costs, and what was done about it

| | Measured |
|---|---|
| Query on an **open** connection | **57 ms** (the round trip to São Paulo) |
| First query on a **new** connection | **790 ms** (TCP, TLS and pooler authentication) |
| Coordinates — local Docker database | ~1 ms |
| Coordinates — `us-west-2` | 210 ms per query |

So a page costs roughly *(round trips × 57 ms)* divided by however much of it can run in parallel.
Measured on one clean server:

| Page | Before this work | Now (median of 7) |
|---|---|---|
| Landing | 240–475 ms | **115 ms** |
| Directory | 490–920 ms | **114 ms** |
| Community | 500–1000 ms | **112 ms** |
| Emergency | 88–150 ms | **170 ms** |
| A page with no lists (verification, auth) | 87–99 ms | **40–140 ms** |
| Signed-in pages (dashboard, cases, payments) | — | **130–250 ms** |

Two caveats, stated plainly. The **first** load after the cache expires is slower — 300–600 ms —
because it is the one that actually asks the database. And the network to São Paulo is jittery: a
round trip measures 58 ms at the median but has been seen at 1,127 ms, which is what makes an
occasional page slow for no visible reason.

Seven changes were made, none of which alters behaviour:

1. **One Prisma client per process.** `src/lib/db.ts` cached the client on `globalThis` only outside
   production. Next.js bundles server code per route, so the same module was loaded more than once
   per process and each copy built its own client — and its own pool. That is what exhausted the
   fifteen-client pooler. It is now cached in production too.
2. **The activity register no longer blocks a page.** The traffic row is still written, but the
   response does not wait for it: one round trip off *every* page view.
3. **Badge counts are counts.** `navCounts` was loading whole case graphs, with their clients, firms
   and documents, to render a number in the sidebar. It is now one `count()` with the same
   conditions — and a test asserts the badge agrees with the list.
4. **Session and settings are read together.** All three layouts awaited them one after the other;
   they are independent questions, so they are asked in parallel.
5. **Relations are fetched as JOINs.** Prisma's `relationJoins` feature (one line in the `generator`
   block, no model or migration change) fetches a listing with its user, profile, firm, licence and
   documents in one statement instead of five more queries.
6. **The public reads are cached** for a few seconds, as above — a repeated page load does not reach
   the database at all.
7. **The pool is opened at boot and kept open.** `src/instrumentation.ts` warms it before the first
   request, and a ping every 45 seconds stops the pooler closing an idle connection — which would
   otherwise bring the 790 ms handshake back for whoever arrived next.

### Reading less: the cache in front of the public pages

The public pages — the directory, the community, the landing page — are the ones anybody can open,
and none of what they show belongs to a signed-in member. Those reads are cached in the server process
for a few seconds (`src/lib/ttl-cache.ts`):

| Cached | For | Cleared when |
|---|---|---|
| A directory search | 30 s | a listing is saved or unpublished |
| Directory facet counts | 60 s | the same |
| Review averages | 30 s | a review is written or hidden |
| Community topic counts, recent posts | 30 s | a post is decided, commented on or deleted |
| The landing page's totals | 60 s | on the timer |
| The sidebar's three counters | 5 s, per member | on the timer |

Three properties make it safe: a failed load is never cached, concurrent readers share one in-flight
query, and every write that changes public data clears it in the same process. The settings — the
maintenance switch and the feature flags — are deliberately **not** cached across requests: they decide
what the whole application shows, and they must be true the moment an administrator saves them.

The end-to-end suites write fixtures from **their own process**, which an in-process cache cannot be
told about, so they run against a server started with `DISABLE_READ_CACHE=1`. That is what keeps the
960 checks honest about business logic; the cache itself is checked separately.

**The remaining cost is distance, not code.** A page making eleven round trips to another continent
cannot be as fast as one making eleven round trips to a socket. The honest fixes are to **run the
application in the same region as the database** (`sa-east-1`) — which removes the 57 ms almost
entirely — or to accept 100–500 ms pages. One further code-level lever exists and is not used here:
Prisma's `relationJoins` preview feature would collapse the five relation queries behind a directory
listing into the main query, cutting that page's round trips roughly in half. It needs one line in the
`generator` block of `prisma/schema.prisma`, and the schema was deliberately left untouched.

### This installation's project

| | |
|---|---|
| Project URL | `https://zfjhudomfgypcghgylea.supabase.co` |
| Region | **`us-west-2`** — found by the pooler's tenant lookup; `eu-central-1` does not host it |
| Publishable key | in `.env` as `SUPABASE_PUBLISHABLE_KEY` |
| Direct host | `db.zfjhudomfgypcghgylea.supabase.co` — **IPv6 only**, confirmed unreachable from this machine |
| Connection | the **session pooler** on 5432 — but see *Speed* below before using it from here |
| Schema | 42 tables, applied from the single baseline migration |
| Data | copied from the local database: 4 accounts, 3 cases, 1 post, all rows matched |

The publishable key is a **browser key**: it is safe to ship, and it grants nothing on its own because
row level security is what decides what a browser may read. This application does not use it — every
table is reached through Prisma on the server — so it is in `.env` for a future Storage or Realtime
feature rather than for the data layer. There is deliberately **no `@supabase/supabase-js`
dependency**: a key in a browser bundle is a second, weaker way into the same tables, and the server is
already the only thing that should touch them.

Because the direct host is IPv6-only, **migrations go through the session pooler**, which is IPv4 and
speaks the same protocol on the same port:

```bash
# What the application uses: the transaction pooler. Fill in the database password
# from Project settings → Database.
DATABASE_URL="postgresql://postgres.zfjhudomfgypcghgylea:<PASSWORD>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# What migrations use: the session pooler, not the IPv6-only direct host.
DIRECT_URL="postgresql://postgres.zfjhudomfgypcghgylea:<PASSWORD>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

Both lines are already written into `.env` as comments, with the project reference and the region
filled in: replace `<PASSWORD>` and uncomment them.

### Connecting a fresh project

1. Create the project, and copy the two connection strings from *Project settings → Database*.
2. Apply the schema and check it landed:

```bash
npx prisma migrate deploy     # uses DIRECT_URL: migrations need a session
npm run db:check              # says which host answered, and how many tables it can see
```

`npm run db:check` is the two-second answer to "is it actually connected, and to what?" — it prints
the host, the role, the table and migration counts, whether the URL is pooled, and whether
`ENCRYPTION_KEY` is set.

`npm run db:check` is the two-second answer to "is it actually connected, and to what?" — it prints
the host, the role, the table and migration counts, whether the URL is pooled, and whether
`ENCRYPTION_KEY` is set.

### Speed: put the database next to the application

The first attempt at this pointed the application at a Supabase project in **`us-west-2`** while the
machine running it was in **Argentina**. Every page took three to four seconds, because every query
crossed the Atlantic and back twice.

Measured from this machine, TCP connect time:

| Region | Connect |
|---|---|
| **`sa-east-1`** (São Paulo) | **74 ms** |
| `us-east-1` | 190 ms |
| `us-west-2` | 250 ms |
| `eu-central-1`, `eu-west-*` | ~400 ms |

São Paulo is **3.4× closer than the region this project is in**, and a project there would answer in
about 35 ms per query instead of 210 ms. There is no setting that fixes distance: **the database and
the application belong in the same region**, or the database belongs in the region the users are in.
Until the project moves, this installation runs against the local PostgreSQL, and the Supabase
connection sits in `.env` commented out and ready.

### Which pooler, and why it matters

Measured on this installation, same project, same moment:

| Connection | Round trip |
|---|---|
| Transaction pooler, port 6543 | **~1090 ms** per query |
| Session pooler, port 5432 | **~210 ms** per query |

The transaction pooler is built for serverless functions that cannot hold a connection open: every
query is handed to a different backend, and Prisma pays for that on each one. This application is a
**long-running Node server**, so it holds connections open and wants the **session pooler**; using the
transaction pooler cost it a second per query for no benefit at all. Both URLs therefore point at the
session pooler, and `prisma migrate deploy` is happy for the same reason — it needs a session, which
the session pooler provides and the transaction pooler does not.

`?pgbouncer=true&connection_limit=1` remains the correct setting for a *serverless* deployment; it is
recorded in `.env.example` for one.

**210 ms is cross-region latency, not database speed.** This machine is in Europe and the project is
in `us-west-2`, so a page that makes fifteen queries takes three to four seconds. A deployment should
run the application in the region the database is in, or move the database to the region the users
are in — that is a one-line change to which project the URLs point at, and it is the difference
between a page that answers in 200 ms and one that takes four seconds.

### Moving the data across

The schema goes over with `prisma migrate deploy`. The rows go over with the database's own tools,
through the container that is already running the local PostgreSQL — it can see both sides, so nothing
has to be installed:

```bash
# 1. The schema, from the committed migrations.
npx prisma migrate deploy

# 2. The rows: everything except Prisma's own bookkeeping table.
docker exec dubailegal-postgres pg_dump -U dubailegal -d dubailegal \
  --data-only --disable-triggers --exclude-table=_prisma_migrations \
  | docker exec -i dubailegal-postgres psql "<DIRECT_URL>"

# 3. Which is what: Prisma's client and its bookkeeping row.
npx prisma migrate resolve --applied <the migration you just ran>   # only if the diff was empty

# 4. The check.
npm run db:check && npm run db:verify
```

Uploaded files stay on this machine: Supabase is the **database**, and `UPLOAD_DIR` is still a local
directory of encrypted files. Back that directory up separately — a database restore without it
restores rows whose files are gone.

### Things worth knowing before you point it at real data

- **Row level security is not the boundary here.** RLS protects a database from a browser client
  holding an anon key; this application has no such client. Authorisation lives in the services
  (`requireMember`, `requireReviewer`, `getCaseForViewer`) and is tested by the suites. Turning RLS on
  without policies would lock the application out of its own tables.
- **Files do not go to Supabase Storage.** Uploads are written to `UPLOAD_DIR`, encrypted by the
  application with AES-256-GCM before they touch the disk. If you would rather use Supabase Storage,
  that is a change to `src/lib/storage.ts` and nothing else — the rest of the product goes through
  those four functions.
- **Backups.** A managed database has its own backups; the upload directory does not. Back it up, and
  back up `ENCRYPTION_KEY` with it: a database restore without the key restores rows whose files
  cannot be read.
- **The connection string holds the password.** It goes in the environment, never in the repository,
  and rotating it means rotating `DATABASE_URL` and `DIRECT_URL` together.

## The repository

The source is a git repository with one remote:

```bash
git remote -v            # origin  https://github.com/rolandodxb/dubailegal.git
git log --oneline        # the history
git push -u origin main  # needs your GitHub credentials the first time
```

Pushing needs a credential that is not in this repository: either `gh auth login` once, or a personal
access token when git prompts for a password (GitHub stopped accepting account passwords for git). The
first commit is already made and the branch is `main`, so the push is the only step left.

`.env` is ignored and never committed — it holds the database password, `APP_SECRET` and
`ENCRYPTION_KEY` — and so is `var/`, which holds uploaded identity documents. `.env.example` carries
the shape of every setting without any of the values.

## Performance

Two things were done about page speed, and both hold whatever database is behind the application.

**The session and the settings are read once per request.** The layout and the page both ask who is
signed in and whether the application is in maintenance; `getSessionUser` and `getAvailability` are
now wrapped in React's `cache()`, so a request makes one session query and one settings query rather
than two or three of each.

**The landing page's five counts are one query.** They were five `count()` calls against the same two
tables — the first thing any visitor waits for. They are now a single statement.

Measured on this machine, warm, best of three:

| Page | Before | After |
|---|---|---|
| Landing | 463 ms | **56–93 ms** |
| Directory | 170 ms | **46–52 ms** |
| Community | 100 ms | **45–54 ms** |
| Dashboard (signed in) | — | 70–108 ms |
| Cases, rooms, payments, profile | — | 43–56 ms |
| Console pages | — | 51–106 ms |

## Going live

The steps, in the order they have to happen. Everything below has been done on this installation
except where it says otherwise.

### 1. A server, and a database that is not on it

```bash
# Any Linux host with Node 20+ and a reverse proxy. The database does not have to be
# the development container: a managed PostgreSQL instance is the right answer for
# anything real, in a UAE region if data residency matters to you.
```

### 2. The environment

```bash
cp .env.example .env
```

| Variable | What it must be in production |
|---|---|
| `DATABASE_URL` | The real database, with TLS if it is not on the same host |
| `APP_URL` | `https://your-domain` — no trailing slash. Links in alerts use it |
| `APP_SECRET` | `openssl rand -base64 48`. At least 32 characters, or the app refuses to start |
| `ENCRYPTION_KEY` | `openssl rand -base64 32`. **Required.** It encrypts every file and message |
| `SESSION_COOKIE_NAME` | Anything; keep `dl_session` unless you have a reason |
| `UPLOAD_DIR` | A path on a persistent volume, **not** inside the build output |
| `EMAIL_PROVIDER` | `smtp` once a transport exists; `outbox` until then |
| `REQUIRE_EMAIL_VERIFICATION` | `true` once email really sends |
| `BOOTSTRAP_REVIEWER_EMAILS` | The address that becomes the first administrator. Set it, start once |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | `npx web-push generate-vapid-keys` |
| `VIDEO_PROVIDER_URL` | Optional. Only if you want a fallback for networks that block a direct call |

Two of these are unrecoverable if lost: `ENCRYPTION_KEY` (the stored files and messages become
unreadable) and `APP_SECRET`. Put both in whatever you use for secrets, and back them up.

### 3. Migrate and build

```bash
npm ci
npx prisma migrate deploy        # never `migrate dev` against production
npm run build
npm start                        # listens on 3100
```

`prisma migrate deploy` is the only migration command that is safe on a live database: it applies
what is committed and never invents a migration from drift.

**The history is a single squashed baseline.** It was not, until this switch: the migrations had been
generated by diffing the live database at each step, so their timestamps did not follow their
dependencies and a *fresh* database could not be built from them at all — `CREATE INDEX ... ON
"appointment"` ran before anything created that table. Squashing fixed that and caught the one object
the schema language cannot express: the **partial unique index** that stops a lawyer being
double-booked, which is now written into the baseline by hand, with a comment saying why.

### 4. Run it as a service

`npm start` in the foreground is for a terminal. On a server, supervise it:

```ini
# /etc/systemd/system/dubai-legal.service
[Unit]
Description=Dubai Legal
After=network.target postgresql.service

[Service]
Type=simple
User=dubailegal
WorkingDirectory=/srv/dubai-legal
EnvironmentFile=/srv/dubai-legal/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now dubai-legal
sudo journalctl -u dubai-legal -f
```

### 5. TLS and the reverse proxy

Terminate TLS in front of it. Two things matter for the app itself:

```nginx
server {
  listen 443 ssl http2;
  server_name your-domain;

  # A call is a long-lived connection; do not let the proxy cut it short.
  proxy_read_timeout 3600s;
  proxy_buffering off;

  # Server-Sent Events for the chat and the room need this.
  proxy_set_header Connection '';

  # Uploads go up to 25 MB.
  client_max_body_size 30m;

  location / {
    proxy_pass http://127.0.0.1:3100;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

`APP_URL` should be the `https://` address. It decides two things: the links the application puts in
email, and — when no proxy announces the protocol — whether the session cookie carries `Secure`. A
`Secure` cookie is refused over plain HTTP, so pointing the app at an `http://` address while
claiming `https://` here (or the reverse) is the usual cause of "it signs me out immediately".

### 6. The first administrator

Set `BOOTSTRAP_REVIEWER_EMAILS` to the address that should run the platform, register that account,
and it is granted reviewer access on sign-in. Then remove the variable — it is a bootstrap, not a
setting. After that, reviewer access is granted from the console, and an administrator cannot approve
their own account, accept a case, or join a room.

### 7. Before the doors open

- **Delete the sample data** if you ever ran `npm run seed:demo`: *Settings → Sample data → Delete all
  sample data*. The button is there for exactly this.
- **Turn email on** and set `REQUIRE_EMAIL_VERIFICATION=true`, or decide deliberately to run without
  it and know that the outbox is where the messages are.
- **Take one backup, and restore it somewhere else.** A backup that has never been restored is a
  hope, not a backup. Then schedule it: the database, and `UPLOAD_DIR`.
- **Run the suites against the live environment once**: `npm run e2e` and `npm run db:verify`. They
  create their own accounts, remove them afterwards, and leave nothing behind — including alerts they
  fan out to accounts they did not create.
- **Check the console**: *Settings* shows the feature switches and the maintenance notice, *Activity
  register* shows real traffic, and *Outbox* shows every message that would have been sent.

## Before production

Honest list of what is deliberately not done here.

1. **Email** — no SMTP transport. Confirmation is therefore switched off. Implement a transport in
   `src/lib/email.ts`, set `EMAIL_PROVIDER`, then set `REQUIRE_EMAIL_VERIFICATION=true`.
2. **Rate limiting is per-process memory.** Move it to Redis before running more than one instance.
3. **File storage is local disk.** Files are encrypted at rest by the application (see *Encryption at
   rest*), but production wants object storage in a UAE region, a KMS-held key rather than one in the
   environment, and antivirus scanning on upload.
4. **The Emirates ID check digit is advisory, not authoritative.** Published algorithms for this
   field disagree; a mismatch is surfaced to the reviewer rather than blocking the user. No
   government or ICP interface is used or simulated anywhere in this codebase.
5. **No MFA**, and no breached-password check.
6. **Payments are simulated.** There is no card processor or bank integration. The
   card form validates the way a real one does and keeps only the brand and last
   four digits, but nothing is authorised, captured or refunded, so a "paid" row
   is a client's confirmation plus a receipt and, after that, their proof. Wiring a
   real provider means a webhook, idempotency keys, refunds and reconciliation —
   none of which exist here, and the receipt says so on its face.
7. **Receipts are produced by the browser's print-to-PDF**, not by a PDF library
   on the server. There is no stored PDF artefact: the receipt page is the
   document, and printing or saving it is the download.
8. **Conference calls are peer-to-peer.** There is no TURN relay, so a direct
   connection can fail on restrictive networks, and no SFU, so a room is 1:1.
   There is no recording and no dial-in.
9. **Push works in the browser only** — no native iOS or Android app, so no APNs
   or FCM, and no email or SMS delivery.
10. **The activity register grows with usage.** It is pruned on a 30-day window from inside the
   application; a busy deployment should move that to a scheduled job.
11. **Feature switches are enforced at the action layer.** The only entry point for a form is a Server
   Action, so this is the correct boundary — but a future internal caller of a service would bypass
   them, which is worth remembering.
12. **The server shutdown is a hard process exit.** It is audited and guarded, but nothing supervises
    or restarts the process.
13. **Case search is `ILIKE`-based**, and there is no full-text search across case descriptions.
14. **English only.** Emirate and practice-area reference data carries Arabic labels, but there is no
   i18n or RTL layout.
15. **Data residency, backups and retention** are not addressed by this codebase.

## Product boundaries

Dubai Legal is not a law firm and does not give legal advice. A verified badge states that a reviewer
approved specific documents; it is not a guarantee of competence, and it says nothing about the
outcome of any matter. Messages inside a case are not privileged merely by being sent through this
application.
