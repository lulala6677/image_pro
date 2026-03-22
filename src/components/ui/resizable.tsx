'use client';

import { GripVerticalIcon } from 'lucide-react';
import {
  Group,
  Panel,
  Separator,
  type GroupProps,
  type PanelProps,
  type SeparatorProps,
} from 'react-resizable-panels';

import { cn } from '@/lib/utils';

function ResizablePanelGroup({
  className,
  orientation = 'horizontal',
  ...props
}: GroupProps) {
  return (
    <Group
      data-slot="resizable-panel-group"
      orientation={orientation}
      className={cn(
        'flex h-full w-full data-[panel-group-direction=vertical]:flex-col',
        className,
      )}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: PanelProps) {
  return <Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: SeparatorProps & {
  withHandle?: boolean;
}) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        'relative flex w-px items-center justify-center',
        'after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2',
        'focus-visible:ring-1 focus-visible:ring-orange-500/50 focus-visible:ring-offset-1 focus-visible:outline-hidden',
        'data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full',
        'data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2',
        '[&[data-panel-group-direction=vertical]>div]:rotate-90',
        'bg-white/10 hover:bg-gradient-to-b hover:from-orange-500/50 hover:via-yellow-500/30 hover:to-cyan-500/50',
        'transition-all duration-200',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className={cn(
          "z-10 flex h-8 w-3 items-center justify-center rounded-sm border",
          "bg-black/80 backdrop-blur-sm border-white/20",
          "hover:border-orange-400/50 hover:bg-black/90",
          "transition-all duration-200",
          "group"
        )}>
          <GripVerticalIcon className="size-2.5 text-white/40 group-hover:text-orange-400 transition-colors" />
        </div>
      )}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
