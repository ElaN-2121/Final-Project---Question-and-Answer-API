/**
 * OWNER: Student B
 *
 * Question has an `isDeleted` flag in the schema, so removing one is
 * a soft update (Student A's questions.controller.js already does
 * this). Answer has no equivalent flag, so removing one is a real
 * delete — and Comment, Vote, and Report all reference `answerId`
 * without `onDelete: Cascade` in schema.prisma, so deleting an
 * Answer directly would fail with a foreign key violation as soon as
 * any comment, vote, or report exists on it.
 *
 * This cleans up the dependent rows first, in a single transaction,
 * so the delete succeeds. Used by both answers.controller.js (author
 * deleting their own answer) and moderator.controller.js (removing
 * reported content) so the cleanup logic exists in one place.
 *
 * Pass a Prisma transaction client (not the bare prisma client) so
 * the cleanup + delete commit or roll back together.
 */
const hardDeleteAnswer = async (client, answerId) => {
  await client.report.deleteMany({ where: { answerId } });
  await client.comment.deleteMany({ where: { answerId } });
  await client.vote.deleteMany({ where: { answerId } });
  await client.answer.delete({ where: { id: answerId } });
};

module.exports = { hardDeleteAnswer };
