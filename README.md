# KnowledgeHub — Question & Answer Platform API

A backend REST API for a Stack Overflow–style Q&A platform, built with Node.js, Express, PostgreSQL (Neon),
and Prisma. Users can ask questions, answer them, vote, comment, accept a best answer, build reputation,
and report content for moderator review.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js, Express 4 |
| Database | PostgreSQL (hosted on [Neon](https://neon.tech)) |
| ORM | Prisma 5 |
| Auth | JWT (access + refresh token rotation), bcrypt/bcryptjs |
| Validation | Zod |
| File uploads | Multer (memory storage) → Cloudinary |
| Email | Nodemailer (SMTP) |
| API docs | Swagger / OpenAPI 3.0 (`swagger-jsdoc` + `swagger-ui-express`) |
| Security | Helmet, CORS, express-rate-limit |

---

## Features

- **Authentication** — register, login, logout, refresh token rotation, email verification, forgot/reset password
- **Questions** — full CRUD, tagging, soft delete, author-only edit/delete
- **Answers** — full CRUD, accept-answer (question owner only, one accepted answer per question)
- **Comments** — on both questions and answers
- **Voting** — upvote/downvote on questions and answers, one vote per user, switching vote type supported, self-voting blocked
- **Tags** — create and list, with usage counts
- **User profiles** — public profile with activity stats, self-service profile update, Cloudinary avatar upload
- **Reputation system** — points for asking (+5), answering (+10), receiving an upvote (+2)/downvote (−1), and having an answer accepted (+15)
- **Reporting & moderation** — any user can report a question or answer; moderators/admins review the queue, mark reports reviewed/removed, and remove the underlying content
- **Admin tools** — list/block/unblock/delete users, remove any question or answer, platform-wide stats
- **Email notifications** — registration verification, new-answer notification, answer-accepted notification (best-effort; failures are logged, not fatal to the request that triggered them)
- **Security** — Helmet, CORS, general + auth-specific rate limiting, centralized error handling, Zod validation on every input

**Not yet implemented:** search, pagination, and sorting query params on `GET /questions` (`?search=&page=&limit=&sort=`).

---

## Project Structure

```
knowledgehub-api/
├── prisma/
│   ├── schema.prisma       # All models: User, Question, Answer, Comment, Vote, Tag,
│   │                       # QuestionTag, RefreshToken, Report
│   └── seed.js             # Seeds an admin, two test users, a tag, and a sample Q&A
├── src/
│   ├── app.js              # Express app: security, Swagger, route mounting, error handling
│   ├── server.js            # Entry point
│   ├── config/
│   │   ├── prisma.js         # Shared Prisma Client instance
│   │   ├── cloudinary.js     # Cloudinary upload config + upload-stream helper
│   │   └── mail.js           # Nodemailer transporter
│   ├── middlewares/
│   │   ├── auth.js            # protect (JWT verification) + restrictTo (RBAC)
│   │   ├── errorHandler.js    # Centralized error formatting (Prisma, Zod, JWT errors → JSON)
│   │   ├── security.js        # Helmet, CORS, rate limiters
│   │   ├── upload.js          # Multer config for avatar uploads (2MB, JPEG/PNG/WebP)
│   │   └── validate.js        # Wraps a Zod schema into Express middleware
│   ├── utils/
│   │   ├── AppError.js         # Custom error class carrying a statusCode
│   │   ├── catchAsync.js       # Async route-handler wrapper (legacy convenience; most
│   │   │                       # controllers use manual try/catch instead)
│   │   ├── token.js            # JWT sign/verify helpers (access + refresh)
│   │   ├── reputation.js       # Reputation point constants + increment helper
│   │   ├── notify.js           # Best-effort notification email sender
│   │   └── cascadeDelete.js    # Cleans up Comment/Vote/Report rows before hard-deleting an Answer
│   ├── validations/           # One Zod schema file per feature area
│   ├── controllers/           # Business logic — one file per feature area
│   ├── routes/                # URL paths + middleware wiring — one file per feature area
│   └── docs/
│       └── swagger.js          # Swagger/OpenAPI base config
└── .env.example
```

### File ownership

| Area | Files | Owner |
|---|---|---|
| Auth, Users, Questions, Tags | `auth.*`, `users.*`, `questions.*`, `tags.*` (routes/controllers/validations) | Student A |
| Answers, Comments, Votes, Admin, Moderator | `answers.*`, `comments.*`, `votes.*`, `admin.*`, `moderator.*` | Student B |
| Shared foundation | `app.js`, `server.js`, `routes/index.js`, `middlewares/*`, `utils/AppError.js`, `utils/catchAsync.js`, `docs/swagger.js`, `prisma/schema.prisma` | Both |

---

## Getting Started

This project uses a **single shared Neon PostgreSQL database** — both contributors point their local `.env`
at the same `DATABASE_URL` rather than running separate local Postgres instances.

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and fill in real values (ask a teammate for the shared `DATABASE_URL`,
Cloudinary keys, and JWT secrets if you don't already have them):

```bash
cp .env.example .env
```

For local testing, use [Ethereal Email](https://ethereal.email) for the `SMTP_*` values — it's a free,
disposable fake-SMTP inbox made for exactly this. Click "Create Ethereal Account," and immediately save the
generated username and password somewhere, since Ethereal only shows them once.

### 3. Sync the database schema
Because this is a shared database without a formal migration history, use `db push` rather than
`migrate dev`/`migrate deploy` — it syncs `schema.prisma` to the live database without needing (or creating)
migration files, and without touching existing data:

```bash
npx prisma db push
npx prisma generate
```

### 4. Seed test data
```bash
npm run prisma:seed
```
Creates an admin (`admin@knowledgehub.dev` / `Password123!`) and two test users (Alice, Bob), plus a sample
tag and question/answer. Safe to re-run — it uses `upsert`.

### 5. Run the server
```bash
npm run dev
```
```
KnowledgeHub API running on http://localhost:4000
Swagger docs at http://localhost:4000/api-docs
```

### 6. Explore the API
Open `http://localhost:4000/api-docs` — every endpoint is documented and testable directly from the browser.
Use the **Authorize** button (top right) to paste an access token once you've logged in, and it'll be sent
automatically on every subsequent request in that session.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `PORT` | Server port (default 4000) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | Neon pooled connection string |
| `DATABASE_URL_UNPOOLED` | Neon direct connection string (intended for migrations/schema operations) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes (e.g. `15m`, `7d`) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Avatar upload storage |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Outgoing email (use Ethereal for local dev) |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | General API rate limit |
| `AUTH_RATE_LIMIT_MAX` | Stricter rate limit on `/auth/*` routes |

---

## API Overview

Full request/response schemas are in Swagger (`/api-docs`). Summary by area:

| Area | Base path | Notes |
|---|---|---|
| Auth | `/api/v1/auth` | register, login, refresh, logout, verify-email, forgot/reset-password |
| Users | `/api/v1/users` | public profile, self-update, avatar upload |
| Questions | `/api/v1/questions` | CRUD, soft delete |
| Answers | `/api/v1/answers` | CRUD, accept |
| Comments | `/api/v1/comments` | on questions and answers |
| Votes | `/api/v1/votes` | on questions and answers |
| Tags | `/api/v1/tags` | create, list |
| Admin | `/api/v1/admin` | user management, content removal, stats — **ADMIN role required** |
| Moderator | `/api/v1/moderator` | reports queue, content removal, user suspension — report filing is open to any authenticated user; review/removal/suspension require **MODERATOR or ADMIN** |

### Roles
`USER` (default) → `MODERATOR` → `ADMIN`. There's no self-service way to become a moderator or admin —
promote a user by editing their `role` field directly via `npx prisma studio`, or log in as the seeded admin
account. Role and suspension checks are re-verified against the database on every request (not just decoded
from the JWT), so a role change or suspension takes effect on a user's very next request, without them
needing to log in again.

---

## Testing

See `testing-guide.md` for a full manual walkthrough covering every endpoint in dependency order (two test
accounts, auth, profile, questions, answers, votes, comments, moderation, admin actions, and how to reset
the database between test runs).

---

## Known Limitations / Before Submission

- `GET /users/:id` currently returns the user's email address on a public, unauthenticated endpoint —
  worth restricting to authenticated/self-lookups only.
- Registration currently rolls back the created account entirely if the verification email fails to send —
  fine for demo purposes, but a single point of failure worth softening (create the user regardless, retry
  the email separately) if this were going further than a class project.
- `Answer` has no soft-delete flag in the schema (unlike `Question`), so deleting one is a real delete —
  comments, votes, and reports on it are cleaned up first to avoid a foreign key violation
  (`utils/cascadeDelete.js`), but this means that content is gone permanently rather than recoverable.
- Search, pagination, and sorting on `GET /questions` are not implemented yet.
- Verify that `JWT_ACCESS_SECRET` (used in `.env.example`) and the variable name actually read in
  `utils/token.js` are consistent before deploying — a mismatch here would mean the app silently falls
  back to a hardcoded default signing secret instead of the one configured in `.env`.

---

## Deployment

Not yet deployed. Target: Railway or Render, using `DATABASE_URL_UNPOOLED` (or an equivalent direct
connection) for any one-time schema sync, and the pooled `DATABASE_URL` for the running application.
