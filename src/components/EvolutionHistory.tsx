import type { EvolutionEvent } from "@/lib/types";

type EvolutionHistoryProps = {
  events: EvolutionEvent[];
};

export function EvolutionHistory({ events }: EvolutionHistoryProps) {
  return (
    <section className="panel">
      <div className="panel-title">
        <h3>Evolution history</h3>
        <span className="panel-badge">{events.length} events</span>
      </div>
      <div className="history-list">
        {events.length === 0 ? (
          <p className="mode-copy">
            No policy mutations yet. Rank the first observation to begin.
          </p>
        ) : (
          events
            .slice()
            .reverse()
            .map((event) => (
              <div className="history-item" key={event.id}>
                <strong>GEN {event.generation}</strong>
                <p>{event.summary}</p>
                <p>{event.learnedRule}</p>
              </div>
            ))
        )}
      </div>
    </section>
  );
}
