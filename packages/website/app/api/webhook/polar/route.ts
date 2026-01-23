import { Webhooks } from "@polar-sh/nextjs";

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onOrderPaid: async (payload) => {
    // License key is automatically generated and emailed by Polar
    // This webhook is for logging/analytics
    console.log("Order paid:", payload.data.id);
  },
  onOrderRefunded: async (payload) => {
    // Handle refunds - could notify admin or take action
    console.log("Order refunded:", payload.data.id);
  },
});
