# KnowledgeHub API

Question & Answer platform backend — Node.js, Express, PostgreSQL, Prisma.

## What's already built (shared foundation)

This scaffold covers the pieces both of us depend on, so they only exist once:

| Area | File(s) |
|---|---|
| Prisma schema | `prisma/schema.prisma` |
| Seed data | `prisma/seed.js` |
| Express app wiring | `src/app.js`, `src/server.js` |
| Centralized error handling | `src/middlewares/errorHandler.js`, `src/utils/AppError.js`, `src/utils/catchAsync.js` |
| Security (helmet, cors, rate limiting) | `src/middlewares/security.js` |
| Shared Zod validation wrapper | `src/middlewares/validate.js` |
| Auth middleware contract (stub — Student A implements the body) | `src/middlewares/auth.js` |
| Swagger base config | `src/docs/swagger.js` |
| Route mounting | `src/routes/index.js` |
| Prisma client singleton | `src/config/prisma.js` |

**Do not edit `app.js`, `routes/index.js`, or the middleware files without a heads-up to the other person** — everything else is scoped to your own route file so we shouldn't get merge conflicts.

## Route file ownership

| File | Owner | Mounted at |
|---|---|---|
| `src/routes/auth.routes.js` | Student A | `/api/v1/auth` |
| `src/routes/users.routes.js` | Student A | `/api/v1/users` |
| `src/routes/questions.routes.js` | Student A | `/api/v1/questions` |
| `src/routes/tags.routes.js` | Student A | `/api/v1/tags` |
| `src/routes/answers.routes.js` | Student B | `/api/v1/answers` |
| `src/routes/comments.routes.js` | Student B | `/api/v1/comments` |
| `src/routes/votes.routes.js` | Student B | `/api/v1/votes` |
| `src/routes/admin.routes.js` | Student B | `/api/v1/admin` |
| `src/routes/moderator.routes.js` | Student B | `/api/v1/moderator` |

Each file already has a TODO comment and an example of how to pull in `protect`, `catchAsync`, and `validate`. Just add your `router.METHOD(...)` calls — no other file needs to change for you to start building.

## Local setup (each person runs their own Postgres)

1. Clone the repo, `npm install`
2. Copy `.env.example` → `.env`, fill in your **own local** `DATABASE_URL` (and Cloudinary/SMTP keys once you have them)
3. Create a local Postgres database matching what you put in `DATABASE_URL`
4. `npx prisma migrate dev --name init` — this creates the tables and generates the Prisma client
   - Whoever runs this **first** commits the generated `prisma/migrations/` folder. The second person then just runs `npx prisma migrate dev` (no `--name`) to apply the same migration locally — don't regenerate a new migration from scratch.
5. `npm run prisma:seed` — loads a couple of test users, a question, and an answer
6. `npm run dev` — starts the server on `http://localhost:4000`
7. Check `http://localhost:4000/health` and `http://localhost:4000/api-docs`

## Auth middleware — how to build against it before it's finished

`src/middlewares/auth.js` currently returns a `501 Not Implemented` for `protect`. Student A will fill in the real JWT verification. Until then, if Student B wants to test protected routes locally, either:
- wait for the real implementation (should land Wednesday), or
- temporarily stub `req.user` at the top of your own route handler for local testing only — don't commit that stub.

## Swagger

Document your own routes with a JSDoc `@swagger` block directly above the route handler in your route file — `src/docs/swagger.js` already scans `src/routes/*.js` automatically, so you never need to touch the config file itself. Example:

```js
/**
 * @swagger
 * /questions:
 *   get:
 *     summary: List questions
 *     responses:
 *       200:
 *         description: A paginated list of questions
 */
router.get('/', catchAsync(getQuestions));
```

## Scripts

```
npm run dev              # start with nodemon
npm run start             # start plain node
npm run prisma:migrate   # run/create a migration
npm run prisma:generate  # regenerate Prisma client after schema changes
npm run prisma:studio    # open Prisma Studio GUI
npm run prisma:seed      # reseed test data
```
