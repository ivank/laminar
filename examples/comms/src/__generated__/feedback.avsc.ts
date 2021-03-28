/* eslint-disable @typescript-eslint/no-namespace */

export type Feedback = ComExampleFeedback.Feedback;

export namespace ComExampleFeedback {
    export const FeedbackStatusName = "com.example.feedback.FeedbackStatus";
    export type FeedbackStatus = "Pending" | "Delivered" | "Failed";
    export const FeedbackName = "com.example.feedback.Feedback";
    export interface Feedback {
        status: ComExampleFeedback.FeedbackStatus;
        commId: string;
    }
}
