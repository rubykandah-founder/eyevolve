import type { SceneObject } from "@/lib/types";

type SceneRendererProps = {
  objects: SceneObject[];
  highlightedObjectIds: string[];
};

const transformFor = (object: SceneObject) =>
  `translate(${object.x} ${object.y}) rotate(${object.rotation ?? 0})`;

const statusColor = (status: SceneObject["status"]) => {
  if (status === "hazard") {
    return "#ff5e5e";
  }
  if (status === "action") {
    return "#a8ff63";
  }
  if (status === "noise") {
    return "#6e8088";
  }
  return "#44d9e6";
};

function Highlight({ object }: { object: SceneObject }) {
  const w = (object.w ?? 44) + 18;
  const h = (object.h ?? 34) + 18;
  return (
    <rect
      className="svg-highlight"
      x={-w / 2}
      y={-h / 2}
      width={w}
      height={h}
      rx="8"
      fill="none"
      stroke={statusColor(object.status)}
      strokeWidth="2"
      strokeDasharray="6 5"
    />
  );
}

function Road({ object }: { object: SceneObject }) {
  const w = object.w ?? 640;
  const h = object.h ?? 70;
  return (
    <g transform={transformFor(object)}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="12" fill="#222b31" />
      <rect x={-w / 2} y="-2" width={w} height="4" fill="#d9e7e1" opacity="0.45" />
      <path
        d={`M ${-w / 2 + 24} 0 H ${w / 2 - 24}`}
        stroke="#eef7f5"
        strokeWidth="2"
        strokeDasharray="18 16"
        opacity="0.55"
      />
    </g>
  );
}

function River({ object }: { object: SceneObject }) {
  const w = object.w ?? 120;
  const h = object.h ?? 420;
  return (
    <g transform={transformFor(object)}>
      <path
        d={`M ${-w / 2} ${-h / 2} C ${w / 3} ${-h / 3}, ${-w / 3} ${-h / 8}, ${w / 4} 0 C ${w / 2} ${h / 5}, ${-w / 2} ${h / 3}, ${w / 3} ${h / 2} L ${-w / 2} ${h / 2} C ${-w / 6} ${h / 3}, ${-w / 2} ${h / 5}, ${-w / 4} 0 C ${w / 8} ${-h / 4}, ${-w / 2} ${-h / 3}, ${-w / 2} ${-h / 2} Z`}
        fill={object.status === "hazard" ? "#236b7b" : "#174857"}
        stroke="#44d9e6"
        strokeWidth="2"
        opacity="0.92"
      />
    </g>
  );
}

function Building({ object }: { object: SceneObject }) {
  const w = object.w ?? 80;
  const h = object.h ?? 58;
  return (
    <g transform={transformFor(object)}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="6" fill="#41505a" stroke="#9bb7c5" />
      <path d={`M ${-w / 2} ${-h / 4} H ${w / 2}`} stroke="#eef7f5" opacity="0.24" />
      <path d={`M ${-w / 4} ${-h / 2} V ${h / 2}`} stroke="#eef7f5" opacity="0.2" />
    </g>
  );
}

function Tree({ object }: { object: SceneObject }) {
  const w = object.w ?? 46;
  const h = object.h ?? 56;
  const fill = object.status === "hazard" ? "#7b4d33" : "#1e6a4b";
  return (
    <g transform={transformFor(object)}>
      <ellipse cx="0" cy="-6" rx={w / 2} ry={h / 2.4} fill={fill} stroke="#62e68f" opacity="0.9" />
      <rect x="-4" y="10" width="8" height={h / 2.5} fill="#77563e" rx="2" />
    </g>
  );
}

function Tent({ object }: { object: SceneObject }) {
  const w = object.w ?? 58;
  const h = object.h ?? 42;
  return (
    <g transform={transformFor(object)}>
      <path d={`M ${-w / 2} ${h / 2} L 0 ${-h / 2} L ${w / 2} ${h / 2} Z`} fill="#326d7d" stroke="#44d9e6" />
      <path d={`M 0 ${-h / 2} V ${h / 2}`} stroke="#eef7f5" opacity="0.5" />
    </g>
  );
}

