import type { SubscriptionData } from "~subscriptions/subscription";
import type { ModuleFunction } from "~api/module";

const foreground: ModuleFunction<SubscriptionData[]> = (
  arweaveAccountAddress,
  applicationName,
  subscriptionName,
  subscriptionFeeAmount,
  subscriptionStatus,
  recurringPaymentFrequency,
  nextPaymentDue,
  subscriptionStartDate,
  subscriptionEndDate,
  applicationIcon?
) => {
  // Validate required fields
  const requiredFields: (keyof SubscriptionData)[] = [
    "arweaveAccountAddress",
    "applicationName",
    "subscriptionName",
    "subscriptionFeeAmount",
    "subscriptionStatus",
    "recurringPaymentFrequency",
    "nextPaymentDue",
    "subscriptionStartDate",
    "subscriptionEndDate"
  ];

  for (const field of requiredFields) {
    if (typeof eval(field) === "undefined") {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return [
    arweaveAccountAddress,
    applicationName,
    subscriptionName,
    subscriptionFeeAmount,
    subscriptionStatus,
    recurringPaymentFrequency,
    nextPaymentDue,
    subscriptionStartDate,
    subscriptionEndDate,
    applicationIcon
  ];
};

export default foreground;
