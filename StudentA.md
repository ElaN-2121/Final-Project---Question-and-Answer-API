# Student A Contributions

## 1. Overview & Scope of Work

Student A implemented and documented the account, user-profile, question, and tag portions of the KnowledgeHub REST API. The work follows the existing CommonJS Express architecture, Prisma ORM access layer, Zod request validation, centralized `AppError` handling, JWT authentication middleware, and Swagger/OpenAPI JSDoc conventions.

Core responsibilities and implementations include:

- User registration, login, refresh-token rotation, logout, password reset, and email verification.
- Public user profiles, authenticated profile updates, and avatar uploads.
- Question creation, listing, detail retrieval, author-only updates, and soft deletion by an author, administrator, or moderator.
- Tag creation and public tag listing with question usage counts.
- Swagger documentation for the owned routes and request schemas.
- Secure handling of passwords, refresh tokens, password-reset tokens, and email-verification tokens.

## 2. Database & Persistence (Neon PostgreSQL)

The API uses PostgreSQL hosted on Neon and accesses it through Prisma Client. The database connection is supplied through the `DATABASE_URL` environment variable. The application creates one shared Prisma client in `src/config/prisma.js`, which is imported by controllers instead of creating a client per request.

The connection string may point to either a pooled Neon endpoint for application traffic or a direct endpoint for administrative and migration work. Prisma migrations should be run against the appropriate direct or migration-safe connection, while the runtime application can use the pooled connection supplied by Neon.

### Schema and migrations

The relational schema includes:

- `User`: identity, credentials, roles, profile data, reputation, account state, verification state, and password-reset state.
- `Question`: question content, author ownership, timestamps, soft-delete state, and relations to answers, comments, votes, tags, and reports.
- `Answer`: answers associated with questions and authors.
- `Comment`: comments associated with questions or answers and their authors.
- `Vote`: question and answer voting records with vote types and uniqueness constraints.
- `Tag` and `QuestionTag`: normalized tags and the question-tag many-to-many join table.
- `RefreshToken`: persisted refresh-token rotation records.
- `Report`: moderation reports and review state.

The password-reset migration added `passwordResetToken` and `passwordResetExpires` to `User`. The email-verification migration added:

- `emailVerificationToken`, a nullable SHA-256 hash of the raw verification token.
- `emailVerificationExpires`, a nullable timestamp used to enforce the 24-hour validity period.

Prisma schema changes are stored under `prisma/migrations/` and are applied with `npx prisma migrate dev` in development or the project’s normal deployment migration process.

## 3. Media & File Storage (Cloudinary)

Avatar uploads use Multer memory storage and Cloudinary:

1. `PATCH /api/v1/users/avatar` authenticates the request with `protect`.
2. Multer accepts one multipart file named `avatar`.
3. Only JPEG, PNG, and WebP images are accepted.
4. Files are limited to 2 MB and remain in memory until upload.
5. `src/config/cloudinary.js` sends the buffer to the `knowledgehub/avatars` folder using Cloudinary’s upload stream.
6. Cloudinary transforms the image to a 300 by 300 WebP crop with face gravity.
7. The returned HTTPS `secure_url` is stored as `User.profileImageUrl`.

Cloudinary configuration is read from environment variables and is never hardcoded. Upload validation returns a client error for missing or unsupported files, a `413` response for files over 2 MB, and the centralized error handler processes failed provider requests. A valid Cloudinary cloud name, API key, and API secret from the same account are required for successful uploads.

## 4. Authentication & Email Verification Lifecycle

### Registration

`POST /api/v1/auth/register` validates the name, email, and password with Zod. The password is hashed with bcrypt using a cost factor of 12. A cryptographically random 32-byte verification token is generated with Node.js `crypto`.

Only the SHA-256 hash of the verification token is stored in `User.emailVerificationToken`. The raw token is placed in a link sent to the user and is not stored in the database. The expiry timestamp is set to 24 hours after registration.

The verification link is built from `FRONTEND_BASE_URL`, then `BASE_URL`, then the local server fallback, and targets:

`/api/v1/auth/verify-email?token=<RAW_TOKEN>`

The existing Nodemailer transporter sends the verification message through the configured SMTP provider. If delivery fails, the newly created user is deleted before a `503` error is returned, preventing an account from being created without a deliverable verification flow. Verification fields are excluded from authentication response payloads.

Registration currently preserves the existing API behavior of issuing access and refresh tokens. The `isVerified` flag remains `false` until the verification link is used. Protected-route enforcement for unverified users can be added later as a policy decision without changing the stored token lifecycle.

### Verification

`GET /api/v1/auth/verify-email?token=<RAW_TOKEN>` validates that the token query parameter is present. The raw token is hashed and looked up with an expiry condition requiring `emailVerificationExpires` to be later than the current time.

For a valid token, the user is updated in one operation:

- `isVerified` becomes `true`.
- `emailVerificationToken` becomes `null`.
- `emailVerificationExpires` becomes `null`.

Clearing the token makes it single-use. Invalid or expired tokens return `400`. A successful verification returns `200` with:

