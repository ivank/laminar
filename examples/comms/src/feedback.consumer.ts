import { EachMessageConsumer } from '@ovotech/laminar-kafkajs';
import { PgContext } from '@ovotech/laminar-pg';
import { Feedback } from './__generated__/feedback.avsc';

// << consumer
export const feedbackConsumer: EachMessageConsumer<Feedback, PgContext> = async ({ db, message }) => {
  if (message.decodedValue) {
    await db.query('UPDATE comms SET status = $1 WHERE comm_id = $2', [
      message.decodedValue.status,
      message.decodedValue.commId,
    ]);
  }
};
// consumer
