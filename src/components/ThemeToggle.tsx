import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";
import { cn } from "../lib/format";

const options = [
  { mode: "light" as const, label: "淺色", icon: Sun },
  { mode: "dark" as const, label: "深色", icon: Moon },
  { mode: "system" as const, label: "跟隨系統", icon: Monitor },
];

export function ThemeToggle({
  expanded = false,
  cycleOnly = false,
}: {
  expanded?: boolean;
  cycleOnly?: boolean;
}) {
  const { mode, setMode } = useTheme();
  const active = options.find((option) => option.mode === mode) ?? options[2];
  const Icon = active.icon;

  if (cycleOnly) {
    return (
      <button
        type="button"
        className="theme-cycle-single"
        title={`目前為${active.label}；點擊切換`}
        aria-label={`目前為${active.label}，點擊切換主題`}
        onClick={() =>
          setMode(mode === "light" ? "dark" : mode === "dark" ? "system" : "light")
        }
      >
        <Icon size={17} />
      </button>
    );
  }

  if (!expanded) {
    return (
      <div className="theme-cycle" role="group" aria-label="主題模式">
        {options.map((option) => {
          const OptionIcon = option.icon;
          return (
            <button
              key={option.mode}
              type="button"
              title={option.label}
              aria-label={option.label}
              aria-pressed={mode === option.mode}
              onClick={() => setMode(option.mode)}
              className={cn("theme-cycle-button", mode === option.mode && "is-active")}
            >
              <OptionIcon size={16} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="site-action-button"
      onClick={() =>
        setMode(mode === "light" ? "dark" : mode === "dark" ? "system" : "light")
      }
      aria-label="切換主題模式"
    >
      <Icon size={18} />
      <span>{active.label}</span>
    </button>
  );
}
