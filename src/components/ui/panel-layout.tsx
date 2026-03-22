'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface PanelLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftWidth?: number;
  defaultRightWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;
}

export function PanelLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  defaultLeftWidth = 260,
  defaultRightWidth = 260,
  minLeftWidth = 200,
  maxLeftWidth = 400,
  minRightWidth = 200,
  maxRightWidth = 400,
}: PanelLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    if (isDraggingLeft) {
      const newWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, e.clientX - rect.left));
      setLeftWidth(newWidth);
    } else if (isDraggingRight) {
      const newWidth = Math.max(minRightWidth, Math.min(maxRightWidth, rect.right - e.clientX));
      setRightWidth(newWidth);
    }
  }, [isDraggingLeft, isDraggingRight, minLeftWidth, maxLeftWidth, minRightWidth, maxRightWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
  }, []);

  useEffect(() => {
    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingLeft, isDraggingRight, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex h-full w-full">
      {/* 左侧面板 */}
      <div 
        className="flex-shrink-0 h-full overflow-hidden"
        style={{ width: leftWidth }}
      >
        {leftPanel}
      </div>

      {/* 左侧拖拽手柄 */}
      <div
        className={`
          flex-shrink-0 w-1 h-full cursor-col-resize
          bg-white/10 hover:bg-gradient-to-b hover:from-orange-500/50 hover:via-yellow-500/30 hover:to-cyan-500/50
          transition-colors duration-200 relative group
          ${isDraggingLeft ? 'bg-gradient-to-b from-orange-500/50 via-yellow-500/30 to-cyan-500/50' : ''}
        `}
        onMouseDown={() => setIsDraggingLeft(true)}
      >
        <div className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[3px] h-8 rounded-sm
          bg-white/20 group-hover:bg-white/40
          ${isDraggingLeft ? 'bg-orange-400' : ''}
          transition-colors duration-200
        `} />
      </div>

      {/* 中间面板 */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {centerPanel}
      </div>

      {/* 右侧拖拽手柄 */}
      <div
        className={`
          flex-shrink-0 w-1 h-full cursor-col-resize
          bg-white/10 hover:bg-gradient-to-b hover:from-orange-500/50 hover:via-yellow-500/30 hover:to-cyan-500/50
          transition-colors duration-200 relative group
          ${isDraggingRight ? 'bg-gradient-to-b from-orange-500/50 via-yellow-500/30 to-cyan-500/50' : ''}
        `}
        onMouseDown={() => setIsDraggingRight(true)}
      >
        <div className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[3px] h-8 rounded-sm
          bg-white/20 group-hover:bg-white/40
          ${isDraggingRight ? 'bg-orange-400' : ''}
          transition-colors duration-200
        `} />
      </div>

      {/* 右侧面板 */}
      <div 
        className="flex-shrink-0 h-full overflow-hidden"
        style={{ width: rightWidth }}
      >
        {rightPanel}
      </div>
    </div>
  );
}
