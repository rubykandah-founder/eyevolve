import type { AutonomyMode, EyevolvePolicy } from "./types";
import { clamp01 } from "./scoring";

const REQUIRED_EVIDENCE = 10;

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
      0.25 * policy.confidence -
      0.2 * correctionRate,
  );
};

export const modeFromAutonomy = (autonomy: number): AutonomyMode => {
  if (autonomy >= 0.82) {
    return "autonomous";
  }
  if (autonomy >= 0.68) {
    return "exception-management";
  }
  if (autonomy >= 0.35) {
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
