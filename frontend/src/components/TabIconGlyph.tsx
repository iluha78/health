import type { TabKey } from "../types/forms";

export const TabIconGlyph = ({ tab }: { tab: TabKey }) => {
  switch (tab) {
    case "bp":
      return (
        <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path
            d="M12 20.5s-6.5-4.3-6.5-9.2A3.5 3.5 0 0 1 9 7a3.5 3.5 0 0 1 3 1.7A3.5 3.5 0 0 1 15 7a3.5 3.5 0 0 1 3.5 4.3c0 4.9-6.5 9.2-6.5 9.2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="7 12.5 9.5 12.5 11 9.5 13 15 15 11.5 17.5 11.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "lipid":
      return (
        <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path
            d="M12 3.5 17 10.4a5 5 0 1 1-10 0Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.6 13.2c1 .8 2.2 1.3 3.4 1.3s2.4-.5 3.4-1.3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "nutrition":
      return (
        <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path
            d="M5 13.5c0-4.6 4-7.5 8.2-7.5H19v1.6c0 6-4.4 10.4-10 11l4.4-5.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 19.2c0-2.7 1.4-5.7 4.3-7.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "assistant":
    default:
      return (
        <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path
            d="M4.5 6.5h15a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H13l-4 3v-3H4.5A1.5 1.5 0 0 1 3 15V8a1.5 1.5 0 0 1 1.5-1.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="11.5" r="0.8" fill="currentColor" />
          <circle cx="12" cy="11.5" r="0.8" fill="currentColor" />
          <circle cx="15" cy="11.5" r="0.8" fill="currentColor" />
        </svg>
      );
  }
};
