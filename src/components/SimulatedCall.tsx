"use client";

import { useEffect, useMemo, useState } from "react";
import type { AutonomousActionPlan } from "@/lib/types";

type SimulatedCallProps = {
  service: string;
  incident: string;
  plan: AutonomousActionPlan;
  paused: boolean;
  isEvolving: boolean;
  onCompleteAction: () => void;
};

const hashText = (value: string) =>
  Array.from(value).reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) % 9973,
    17,
  );

const simulatedDirectoryRecord = (
  receiverLabel: string,
  kind: AutonomousActionPlan["kind"],
) => {
  const seed = hashText(receiverLabel);
  if (kind === "notify" || kind === "escalate") {
    const line = String(100 + (seed % 100)).padStart(4, "0");
    return {
      label: "Simulated phone",
      value: `(555) 010-${line}`,
      note: "Matched through the local response directory.",
    };
  }

  if (kind === "ticket") {
    return {
      label: "Simulated queue",
      value: `OPS-${String(seed % 9000).padStart(4, "0")}`,
      note: "Matched to the inspection intake queue.",
    };
  }

  if (kind === "verify") {
    return {
      label: "Verification route",
      value: `REV-${String(seed % 9000).padStart(4, "0")}`,
      note: "Matched to a second-look review path.",
    };
  }

  return {
    label: "Monitoring route",
    value: `MON-${String(seed % 9000).padStart(4, "0")}`,
    note: "Matched to the next-pass monitoring loop.",
  };
};

function AiHeadsetIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="call-icon">
      <circle cx="32" cy="28" r="14" fill="currentColor" opacity="0.16" />
      <circle cx="32" cy="27" r="10" fill="none" stroke="currentColor" strokeWidth="3" />
      <path
        d="M16 34v-6c0-10 7-18 16-18s16 8 16 18v6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <rect x="10" y="31" width="10" height="15" rx="5" fill="currentColor" opacity="0.82" />
      <rect x="44" y="31" width="10" height="15" rx="5" fill="currentColor" opacity="0.82" />
      <path
        d="M44 44c-3 6-8 8-15 8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <circle cx="25" cy="52" r="3" fill="currentColor" />
      <circle cx="28" cy="27" r="2" fill="currentColor" />
      <circle cx="36" cy="27" r="2" fill="currentColor" />
      <path d="M28 36h8" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function HumanReceiverIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="call-icon">
      <circle cx="30" cy="22" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
      <path
        d="M13 54c3-12 11-18 17-18s14 6 17 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M45 19c5 3 8 8 8 14s-3 11-8 14"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
        opacity="0.72"
      />
      <path
        d="M42 28c2 1 3 3 3 5s-1 4-3 5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
        opacity="0.5"
      />
    </svg>
  );
}

function TicketReceiverIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="call-icon">
      <path
        d="M18 10h20l10 10v34H18z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path d="M38 10v12h10" fill="none" stroke="currentColor" strokeWidth="4" />
      <path
        d="M26 32h14M26 40h18M26 48h12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

