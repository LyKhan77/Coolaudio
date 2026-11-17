import { TOOL_LIST } from '../lib/toolConfig';
import type { ToolMode } from '../types/converter';

interface ToolSwitcherProps {
  activeMode: ToolMode;
  disabled?: boolean;
  onChange: (mode: ToolMode) => void;
}

export function ToolSwitcher({ activeMode, disabled, onChange }: ToolSwitcherProps) {
  return (
    <nav aria-label="Media tools" className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" role="tablist">
        {TOOL_LIST.map((tool) => {
          const active = tool.id === activeMode;
          return (
            <button
              key={tool.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={disabled}
              onClick={() => onChange(tool.id)}
              className="brutal-btn py-2.5 px-3 min-h-11 text-xs sm:text-sm font-bold uppercase tracking-wide text-center cursor-pointer"
              style={{
                backgroundColor: active ? 'var(--primary)' : 'var(--bg)',
                color: active ? '#ffffff' : 'var(--ink)',
              }}
            >
              {tool.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
