# Student B Contributions

## 1. Overview & Scope of Work

Student B implemented and documented the answer, comment, voting, reputation, moderation, and
administration portions of the KnowledgeHub REST API. The work follows the existing CommonJS Express
architecture, Prisma ORM access layer, Zod request validation, centralized `AppError` handling, JWT
authentication middleware, and Swagger/OpenAPI JSDoc conventions established in Student A's contribution.

Core responsibilities and implementations include:

- Answer submission, editing, deletion, and acceptance (question-owner-only, one accepted answer per question).
- Comments on both questions and answers.
- Upvoting and downvoting on both questions and answers, with vote-switching and duplicate-vote rejection.
- A reputation point system awarding points for answering, receiving votes, and having an answer accepted.
- Best-effort email notifications for new answers and accepted answers.
- A content-reporting flow and a moderator queue to review, resolve, and act on reports.
- Administrative tools for user management, content removal, and platform-wide statistics.
- Swagger documentation for all owned routes and request schemas.

## 2. Reputation System

Reputation point values live in a single shared constant, applied consistently everywhere they're
awarded:

| Action | Points |
| --- | --- |
| Ask a question | +5 *(implemented in Student A's `questions.controller.js`, listed here for completeness)* |
| Answer a question | +10 |
| Receive an upvote | +2 |
| Receive a downvote | −1 |
| Have an answer accepted | +15 |

`src/utils/reputation.js` exports the point constants and a single `adjustReputation(client, userId, points)`
helper. Every controller that awards or removes points calls this helper inside a Prisma transaction, so the
reputation change commits or rolls back atomically with whatever triggered it (creating an answer, casting a
vote, accepting an answer).

## 3. Answers

`POST /api/v1/answers` validates that the target question exists and is not soft-deleted, creates the answer,
awards the author +10 reputation, and — best-effort — emails the question's owner that a new answer was
posted (skipped if the question owner answered their own question).

`PATCH /api/v1/answers/:id` and `DELETE /api/v1/answers/:id` are restricted to the answer's author, with
`ADMIN`/`MODERATOR` also permitted to delete.

**Hard delete, not soft delete.** Unlike `Question`, the `Answer` model has no `isDeleted` flag in the schema.
Deleting an answer is therefore a real delete. Because `Comment`, `Vote`, and `Report` all reference
`answerId` without cascading delete behavior defined in the schema, a direct `answer.delete()` call would
fail with a foreign key violation as soon as any comment, vote, or report exists on that answer.
`src/utils/cascadeDelete.js` exports `hardDeleteAnswer(client, answerId)`, which removes dependent `Report`,
`Comment`, and `Vote` rows first, inside the same transaction as the delete itself. This helper is shared by
the author-initiated delete, the admin-initiated delete, and the moderator content-removal flow, so the
cleanup logic exists in exactly one place.

`PATCH /api/v1/answers/:id/accept` enforces that only the question's author can accept an answer. Accepting
unaccepts any previously accepted answer on the same question (only one accepted answer is ever allowed),
awards the answer's author +15 reputation, and emails them the acceptance notification.

## 4. Comments

`POST /api/v1/comments/questions/:id` and `POST /api/v1/comments/answers/:id` each confirm the target exists
before creating the comment. Comments carry no reputation effect and no moderation-specific handling beyond
what deleting their parent question/answer already does.

## 5. Voting

`POST /api/v1/votes/questions/:id` and `POST /api/v1/votes/answers/:id` both:

- Reject voting on your own content (`403`) — a rule added beyond the literal spec ("a user cannot vote
  multiple times") to close an easy reputation-farming exploit (upvoting your own post, or upvoting then
  downvoting it repeatedly) and to match standard Q&A platform behavior.
- Reject casting the exact same vote type twice (`409 You have already cast this vote.`).
- Allow switching vote type (upvote → downvote or vice versa) by updating the existing `Vote` row rather
  than creating a second one, with the reputation delta calculated to reverse the old effect and apply the
  new one in a single increment.

This relies on the `@@unique([userId, questionId])` / `@@unique([userId, answerId])` constraints already
present in the schema, using Prisma's default compound-unique key names (`userId_questionId` /
`userId_answerId`) to look up and update a user's existing vote on a given target.