```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

## 5. API Endpoints Reference

All paths below include the `/api/v1` API prefix.

### Authentication

| Method | Path                          | Request                           | Success                                                          | Errors                                                                      |
| ------ | ----------------------------- | --------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| POST   | `/auth/register`              | JSON: `name`, `email`, `password` | `201`, created account and tokens; verification email dispatched | `400`/`422` validation, `409` duplicate email, `503` email delivery failure |
| POST   | `/auth/login`                 | JSON: `email`, `password`         | `200`, user and access/refresh tokens                            | `401` invalid credentials, `403` blocked account                            |
| POST   | `/auth/refresh`               | JSON: `refreshToken`              | `200`, rotated access/refresh tokens                             | `401` invalid, expired, or revoked token; `403` invalid account             |
| POST   | `/auth/logout`                | JSON: optional `refreshToken`     | `200`, logout confirmation                                       | `500` unexpected persistence failure                                        |
| GET    | `/auth/verify-email`          | Query: `token`                    | `200`, email verification confirmation                           | `400` invalid or expired token, `422` missing token                         |
| POST   | `/auth/forgot-password`       | JSON: `email`                     | `200`, non-disclosing reset confirmation                         | `422` invalid email                                                         |
| PATCH  | `/auth/reset-password/:token` | Path token; JSON: `password`      | `200`, new tokens                                                | `400` invalid or expired token, `422` invalid password                      |

### Users

| Method | Path               | Request                                     | Success                                       | Errors                                                                                           |
| ------ | ------------------ | ------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| GET    | `/users/:id`       | UUID path parameter                         | `200`, public profile and activity statistics | `400` invalid UUID, `404` user not found                                                         |
| PATCH  | `/users/update-me` | Bearer token; JSON: optional `name`, `bio`  | `200`, updated profile                        | `401` unauthenticated, `422` invalid profile data                                                |
| PATCH  | `/users/avatar`    | Bearer token; multipart file field `avatar` | `200`, updated profile and Cloudinary URL     | `400` invalid/missing image, `401` unauthenticated, `413` file too large, `500` provider failure |

### Questions

| Method | Path             | Request                                                                | Success                                                                  | Errors                                                                                               |
| ------ | ---------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| POST   | `/questions`     | Bearer token; JSON: `title`, `description`, `tags`                     | `201`, question with tags and sanitized author                           | `400`/`422` validation, `401` unauthenticated                                                        |
| GET    | `/questions`     | None                                                                   | `200`, active questions with authors, tags, and `_count` activity totals | `500` unexpected database failure                                                                    |
| GET    | `/questions/:id` | UUID path parameter                                                    | `200`, question with answers, comments, votes, and vote totals           | `400` invalid UUID, `404` missing or deleted question                                                |
| PATCH  | `/questions/:id` | Bearer token; JSON with at least one of `title`, `description`, `tags` | `200`, updated question                                                  | `400`/`422` invalid or empty update, `401` unauthenticated, `403` non-author, `404` missing question |
| DELETE | `/questions/:id` | Bearer token; UUID path parameter                                      | `200`, soft-delete confirmation                                          | `401` unauthenticated, `403` unauthorized role/owner, `404` missing question                         |

### Tags

| Method | Path    | Request                    | Success                                | Errors                                                               |
| ------ | ------- | -------------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| POST   | `/tags` | Bearer token; JSON: `name` | `201`, created tag                     | `400`/`422` invalid name, `401` unauthenticated, `409` duplicate tag |
| GET    | `/tags` | None                       | `200`, tags with question usage counts | `500` unexpected database failure                                    |

## 6. Environment Variables Configured

Values below are required or used by the implemented features. Secrets must remain in `.env` or the deployment secret manager and must not be committed.

### Application and database

- `PORT`: HTTP server port, default `4000`.
- `NODE_ENV`: runtime environment, such as `development` or `production`.
- `DATABASE_URL`: Neon PostgreSQL connection string. Use a pooled runtime URL where appropriate and a direct/migration-safe URL for migrations.

### JWT authentication

- `JWT_ACCESS_SECRET`: signing secret for access tokens.
- `JWT_REFRESH_SECRET`: signing secret for refresh tokens.
- `JWT_ACCESS_EXPIRES_IN`: access-token lifetime, such as `15m`.
- `JWT_REFRESH_EXPIRES_IN`: refresh-token lifetime, such as `7d`.

### Cloudinary

- `CLOUDINARY_CLOUD_NAME`: Cloudinary account cloud name.
- `CLOUDINARY_API_KEY`: Cloudinary API key.
- `CLOUDINARY_API_SECRET`: Cloudinary API secret.

### SMTP email

- `SMTP_HOST`: SMTP server hostname.
- `SMTP_PORT`: SMTP server port, commonly `587` or `465`.
- `SMTP_USER`: SMTP account username.
- `SMTP_PASS`: SMTP account password or provider app password.
- `SMTP_FROM`: sender address and optional display name.

### Verification and password-reset links

- `FRONTEND_BASE_URL`: public frontend or API base URL used to build email-verification links.
- `BASE_URL`: fallback base URL when `FRONTEND_BASE_URL` is not set.
- `PASSWORD_RESET_URL`: base URL used to build password-reset links.

### Rate limiting

- `RATE_LIMIT_WINDOW_MS`: general rate-limit window in milliseconds.
- `RATE_LIMIT_MAX`: maximum general requests per window.
- `AUTH_RATE_LIMIT_MAX`: maximum authentication requests per window.
