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
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx="14"
        fill="url(#road-fill)"
        stroke="#3e4c54"
      />
      <rect
        x={-w / 2}
        y={-h / 2 + 5}
        width={w}
        height="4"
        fill="#11191f"
        opacity="0.42"
      />
      <rect
        x={-w / 2}
        y={h / 2 - 9}
        width={w}
        height="4"
        fill="#11191f"
        opacity="0.42"
      />
      <path
        d={`M ${-w / 2 + 24} 0 H ${w / 2 - 24}`}
        stroke="#eef7f5"
        strokeWidth="2"
        strokeDasharray="18 16"
        opacity="0.55"
      />
      <path
        d={`M ${-w / 2 + 18} ${-h / 2 + 1} H ${w / 2 - 18}`}
        stroke="#44d9e6"
        strokeWidth="1"
        opacity="0.18"
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
        fill={object.status === "hazard" ? "url(#water-hazard)" : "url(#water-fill)"}
        stroke="#44d9e6"
        strokeWidth="2"
        opacity="0.92"
      />
      <path
        d={`M ${-w / 3} ${-h / 3} C ${w / 6} ${-h / 5}, ${-w / 5} ${h / 6}, ${w / 4} ${h / 3}`}
        fill="none"
        stroke="#b9f7ff"
        strokeWidth="2"
        opacity="0.22"
      />
    </g>
  );
}

function Building({ object }: { object: SceneObject }) {
  const w = object.w ?? 80;
  const h = object.h ?? 58;
  return (
    <g transform={transformFor(object)}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="7" fill="url(#roof-fill)" stroke="#9bb7c5" />
      <rect x={-w / 2 + 8} y={-h / 2 + 8} width={w - 16} height={h - 16} rx="4" fill="none" stroke="#eef7f5" opacity="0.16" />
      <path d={`M ${-w / 2} ${-h / 4} H ${w / 2}`} stroke="#eef7f5" opacity="0.22" />
      <path d={`M ${-w / 4} ${-h / 2} V ${h / 2}`} stroke="#eef7f5" opacity="0.18" />
      <circle cx={w / 3} cy={-h / 4} r="4" fill="#44d9e6" opacity="0.45" />
    </g>
  );
}

function Tree({ object }: { object: SceneObject }) {
  const w = object.w ?? 46;
  const h = object.h ?? 56;
  const fill = object.status === "hazard" ? "#7b4d33" : "#1e6a4b";
  return (
    <g transform={transformFor(object)}>
      <ellipse cx="5" cy="8" rx={w / 2.4} ry={h / 3.2} fill="#020405" opacity="0.22" />
      <circle cx="-8" cy="-6" r={w / 3.2} fill={fill} stroke="#62e68f" opacity="0.92" />
      <circle cx="8" cy="-8" r={w / 3.5} fill={fill} stroke="#62e68f" opacity="0.86" />
      <circle cx="0" cy="4" r={w / 2.8} fill={fill} opacity="0.9" />
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
      <path d={`M ${-w / 2 + 8} ${h / 2 - 2} L 0 ${-h / 2 + 8} L ${w / 2 - 8} ${h / 2 - 2}`} fill="none" stroke="#b9f7ff" opacity="0.32" />
      <path d={`M 0 ${-h / 2} V ${h / 2}`} stroke="#eef7f5" opacity="0.5" />
    </g>
  );
}

function Car({ object }: { object: SceneObject }) {
  const w = object.w ?? 46;
  const h = object.h ?? 23;
  const isBus = object.variant === "school-bus";
  const fill = isBus
    ? "#e3b83d"
    : object.status === "hazard"
      ? "#b44b4b"
      : object.status === "action"
        ? "#7ea95d"
        : "#8fa8b3";
  return (
    <g transform={transformFor(object)}>
      <ellipse cx="3" cy={h / 2 + 5} rx={w / 2.2} ry="5" fill="#020405" opacity="0.3" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="5" fill={fill} stroke="#eef7f5" opacity="0.94" />
      <rect
        x={isBus ? -w / 2 + 9 : -w / 8}
        y={-h / 2 + 4}
        width={isBus ? w - 24 : w / 3}
        height={h - 8}
        rx="3"
        fill="#152129"
        opacity="0.7"
      />
      {isBus ? (
        <path
          d={`M ${-w / 2 + 8} 0 H ${w / 2 - 8}`}
          stroke="#11191f"
          strokeWidth="2"
          opacity="0.55"
        />
      ) : null}
      <path d={`M ${-w / 2 + 6} ${-h / 4} H ${w / 2 - 8}`} stroke="#ffffff" opacity="0.28" />
      <circle cx={-w / 3} cy={h / 2} r="3" fill="#05070a" />
      <circle cx={w / 3} cy={h / 2} r="3" fill="#05070a" />
    </g>
  );
}