## 6. Reports & Moderation

**Report creation lives at `POST /api/v1/moderator/reports`, not nested under questions/answers.** The
original route sketch suggested `POST /questions/:id/report` and `POST /answers/:id/report`, but those files
belong to Student A's `questions.routes.js` / `answers.routes.js`. Keeping report creation self-contained in
`moderator.routes.js` avoided editing files outside this scope; it requires only `protect` (any authenticated
user can file a report), not `restrictTo`, unlike the rest of the moderator routes.

`GET /api/v1/moderator/reports` defaults to `status=PENDING` and lists oldest-first (FIFO queue), with an
optional `?status=` filter across `PENDING`, `REVIEWED`, `REMOVED`.

`PATCH /api/v1/moderator/reports/:id/review` transitions a report to `REVIEWED` or `REMOVED` and records the
reviewing moderator/admin.

`DELETE /api/v1/moderator/content/:type/:id` removes a question (soft delete, same mechanism as Student A's
question deletion) or an answer (hard delete via `hardDeleteAnswer`), and — in the same transaction — marks
any other `PENDING` reports against that same content as `REMOVED`, so resolving one report doesn't leave
duplicate reports on now-deleted content sitting open.

`PATCH /api/v1/moderator/users/:id/suspend` sets `isSuspended` and computes `suspendedUntil` from a supplied
`hours` value (1–720), refuses to suspend `ADMIN` or `MODERATOR` accounts, and immediately revokes the
target's refresh tokens so the suspension takes effect without waiting for their access token to expire.