export function SimulatedCall({
  service,
  incident,
  plan,
  paused,
  isEvolving,
  onCompleteAction,
}: SimulatedCallProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const transcript = useMemo(() => plan.transcript, [plan.transcript]);
  const prepSteps = plan.steps;
  const directoryRecord = useMemo(
    () =>
      plan.artifactLabel && plan.artifactValue && plan.artifactNote
        ? {
            label: plan.artifactLabel,
            value: plan.artifactValue,
            note: plan.artifactNote,
          }
        : simulatedDirectoryRecord(plan.receiverLabel, plan.kind),
    [
      plan.artifactLabel,
      plan.artifactNote,
      plan.artifactValue,
      plan.kind,
      plan.receiverLabel,
    ],
  );
  const totalSteps = prepSteps.length + transcript.length;
  const isComplete = visibleLines >= totalSteps;
  const lookupResolved = visibleLines > 0 || isComplete;
  const usesVoice = plan.kind === "notify" || plan.kind === "escalate";
  const usesTicket = plan.kind === "ticket";

  useEffect(() => {
    setVisibleLines(0);
  }, [incident, plan.kind, service]);

  useEffect(() => {
    if (paused || isComplete) {
      return;
    }

    const initialDelay = visibleLines === 0 ? 1800 : 0;
    const timeout = window.setTimeout(() => {
      setVisibleLines((current) => Math.min(totalSteps, current + 1));
    }, initialDelay || 3600);

    return () => window.clearTimeout(timeout);
  }, [isComplete, paused, totalSteps, visibleLines]);

  const currentStepIndex = Math.min(visibleLines, prepSteps.length - 1);
  const transcriptCount = Math.max(0, visibleLines - prepSteps.length);
  const currentStep = isComplete
    ? {
        label: plan.completeLabel,
        detail: `${plan.receiverLabel} accepted the simulated ${plan.label.toLowerCase()} action.`,
      }
    : prepSteps[currentStepIndex];

  return (
    <div className={`dispatch-panel agent-action-panel action-${plan.kind}`}>
      <div className="dispatch-head">
        <div>
          <span className="eyebrow">Simulated agent action</span>
          <h3>{plan.headline}</h3>
        </div>
        <span className={`dispatch-state ${isComplete ? "complete" : ""}`}>
          {isComplete ? "Complete" : paused ? "Queued" : plan.stateLabel}
        </span>
      </div>

      <div className="dispatch-route">
        <span>EYEVOLVE</span>
        <span className="route-line" />
        <span>{plan.receiverLabel}</span>
      </div>

      <section className={`directory-lookup ${lookupResolved ? "resolved" : ""}`}>
        <div>
          <span className="eyebrow">AI service lookup</span>
          <strong>
            {lookupResolved
              ? plan.receiverLabel
              : "Searching simulated service directory..."}
          </strong>
          <p>
            {lookupResolved
              ? directoryRecord.note
              : `Matching "${incident}" to a safe demo contact.`}
          </p>
        </div>
        <div className="directory-contact">
          <span>{directoryRecord.label}</span>
          <strong>{lookupResolved ? directoryRecord.value : "..."}</strong>
        </div>
      </section>

      <div className="call-connection-visual" aria-label="AI action handoff">
        <div className="call-party ai-party">
          <AiHeadsetIcon />
          <div>
            <span className="eyebrow">AI operator</span>
            <strong>EYEVOLVE</strong>
          </div>
        </div>
        <div className="voice-bridge">
          {usesVoice ? (
            <div
              className={`voice-bars ${paused || isComplete ? "paused" : ""}`}
              aria-hidden="true"
            >
              {Array.from({ length: 9 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
          ) : usesTicket ? (
            <div className={`ticket-ribbon ${paused || isComplete ? "paused" : ""}`} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <div className={`decision-ribbon ${paused || isComplete ? "paused" : ""}`} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          )}
          <span>{plan.bridgeLabel}</span>
        </div>
        <div className="call-party human-party">
          {usesTicket ? <TicketReceiverIcon /> : <HumanReceiverIcon />}
          <div>
            <span className="eyebrow">{plan.receiverRole}</span>
            <strong>{plan.receiverLabel}</strong>
          </div>
        </div>
      </div>

      <section className="agent-current-step">
        <div className="agent-step-number">
          {isComplete ? "✓" : String(Math.min(visibleLines + 1, prepSteps.length)).padStart(2, "0")}
        </div>
        <div>
          <span className="eyebrow">
            {paused ? "Queued" : isComplete ? "Complete" : "Now doing"}
          </span>
          <strong>{currentStep.label}</strong>
          <p>{currentStep.detail}</p>
        </div>
      </section>

      <div className="action-stage-list">
        {prepSteps.map((step, index) => {
          const done = visibleLines > index;
          const active = visibleLines === index && !paused && !isComplete;
          return (
            <div
              className={`action-stage compact-stage ${done ? "done" : ""} ${active ? "active" : ""}`}
              key={step.label}
            >
              <span>{done ? "✓" : active ? "●" : "○"}</span>
              <div>{step.label}</div>
            </div>
          );
        })}
      </div>

      <div className="call-panel compact">
        {transcript.slice(0, transcriptCount).map((line) => (
          <div className="call-line" key={`${line.speaker}-${line.text}`}>
            <span className="call-speaker">{line.speaker}</span>
            <div>{line.text}</div>
          </div>
        ))}
      </div>

      {isComplete ? (
        <div className="action-complete-banner">
          <div>
            <span className="eyebrow">Action complete</span>
            <strong>{plan.completeLabel}.</strong>
            <p>{plan.description}</p>
          </div>
          <button
            className="primary-button"
            disabled={isEvolving}
            onClick={onCompleteAction}
          >
            {isEvolving ? "Persisting..." : "Continue evolution"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