function Car({ object }: { object: SceneObject }) {
  const w = object.w ?? 46;
  const h = object.h ?? 23;
  const fill = object.status === "hazard" ? "#b44b4b" : object.status === "action" ? "#7ea95d" : "#8fa8b3";
  return (
    <g transform={transformFor(object)}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="5" fill={fill} stroke="#eef7f5" opacity="0.94" />
      <rect x={-w / 8} y={-h / 2 + 4} width={w / 3} height={h - 8} rx="3" fill="#152129" opacity="0.7" />
      <circle cx={-w / 3} cy={h / 2} r="3" fill="#05070a" />
      <circle cx={w / 3} cy={h / 2} r="3" fill="#05070a" />
    </g>
  );
}

function Cloud({ object }: { object: SceneObject }) {
  const w = object.w ?? 96;
  const h = object.h ?? 46;
  return (
    <g transform={transformFor(object)} opacity="0.56">
      <ellipse cx={-w / 5} cy="0" rx={w / 3} ry={h / 2.5} fill="#d7e8ec" />
      <ellipse cx={w / 8} cy="-6" rx={w / 3.2} ry={h / 2.2} fill="#d7e8ec" />
      <ellipse cx={w / 3} cy="4" rx={w / 3.5} ry={h / 2.8} fill="#d7e8ec" />
    </g>
  );
}

function Fire({ object }: { object: SceneObject }) {
  const w = object.w ?? 38;
  const h = object.h ?? 48;
  return (
    <g transform={transformFor(object)}>
      <path
        d={`M 0 ${-h / 2} C ${w / 2} ${-h / 6}, ${w / 4} ${h / 2}, 0 ${h / 2} C ${-w / 3} ${h / 3}, ${-w / 2} 0, 0 ${-h / 2} Z`}
        fill="#ff5e5e"
        stroke="#f6b756"
        strokeWidth="2"
      />
      <path
        d={`M 0 ${-h / 5} C ${w / 5} 0, ${w / 8} ${h / 3}, 0 ${h / 3} C ${-w / 6} ${h / 5}, ${-w / 5} 0, 0 ${-h / 5} Z`}
        fill="#f6b756"
      />
    </g>
  );
}

function Smoke({ object }: { object: SceneObject }) {
  const w = object.w ?? 64;
  const h = object.h ?? 68;
  return (
    <g transform={transformFor(object)} opacity="0.54">
      <circle cx={-w / 6} cy={h / 5} r={w / 4} fill="#aeb9bb" />
      <circle cx={w / 9} cy="0" r={w / 3.4} fill="#aeb9bb" />
      <circle cx={w / 5} cy={-h / 4} r={w / 4.6} fill="#aeb9bb" />
    </g>
  );
}

function Animal({ object }: { object: SceneObject }) {
  const w = object.w ?? 44;
  const h = object.h ?? 28;
  const fill = object.status === "hazard" ? "#d18453" : "#b88c64";
  return (
    <g transform={transformFor(object)}>
      <ellipse cx="0" cy="0" rx={w / 2.5} ry={h / 2.4} fill={fill} stroke="#f6b756" />
      <circle cx={w / 2.8} cy={-h / 6} r={h / 4} fill={fill} />
      <path d={`M ${-w / 4} ${h / 3} L ${-w / 3} ${h / 2}`} stroke="#f6b756" strokeWidth="3" />
      <path d={`M ${w / 6} ${h / 3} L ${w / 8} ${h / 2}`} stroke="#f6b756" strokeWidth="3" />
    </g>
  );
}

function Debris({ object }: { object: SceneObject }) {
  const w = object.w ?? 36;
  const h = object.h ?? 30;
  return (
    <g transform={transformFor(object)}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="5" fill="#655f54" stroke="#b8ad9b" />
      <path d={`M ${-w / 3} ${h / 4} L ${w / 3} ${-h / 4}`} stroke="#d8c9a9" />
    </g>
  );
}

