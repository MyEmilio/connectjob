// Minimal SVG icons — replaces emoji in critical UI surfaces (navbar, buttons,
// payment flows). Keeps bundle size near-zero (no icon-library dependency).
//
// Usage: <Icon name="bell" size={18} color="#374151" />
import React from "react";

const PATHS = {
  bell:    "M14 2a6 6 0 0 0-6 6v3.586l-1.707 1.707A1 1 0 0 0 7 15h10a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-2-6Zm-2 18a3 3 0 0 1-2.83-2h5.66A3 3 0 0 1 12 20Z",
  logout:  "M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H3",
  search:  "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16ZM21 21l-4.35-4.35",
  pin:     "M12 22s-7-7-7-12a7 7 0 1 1 14 0c0 5-7 12-7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  lock:    "M6 10V7a6 6 0 1 1 12 0v3M5 10h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z",
  check:   "M5 12l5 5L20 7",
  star:    "M12 2l3 7 7 .5-5.5 5 1.5 7-6-3.5-6 3.5 1.5-7L2 9.5 9 9z",
  plus:    "M12 5v14M5 12h14",
  user:    "M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z",
  card:    "M2 7h20v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Zm0 4h20",
  send:    "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7Z",
  arrow_right: "M5 12h14M13 5l7 7-7 7",
  shield:  "M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z",
  map:     "M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  briefcase:"M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm6-4h6v4H9V3Z",
  home:    "M3 12L12 3l9 9M5 10v10h14V10",
};

export default function Icon({ name, size = 18, color = "currentColor", strokeWidth = 1.8, style = {}, className = "" }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
