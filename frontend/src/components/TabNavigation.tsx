import type { TabKey } from "../types/forms";
import { TabIconGlyph } from "./TabIconGlyph";

export type TabItem = {
  key: TabKey;
  label: string;
};

export type TabNavigationProps = {
  items: TabItem[];
  activeTab: TabKey;
  onSelect: (tab: TabKey) => void;
};

export const TabNavigation = ({ items, activeTab, onSelect }: TabNavigationProps) => (
  <nav className="tabbar">
    {items.map(item => (
      <button
        key={item.key}
        type="button"
        className={`tab-button${activeTab === item.key ? " active" : ""}`}
        onClick={() => onSelect(item.key)}
      >
        <TabIconGlyph tab={item.key} />
        <span className="tab-label">{item.label}</span>
      </button>
    ))}
  </nav>
);