function Rail({ object }: { object: SceneObject }) {
  const w = object.w ?? 360;
  const h = object.h ?? 40;
  return (
    <g transform={transformFor(object)}>
      <path d={`M ${-w / 2} ${-h / 4} H ${w / 2}`} stroke="#8a9aa2" strokeWidth="4" />
      <path d={`M ${-w / 2} ${h / 4} H ${w / 2}`} stroke="#8a9aa2" strokeWidth="4" />
      {Array.from({ length: 14 }, (_, index) => (
        <path
          key={index}
          d={`M ${-w / 2 + index * (w / 13)} ${-h / 2} V ${h / 2}`}
          stroke="#5d6a70"
          strokeWidth="2"
        />
      ))}
    </g>
  );
}

function Shadow({ object }: { object: SceneObject }) {
  const w = object.w ?? 90;
  const h = object.h ?? 26;
  return (
    <g transform={transformFor(object)}>
      <ellipse cx="0" cy="0" rx={w / 2} ry={h / 2} fill="#020405" opacity="0.48" />
    </g>
  );
}

function Water({ object }: { object: SceneObject }) {
  const w = object.w ?? 110;
  const h = object.h ?? 60;
  return (
    <g transform={transformFor(object)}>
      <path
        d={`M ${-w / 2} 0 C ${-w / 4} ${-h / 2}, ${w / 4} ${-h / 2}, ${w / 2} 0 C ${w / 4} ${h / 2}, ${-w / 4} ${h / 2}, ${-w / 2} 0 Z`}
        fill="#236b7b"
        stroke="#44d9e6"
        opacity="0.86"
      />
    </g>
  );
}

function Marker({ object }: { object: SceneObject }) {
  const w = object.w ?? 130;
  const h = object.h ?? 52;
  return (
    <g transform={transformFor(object)}>
      <path
        d={`M ${-w / 2} ${h / 3} C ${-w / 5} ${-h / 2}, ${w / 5} ${h / 2}, ${w / 2} ${-h / 3}`}
        fill="none"
        stroke="#a8ff63"
        strokeWidth="3"
        strokeDasharray="8 7"
      />
    </g>
  );
}

function ObjectShape({ object }: { object: SceneObject }) {
  switch (object.type) {
    case "road":
      return <Road object={object} />;
    case "river":
      return <River object={object} />;
    case "building":
      return <Building object={object} />;
    case "tree":
      return <Tree object={object} />;
    case "tent":
      return <Tent object={object} />;
    case "car":
      return <Car object={object} />;
    case "cloud":
      return <Cloud object={object} />;
    case "fire":
      return <Fire object={object} />;
    case "smoke":
      return <Smoke object={object} />;
    case "animal":
      return <Animal object={object} />;
    case "debris":
      return <Debris object={object} />;
    case "rail":
      return <Rail object={object} />;
    case "shadow":
      return <Shadow object={object} />;
    case "water":
      return <Water object={object} />;
    case "marker":
      return <Marker object={object} />;
  }
}

export function SceneRenderer({
  objects,
  highlightedObjectIds,
}: SceneRendererProps) {
  return (
    <svg viewBox="0 0 640 420" role="img" aria-label="Satellite interpretation scene">
      <defs>
        <filter id="soft-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="640" height="420" fill="#091015" />
      <g opacity="0.18">
        {Array.from({ length: 14 }, (_, index) => (
          <path key={`h-${index}`} d={`M 0 ${index * 32} H 640`} stroke="#44d9e6" />
        ))}
        {Array.from({ length: 20 }, (_, index) => (
          <path key={`v-${index}`} d={`M ${index * 32} 0 V 420`} stroke="#44d9e6" />
        ))}
      </g>
      {objects.map((object) => (
        <ObjectShape key={object.id} object={object} />
      ))}
      {objects
        .filter((object) => highlightedObjectIds.includes(object.id))
        .map((object) => (
          <g key={`highlight-${object.id}`} transform={transformFor(object)} filter="url(#soft-glow)">
            <Highlight object={{ ...object, x: 0, y: 0, rotation: 0 }} />
          </g>
        ))}
    </svg>
  );
}