function Cloud({ object }: { object: SceneObject }) {
  const w = object.w ?? 96;
  const h = object.h ?? 46;
  return (
    <g transform={transformFor(object)} opacity="0.5">
      <ellipse cx={-w / 5} cy="0" rx={w / 3} ry={h / 2.5} fill="url(#cloud-fill)" />
      <ellipse cx={w / 8} cy="-6" rx={w / 3.2} ry={h / 2.2} fill="url(#cloud-fill)" />
      <ellipse cx={w / 3} cy="4" rx={w / 3.5} ry={h / 2.8} fill="url(#cloud-fill)" />
      <path d={`M ${-w / 2.4} ${h / 4} H ${w / 2.2}`} stroke="#ffffff" opacity="0.28" />
    </g>
  );
}

function Fire({ object }: { object: SceneObject }) {
  const w = object.w ?? 38;
  const h = object.h ?? 48;
  return (
    <g transform={transformFor(object)} filter="url(#hazard-glow)">
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
  if (object.variant === "crosswalk") {
    return (
      <g transform={transformFor(object)}>
        <rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          rx="4"
          fill="rgba(255,255,255,0.08)"
          stroke="#f5f1d2"
          strokeWidth="1"
          opacity="0.85"
        />
        {Array.from({ length: 6 }, (_, index) => (
          <rect
            key={index}
            x={-w / 2 + 9 + index * ((w - 18) / 6)}
            y={-h / 2 + 5}
            width={(w - 28) / 10}
            height={h - 10}
            rx="2"
            fill="#f5f1d2"
            opacity="0.86"
          />
        ))}
      </g>
    );
  }

  if (object.variant === "school-zone") {
    return (
      <g transform={transformFor(object)}>
        <rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          rx="6"
          fill="#e3b83d"
          stroke="#4a3b12"
          opacity="0.88"
        />
        <text
          x="0"
          y="-3"
          textAnchor="middle"
          fontSize="15"
          fontWeight="800"
          fill="#18232b"
        >
          SCHOOL
        </text>
        <text
          x="0"
          y="14"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          fill="#18232b"
        >
          XING
        </text>
      </g>
    );
  }

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
        <linearGradient id="terrain-fill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#eef4f2" />
          <stop offset="54%" stopColor="#e6efec" />
          <stop offset="100%" stopColor="#edf0f5" />
        </linearGradient>
        <linearGradient id="road-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#aeb8bf" />
          <stop offset="52%" stopColor="#87939b" />
          <stop offset="100%" stopColor="#6f7b84" />
        </linearGradient>
        <linearGradient id="water-fill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#9ad7e7" />
          <stop offset="100%" stopColor="#3d94b0" />
        </linearGradient>
        <linearGradient id="water-hazard" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#6cc8da" />
          <stop offset="100%" stopColor="#14809a" />
        </linearGradient>
        <linearGradient id="roof-fill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#b9c2c8" />
        </linearGradient>
        <radialGradient id="cloud-fill">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#a7b7bc" />
        </radialGradient>
        <filter id="soft-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="hazard-glow">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0.8  0 0.45 0 0 0.14  0 0 0.1 0 0.03  0 0 0 0.75 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="640" height="420" fill="url(#terrain-fill)" />
      <path
        d="M 0 86 C 110 62, 142 124, 248 92 C 358 58, 420 112, 640 68"
        stroke="#278a55"
        strokeWidth="22"
        opacity="0.08"
        fill="none"
      />
      <path
        d="M 0 360 C 118 312, 210 390, 340 338 C 456 292, 510 348, 640 314"
        stroke="#0077c8"
        strokeWidth="18"
        opacity="0.06"
        fill="none"
      />
      <g opacity="0.2">
        {Array.from({ length: 14 }, (_, index) => (
          <path key={`h-${index}`} d={`M 0 ${index * 32} H 640`} stroke="#6e8da0" />
        ))}
        {Array.from({ length: 20 }, (_, index) => (
          <path key={`v-${index}`} d={`M ${index * 32} 0 V 420`} stroke="#6e8da0" />
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
