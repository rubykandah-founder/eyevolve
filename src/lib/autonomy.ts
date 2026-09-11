import type { AutonomyMode, EyevolvePolicy } from "./types";
import { clamp01 } from "./scoring";

const REQUIRED_EVIDENCE = 10;
const AI_REVIEW_THRESHOLD = 0.35;
const EXCEPTION_MANAGEMENT_THRESHOLD = 0.7;
const AUTONOMOUS_THRESHOLD = 0.9;

export const getAgreementRate = (policy: EyevolvePolicy) => {
  const feedbackCount = policy.aiAgreements + policy.aiCorrections;
  return feedbackCount === 0 ? 0 : policy.aiAgreements / feedbackCount;
};

export const getCorrectionRate = (policy: EyevolvePolicy) => {
  const feedbackCount = policy.aiAgreements + policy.aiCorrections;
  return feedbackCount === 0 ? 0 : policy.aiCorrections / feedbackCount;
};

export const calculateAutonomy = (policy: EyevolvePolicy) => {
  const evidence = Math.min(1, policy.judgmentsObserved / REQUIRED_EVIDENCE);
  const agreementRate = getAgreementRate(policy);
  const correctionRate = getCorrectionRate(policy);

  return clamp01(
    0.1 +
      0.2 * evidence +
      0.35 * agreementRate +
      0.35 * policy.confidence -
      0.2 * correctionRate,
  );
};

export const modeFromAutonomy = (autonomy: number): AutonomyMode => {
  if (autonomy >= AUTONOMOUS_THRESHOLD) {
    return "autonomous";
  }
  if (autonomy >= EXCEPTION_MANAGEMENT_THRESHOLD) {
    return "exception-management";
  }
  if (autonomy >= AI_REVIEW_THRESHOLD) {
    return "ai-review";
  }
  return "human";
};

export const modeLabel = (mode: AutonomyMode) => {
  switch (mode) {
    case "human":
      return "Human learning";
    case "ai-review":
      return "AI review";
    case "exception-management":
      return "Exception management";
    case "autonomous":
      return "Autonomous";
  }
};
