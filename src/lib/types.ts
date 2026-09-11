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
  correctionReason?: string;
  createdAt: string;
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
  engine: "openai" | "local";
};
