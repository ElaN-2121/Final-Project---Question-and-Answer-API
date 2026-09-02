const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@knowledgehub.dev' },
    update: {},
    create: {
      email: 'admin@knowledgehub.dev',
      password: passwordHash,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: 'alice@knowledgehub.dev' },
    update: {},
    create: {
      email: 'alice@knowledgehub.dev',
      password: passwordHash,
      name: 'Alice',
      bio: 'Backend developer',
      role: 'USER',
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@knowledgehub.dev' },
    update: {},
    create: {
      email: 'bob@knowledgehub.dev',
      password: passwordHash,
      name: 'Bob',
      bio: 'Full-stack developer',
      role: 'USER',
    },
  });

  const nodeTag = await prisma.tag.upsert({
    where: { name: 'nodejs' },
    update: {},
    create: { name: 'nodejs' },
  });

  const jwtTag = await prisma.tag.upsert({
    where: { name: 'jwt' },
    update: {},
    create: { name: 'jwt' },
  });

  const question = await prisma.question.create({
    data: {
      title: 'How does JWT authentication work in Node.js?',
      description: 'I am learning backend development and want to understand how JWT authentication works end to end.',
      authorId: alice.id,
      tags: {
        create: [{ tagId: nodeTag.id }, { tagId: jwtTag.id }],
      },
    },
  });

  await prisma.answer.create({
    data: {
      content: 'JWT is commonly used to securely transfer claims between two parties using a signed token.',
      questionId: question.id,
      authorId: bob.id,
    },
  });

  console.log('Seed complete:', { admin: admin.email, alice: alice.email, bob: bob.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });