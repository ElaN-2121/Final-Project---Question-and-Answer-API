/**
 * OWNER: Student B
 *
 * Central place for reputation point values and the increment helper.
 * Student A's questions.controller.js already awards ASK_QUESTION
 * points inline (+5) at question creation time — that value is kept
 * here too so the numbers live in one place, but the actual increment
 * call in questions.controller.js was written before this file existed.
 * Worth unifying later; not touched here since that file isn't ours.
 */
const REPUTATION_POINTS = {
  ASK_QUESTION: 5,
  ANSWER_QUESTION: 10,
  RECEIVE_UPVOTE: 2,
  RECEIVE_DOWNVOTE: -1,
  ACCEPTED_ANSWER: 15,
};

/**
 * Adjust a user's reputation by `points` (can be negative). Pass a
 * Prisma transaction client when calling this inside `$transaction`
 * so the reputation change commits or rolls back atomically with
 * whatever triggered it.
 */
const adjustReputation = async (client, userId, points) => {
  if (!points) return;
  await client.user.update({
    where: { id: userId },
    data: { reputation: { increment: points } },
  });
};

module.exports = { REPUTATION_POINTS, adjustReputation };
