import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ToolButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  shortcut?: string;
  active?: boolean;
  tone?: 'default' | 'danger' | 'primary';
}

/** Icon button of the editor chrome, with a tooltip and a visible disabled state. */
export const ToolButton = React.forwardRef<HTMLButtonElement, ToolButtonProps>(
  ({ label, shortcut, active, tone = 'default', className, children, ...props }, ref) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={ref}
          type="button"
          aria-label={label}
          aria-pressed={active}
          className={cn(
            'inline-flex h-7 min-w-7 shrink-0 items-center justify-center gap-1.5 rounded border px-1.5 text-xs transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:pointer-events-none disabled:opacity-35',
            active
              ? 'border-[#4f8ef7] bg-[#4f8ef7]/25 text-[#7ab8ff]'
              : tone === 'primary'
                ? 'border-[#4f8ef7] bg-[#4f8ef7]/20 text-[#7ab8ff] hover:bg-[#4f8ef7]/30'
                : tone === 'danger'
                  ? 'border-white/10 bg-white/[0.06] text-[#f87171] hover:bg-red-500/15'
                  : 'border-white/10 bg-white/[0.06] text-[#aaa] hover:bg-white/[0.12] hover:text-[#ddd]',
            className,
          )}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
        {shortcut && <span className="ml-2 font-mono text-muted-foreground">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  ),
);
ToolButton.displayName = 'ToolButton';

export const Divider = () => <div className="mx-1 h-6 w-px shrink-0 bg-white/10" />;