All `MODERATOR`/`ADMIN`-gated routes rely on `protect` re-fetching the user's current role from the database
on every request (Student A's implementation) rather than trusting the role encoded in the JWT — so a role
promotion or suspension takes effect on the affected user's very next request, with no need for them to log
in again.

## 7. Admin

All routes under `/api/v1/admin` require `ADMIN`.

`GET /api/v1/admin/users` is paginated (`?page=&limit=`, capped at 100 per page).

`DELETE /api/v1/admin/users/:id` refuses to delete a user who has any existing questions, answers, comments,
or votes (`409`), since the schema defines no cascading delete from those tables back to `User` — a direct
delete would otherwise fail with an unhelpful foreign key error. The suggested alternative is blocking the
account instead.

`PATCH /api/v1/admin/users/:id/block` refuses to block an `ADMIN` account, and revokes the target's refresh
tokens in the same transaction as the block, so a blocked user can't keep refreshing their way back to a
valid access token.

`DELETE /api/v1/admin/questions/:id` and `DELETE /api/v1/admin/answers/:id` mirror the moderator content-removal
behavior (soft delete for questions, hard delete via the shared helper for answers) without the
report-resolution step, since these are direct admin actions rather than responses to a filed report.

`GET /api/v1/admin/stats` returns aggregate counts: total/blocked/suspended users, active questions, answers,
comments, votes, tags, and pending reports.

## 8. API Endpoints Reference

All paths below include the `/api/v1` API prefix.

### Answers

| Method | Path | Request | Success | Errors |
| --- | --- | --- | --- | --- |
| POST | `/answers` | Bearer token; JSON: `questionId`, `content` | `201`, created answer with sanitized author | `400`/`422` validation, `401` unauthenticated, `404` question not found |
| PATCH | `/answers/:id` | Bearer token; JSON: `content` | `200`, updated answer | `401` unauthenticated, `403` non-author, `404` answer not found |
| DELETE | `/answers/:id` | Bearer token | `200`, deletion confirmation | `401` unauthenticated, `403` unauthorized, `404` answer not found |
| PATCH | `/answers/:id/accept` | Bearer token | `200`, accepted answer | `401` unauthenticated, `403` non-owner, `404` answer/question not found |

### Comments

| Method | Path | Request | Success | Errors |
| --- | --- | --- | --- | --- |
| POST | `/comments/questions/:id` | Bearer token; JSON: `content` | `201`, created comment | `401` unauthenticated, `404` question not found |
| POST | `/comments/answers/:id` | Bearer token; JSON: `content` | `201`, created comment | `401` unauthenticated, `404` answer not found |

### Votes

| Method | Path | Request | Success | Errors |
| --- | --- | --- | --- | --- |
| POST | `/votes/questions/:id` | Bearer token; JSON: `type` (`UPVOTE`/`DOWNVOTE`) | `200`, recorded/updated vote | `401` unauthenticated, `403` self-vote, `404` not found, `409` duplicate vote |
| POST | `/votes/answers/:id` | Bearer token; JSON: `type` | `200`, recorded/updated vote | `401` unauthenticated, `403` self-vote, `404` not found, `409` duplicate vote |

### Moderator

| Method | Path | Request | Success | Errors |
| --- | --- | --- | --- | --- |
| POST | `/moderator/reports` | Bearer token; JSON: `questionId` or `answerId`, `reason` | `201`, created report | `400` both/neither id provided, `401` unauthenticated, `404` target not found |
| GET | `/moderator/reports` | Bearer token (MODERATOR/ADMIN); Query: `status` | `200`, matching reports | `401` unauthenticated, `403` insufficient role |
| PATCH | `/moderator/reports/:id/review` | Bearer token (MODERATOR/ADMIN); JSON: `status` | `200`, updated report | `401`/`403`, `404` report not found |
| DELETE | `/moderator/content/:type/:id` | Bearer token (MODERATOR/ADMIN); Path: `type` (`question`/`answer`) | `200`, content removed | `401`/`403`, `404` content not found |
| PATCH | `/moderator/users/:id/suspend` | Bearer token (MODERATOR/ADMIN); JSON: `hours`, optional `reason` | `200`, suspended user | `401`/`403` (including targeting an admin/moderator), `404` user not found |

### Admin

| Method | Path | Request | Success | Errors |
| --- | --- | --- | --- | --- |
| GET | `/admin/users` | Bearer token (ADMIN); Query: `page`, `limit` | `200`, paginated users | `401`/`403` |
| DELETE | `/admin/users/:id` | Bearer token (ADMIN) | `200`, deletion confirmation | `401`/`403`, `404` not found, `409` user has existing content |
| PATCH | `/admin/users/:id/block` | Bearer token (ADMIN) | `200`, blocked user | `401`/`403` (including targeting another admin), `404` not found |
| PATCH | `/admin/users/:id/unblock` | Bearer token (ADMIN) | `200`, unblocked user | `401`/`403`, `404` not found |
| DELETE | `/admin/questions/:id` | Bearer token (ADMIN) | `200`, question removed | `401`/`403`, `404` not found |
| DELETE | `/admin/answers/:id` | Bearer token (ADMIN) | `200`, answer removed | `401`/`403`, `404` not found |
| GET | `/admin/stats` | Bearer token (ADMIN) | `200`, platform-wide counts | `401`/`403` |

## 9. Design Decisions Worth Flagging

A few judgment calls were made without full team sign-off at the time and are worth a quick confirm:

- **Self-vote blocking** is not in the original written spec — added as standard practice and to prevent
  trivial reputation farming.
- **Report creation route placement** (`/moderator/reports` rather than nested under questions/answers) was
  chosen to avoid editing Student A's route files; nesting is a small follow-up if preferred.
- **Hard delete for answers** is a consequence of the schema having no `isDeleted` flag on `Answer` (unlike
  `Question`). Deleted answers and everything attached to them (comments, votes, reports) are gone
  permanently, rather than recoverable. Adding an `isDeleted` flag to `Answer` for parity would require a
  schema change.
- **`DELETE /admin/users/:id` refuses deletion of users with existing content** rather than cascading the
  delete, since the schema has no cascade defined from `Question`/`Answer`/`Comment`/`Vote` back to `User`.

## 10. Environment Variables

No new environment variables were introduced by this contribution — all functionality (email notifications,
database access, authentication) reuses the variables already defined for Student A's work
(`SMTP_*`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, etc.).