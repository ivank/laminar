import { EachMessageConsumer } from '@laminarjs/kafkajs';
import { PgContext } from '@laminarjs/pg';
import { Feedback } from './__generated__/feedback.avsc';

// << consumer
export const feedbackConsumer: EachMessageConsumer<Feedback, Buffer, PgContext> = async ({ db, message }) => {
  if (message.decodedValue) {
    await db.query('UPDATE comms SET status = $1 WHERE comm_id = $2', [
      message.decodedValue.status,
      message.decodedValue.commId,
    ]);
  }
};
// consumer
