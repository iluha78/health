import { useTranslation } from "../i18n";
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
  className?: string;
};

export const TabNavigation = ({ items, activeTab, onSelect, className }: TabNavigationProps) => {
  const navClassName = className ? `tabbar ${className}` : "tabbar";
  const { t } = useTranslation();

  return (
    <nav className={navClassName} aria-label={t("common.menuLabel")}>
      {items.map(item => (
        <button
          key={item.key}
          type="button"
          className={`tab-button${activeTab === item.key ? " active" : ""}`}
          onClick={() => onSelect(item.key)}
          aria-current={activeTab === item.key ? "page" : undefined}
        >
          <TabIconGlyph tab={item.key} />
          <span className="tab-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
