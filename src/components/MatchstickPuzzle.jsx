import React from 'react';

// 1. Grid Engine (Square lattices up to 4x4)
function getGridSlots(rows = 3, cols = 3) {
  const slots = [];
  const spacing = 70;
  const startX = 30;
  const startY = 30;

  // Horizontal sticks
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({
        id: `h_${r}_${c}`,
        x1: startX + c * spacing,
        y1: startY + r * spacing,
        x2: startX + (c + 1) * spacing,
        y2: startY + r * spacing
      });
    }
  }

  // Vertical sticks
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      slots.push({
        id: `v_${r}_${c}`,
        x1: startX + c * spacing,
        y1: startY + r * spacing,
        x2: startX + c * spacing,
        y2: startY + (r + 1) * spacing
      });
    }
  }

  const viewBox = `0 0 ${startX * 2 + cols * spacing} ${startY * 2 + rows * spacing}`;
  return { slots, viewBox };
}

// 2. Isometric / Triangle Engine (Fish, Triangles, Hexagons)
function getIsometricSlots() {
  const R = 60;
  const cx = 200;
  const cy = 130;
  const slots = [];

  for (let i = 0; i < 6; i++) {
    const angle1 = (i * 60 * Math.PI) / 180;
    const angle2 = ((i + 1) * 60 * Math.PI) / 180;
    const x1 = cx + R * Math.cos(angle1);
    const y1 = cy + R * Math.sin(angle1);
    const x2 = cx + R * Math.cos(angle2);
    const y2 = cy + R * Math.sin(angle2);

    slots.push({ id: `iso_spoke_${i}`, x1: cx, y1: cy, x2: x1, y2: y1 });
    slots.push({ id: `iso_rim_${i}`, x1: x1, y1: y1, x2: x2, y2: y2 });
    
    const exX = cx + 2 * R * Math.cos(angle1);
    const exY = cy + 2 * R * Math.sin(angle1);
    slots.push({ id: `iso_ext_${i}`, x1: x1, y1: y1, x2: exX, y2: exY });
  }

  return { slots, viewBox: "0 0 400 260" };
}

// 3. Custom Props Engine (Free the Circle Glass & 4-Digits)
function getCustomSlots(preset) {
  if (preset === 'glass') {
    return {
      circle: { cx: 160, cy: 75, r: 35 },
      slots: [
        { id: "g_left_up", x1: 100, y1: 25, x2: 100, y2: 105 },
        { id: "g_left_down", x1: 100, y1: 105, x2: 100, y2: 185 },
        { id: "g_right_up", x1: 220, y1: 25, x2: 220, y2: 105 },
        { id: "g_right_down", x1: 220, y1: 105, x2: 220, y2: 185 },
        { id: "g_bar_left", x1: 60, y1: 105, x2: 160, y2: 105 },
        { id: "g_bar_mid", x1: 100, y1: 105, x2: 220, y2: 105 },
        { id: "g_bar_right", x1: 160, y1: 105, x2: 260, y2: 105 },
        { id: "g_stem_down", x1: 160, y1: 105, x2: 160, y2: 185 },
        { id: "g_stem_up", x1: 160, y1: 25, x2: 160, y2: 105 }
      ],
      viewBox: "0 0 320 210"
    };
  }

  const slots = [];
  const xs = [20, 115, 210, 305];
  xs.forEach((x, d) => {
    slots.push(
      { id: `d${d}_a`, x1: x + 12, y1: 16, x2: x + 68, y2: 16 },
      { id: `d${d}_f`, x1: x + 10, y1: 20, x2: x + 10, y2: 74 },
      { id: `d${d}_b`, x1: x + 70, y1: 20, x2: x + 70, y2: 74 },
      { id: `d${d}_g`, x1: x + 12, y1: 78, x2: x + 68, y2: 78 },
      { id: `d${d}_e`, x1: x + 10, y1: 82, x2: x + 10, y2: 136 },
      { id: `d${d}_c`, x1: x + 70, y1: 82, x2: x + 70, y2: 136 },
      { id: `d${d}_d`, x1: x + 12, y1: 140, x2: x + 68, y2: 140 }
    );
  });
  return { slots, viewBox: "0 0 400 165" };
}

export default function MatchstickPuzzle({
  preset = 'grid_3x3',
  actionType = 'MOVE',
  currentSticks = [],
  onSticksChange,
  isInteractive = true,
  showSolution = false,
  solutionSticks = []
}) {
  let layout;
  if (preset === 'glass') layout = getCustomSlots('glass');
  else if (preset === 'triangle' || preset === 'fish') layout = getIsometricSlots();
  else if (preset === 'grid_2x2') layout = getGridSlots(2, 2);
  else if (preset === 'grid_4x4') layout = getGridSlots(4, 4);
  else if (preset === 'digits') layout = getCustomSlots('digits');
  else layout = getGridSlots(3, 3);

  const displaySticks = showSolution ? solutionSticks : currentSticks;

  const handleSlotClick = (slotId) => {
    if (!isInteractive || showSolution || !onSticksChange) return;

    const isActive = currentSticks.includes(slotId);
    if (isActive) {
      onSticksChange(currentSticks.filter((id) => id !== slotId));
    } else {
      onSticksChange([...currentSticks, slotId]);
    }
  };

  return (
    <div className="flex flex-col items-center select-none w-full">
      <svg
        viewBox={layout.viewBox}
        className="w-full max-w-md bg-slate-900/90 rounded-2xl p-2 border border-slate-800 shadow-inner"
      >
        {layout.circle && (
          <circle
            cx={layout.circle.cx}
            cy={layout.circle.cy}
            r={layout.circle.r}
            fill="#475569"
            stroke="#94a3b8"
            strokeWidth="3"
            className="pointer-events-none drop-shadow-md"
          />
        )}

        {layout.slots.map((s) => {
          const isActive = displaySticks.includes(s.id);
          return (
            <g
              key={s.id}
              onClick={() => handleSlotClick(s.id)}
              className={isInteractive && !showSolution ? "cursor-pointer group" : ""}
            >
              <line
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke="transparent"
                strokeWidth={22}
                strokeLinecap="round"
              />
              {!isActive && (
                <line
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke="#334155"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  strokeLinecap="round"
                  className={isInteractive && !showSolution ? "group-hover:stroke-indigo-400 transition" : ""}
                />
              )}
              {isActive && (
                <>
                  <line
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke="#F4C430"
                    strokeWidth={6.5}
                    strokeLinecap="round"
                  />
                  <circle
                    cx={s.x2}
                    cy={s.y2}
                    r={4}
                    fill="#dc2626"
                    stroke="#991b1b"
                    strokeWidth={1}
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}