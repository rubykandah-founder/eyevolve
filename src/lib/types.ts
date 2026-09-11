export const FEATURE_KEYS = [
  "humanSafety",
  "urgency",
  "infrastructure",
  "environmental",
  "behavioral",
  "visualNoise",
  "wildlifeProximity",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureWeights = Record<FeatureKey, number>;

export type AutonomyMode =
  | "human"
  | "ai-review"
  | "exception-management"
  | "autonomous";

export type AiEngine = "openai" | "local";

export type ObjectType =
  | "road"
  | "river"
  | "building"
  | "tree"
  | "tent"
  | "car"
  | "cloud"
  | "fire"
  | "smoke"
  | "animal"
  | "debris"
  | "rail"
  | "shadow"
  | "water"
  | "marker";

export type SceneObject = {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  w?: number;
  h?: number;
  rotation?: number;
  variant?: string;
  status?: "normal" | "hazard" | "noise" | "action";
};

export type ChangeDef = {
  id: string;
  label: string;
  description: string;
  objectIds: string[];
  coordinates: { x: number; y: number };
  features: FeatureWeights;
  suggestedAction?: string;
  noiseCandidate?: boolean;
};

export type SceneDef = {
  id: string;
  title: string;
  scenarioType: string;
  before: { objects: SceneObject[] };
  after: { objects: SceneObject[] };
  projection?: {
    label: string;
    description: string;
    objects: SceneObject[];
  };
  changes: ChangeDef[];
  learningTargets: FeatureWeights;
  exposure: FeatureWeights;
  recommendedAction?: string;
  actionService?: string;
  minimumAutonomy?: number;
};

export type LearnedRule = {
  id: string;
  generation: number;
  text: string;
  source: "local" | "openai";
};

export type EyevolvePolicy = {
  generation: number;
  attentionWeights: FeatureWeights;
  actionWeights: FeatureWeights;
  actionThreshold: number;
  ignoreThreshold: number;
  confidence: number;
  autonomy: number;
  observationsSeen: number;
  judgmentsObserved: number;
  aiAgreements: number;
  aiCorrections: number;
  uncertaintyByDimension: FeatureWeights;
  learnedRules: LearnedRule[];
};

export type InteractionEvent = {
  id: string;
  generation: number;
  sceneId: string;
  kind: "human-training" | "ai-agreement" | "ai-correction" | "autonomous-action";
  ranking: string[];
  actionChangeIds: string[];
  potentialChangeIds?: string[];
  correctionReason?: string;
  createdAt: string;
};

export type AutonomousActionKind =
  | "suppress"
  | "watch"
  | "verify"
  | "ticket"
  | "notify"
  | "escalate";

export type AutonomousActionPlan = {
  kind: AutonomousActionKind;
  label: string;
  headline: string;
  description: string;
  receiverLabel: string;
  receiverRole: string;
  bridgeLabel: string;
  artifactLabel?: string;
  artifactValue?: string;
  artifactNote?: string;
  stateLabel: string;
  completeLabel: string;
  transcript: { speaker: string; text: string }[];
  steps: { label: string; detail: string }[];
};

export type GenerationSummary = {
  headline: string;
  lede: string;
  compactOverlay: {
    headline: string;
    takeaway: string;
    prioritize: { label: string; reason: string };
    quietDown?: { label: string; reason: string };
    behaviorChange: string;
    nextObservation: string;
  };
  mostImportantSignal: {
    label: string;
    description: string;
    action: string;
  };
  usedToThink: string;
  nowThinks: string;
  capabilityTitle: string;
  capabilityDescription: string;
  notCritical: { label: string; reason: string }[];
  keepWatching: { label: string; reason: string }[];
  understands: string[];
  stillLearning: string[];
  ruleCarriedForward: string;
  nextObservation: string;
};

export type EvolutionEvent = {
  id: string;
  generation: number;
  sceneId: string;
  sceneTitle: string;
  summary: string;
  learnedRule: string;
  reasoningSummary: string;
  engine: "openai" | "local";
  nextSceneId: string;
  nextLearningObjective?: string;
  summaryNarrative?: GenerationSummary;
  summaryEngine?: AiEngine;
  before: EyevolvePolicy;
  after: EyevolvePolicy;
  createdAt: string;
};

export type EyevolveState = {
  version: number;
  policy: EyevolvePolicy;
  currentSceneId: string;
  seenSceneIds: string[];
  interactionHistory: InteractionEvent[];
  evolutionHistory: EvolutionEvent[];
  currentMode: AutonomyMode;
};

export type ScoredChange = ChangeDef & {
  attentionScore: number;
  actionScore: number;
  ignoreScore: number;
  ignored: boolean;
  actionRequired: boolean;
};

export type EvolutionProposal = {
  proposedPolicyDeltas: {
    attention?: Partial<FeatureWeights>;
    action?: Partial<FeatureWeights>;
  };
  learnedRule?: string;
  nextLearningObjective?: string;
  nextScenarioType?: string;
  reasoningSummary: string;
};

export type EvolveRequest = {
  policy: EyevolvePolicy;
  scene: SceneDef;
  currentScores: ScoredChange[];
  interaction: InteractionEvent;
  historySummary: string[];
};

export type EvolveResponse = {
  proposal: EvolutionProposal;
  engine: AiEngine;
};

export type SceneAnalysis = {
  changes: ChangeDef[];
  primaryChangeId: string;
  suppressedChangeIds: string[];
  reasoningSummary: string;
};

export type SceneAnalysisRequest = {
  scene: SceneDef;
  policy: EyevolvePolicy;
  candidateScores: ScoredChange[];
  recentHistory: string[];
};

export type SceneAnalysisResponse = {
  analysis: SceneAnalysis;
  engine: AiEngine;
};

export type ActionPlanRequest = {
  scene: SceneDef;
  policy: EyevolvePolicy;
  scores: ScoredChange[];
  primaryChangeId?: string;
  mode: AutonomyMode;
};

export type ActionPlanResponse = {
  plan: AutonomousActionPlan;
  engine: AiEngine;
};

export type GenerationSummaryRequest = {
  event: EvolutionEvent;
  scene: SceneDef;
  nextScene?: Pick<SceneDef, "id" | "title" | "scenarioType" | "learningTargets">;
  scoredBefore: ScoredChange[];
  scoredAfter: ScoredChange[];
  actionPlan: AutonomousActionPlan;
};

export type GenerationSummaryResponse = {
  summary: GenerationSummary;
  engine: AiEngine;
};
