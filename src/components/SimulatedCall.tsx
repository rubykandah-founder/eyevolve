"use client";

import { useEffect, useState } from "react";

type SimulatedCallProps = {
  service: string;
  incident: string;
};

const prepSteps = [
  "Finding appropriate service...",
  "Preparing incident context...",
  "Attaching observation summary...",
  "Calling...",
];

export function SimulatedCall({ service, incident }: SimulatedCallProps) {
  const [visibleLines, setVisibleLines] = useState(1);
  const transcript = [
    { speaker: "EYEVOLVE", text: `I'm reporting ${incident.toLowerCase()} near the monitored corridor.` },
    { speaker: "DISPATCH", text: "What kind of obstruction or hazard is visible?" },
    {
      speaker: "EYEVOLVE",
      text: "The satellite delta shows an actionable condition with stopped or exposed traffic nearby.",
    },
    { speaker: "DISPATCH", text: "Understood. We'll dispatch a crew." },
    { speaker: "SYSTEM", text: `${service} confirmed. Action complete.` },
  ];

  useEffect(() => {
    setVisibleLines(1);
    const timer = window.setInterval(() => {
      setVisibleLines((current) => {
        if (current >= prepSteps.length + transcript.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 720);
    return () => window.clearInterval(timer);
  }, [incident, service, transcript.length]);

  return (
    <div className="call-panel">
      <div className="panel-badge">SIMULATED AGENT ACTION</div>
      {prepSteps.slice(0, Math.min(visibleLines, prepSteps.length)).map((step) => (
        <div className="call-line" key={step}>
          <span className="call-speaker">SYSTEM</span>
          <div>{step}</div>
        </div>
      ))}
      {transcript
        .slice(0, Math.max(0, visibleLines - prepSteps.length))
        .map((line) => (
          <div className="call-line" key={`${line.speaker}-${line.text}`}>
            <span className="call-speaker">{line.speaker}</span>
            <div>{line.text}</div>
          </div>
        ))}
    </div>
  );
}
