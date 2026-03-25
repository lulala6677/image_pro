'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Maximize2, RotateCw, FlipHorizontal, Move, 
  Circle, CircleDot, TrendingUp, SwitchCamera, Zap, BarChart3, Sliders, Expand,
  Sparkles, Activity,
  Cloud, Layers, Grid3x3, Wind, Focus, CircleDot as Bilateral,
  Scan, Palette, RefreshCw, Split, Sprout,
  ChevronDown, ChevronRight, Wand2, GripHorizontal, Lasso, Square, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { OPERATION_CONFIGS, OperationConfig, ParamConfig } from '@/lib/image-processing';
import type { SelectionData, SelectionToolType, WandToolParams, LassoToolParams } from '@/lib/selection/types';
import { selectAll, invertSelection } from '@/lib/selection/selection-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Maximize2, RotateCw, FlipHorizontal, Move,
  Circle, CircleDot, TrendingUp, SwitchCamera, Zap, BarChart3, Sliders, Expand,
  Sparkles, Activity,
  Cloud, Layers, Grid3x3, Wind, Focus, Bilateral,
  Scan, Palette, RefreshCw, Split, Sprout
};

const categoryLabels: Record<string, string> = {
  geometric: '几何变换',
  grayscale: '灰度变换',
  noise: '噪声处理',
  filter: '滤波处理',
  edge: '边缘检测',
  color: '颜色调整',
  segmentation: '图像分割'
};

interface OperationPanelProps {
  onApply: (operation: string, params: Record<string, unknown>) => void;
  isProcessing?: boolean;
  // 选区相关 props
  imageWidth?: number;
  imageHeight?: number;
  selection?: SelectionData | null;
  onSelectionChange?: (selection: SelectionData | null) => void;
  activeTool?: SelectionToolType;
  onActiveToolChange?: (tool: SelectionToolType) => void;
  wandParams?: WandToolParams;
  onWandParamsChange?: (params: WandToolParams) => void;
  lassoParams?: LassoToolParams;
  onLassoParamsChange?: (params: LassoToolParams) => void;
}

export function OperationPanel({ 
  onApply, 
  isProcessing,
  imageWidth,
  imageHeight,
  selection,
  onSelectionChange,
  activeTool = 'none',
  onActiveToolChange,
  wandParams,
  onWandParamsChange,
  lassoParams,
  onLassoParamsChange,
}: OperationPanelProps) {
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['geometric']);
  const [paramPanelHeight, setParamPanelHeight] = useState(160); // 默认高度
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // 选区工具内部状态
  const [internalWandParams, setInternalWandParams] = useState<WandToolParams>({
    tolerance: 32,
    contiguous: true,
    invert: false,
  });
  const [internalLassoParams, setInternalLassoParams] = useState<LassoToolParams>({
    feather: 0,
    invert: false,
  });
  
  const currentWandParams = wandParams ?? internalWandParams;
  const currentLassoParams = lassoParams ?? internalLassoParams;
  
  const handleWandParamsChange = useCallback((newParams: WandToolParams) => {
    setInternalWandParams(newParams);
    onWandParamsChange?.(newParams);
  }, [onWandParamsChange]);
  
  const handleLassoParamsChange = useCallback((newParams: LassoToolParams) => {
    setInternalLassoParams(newParams);
    onLassoParamsChange?.(newParams);
  }, [onLassoParamsChange]);
  
  // 清除选区
  const handleClearSelection = useCallback(() => {
    onSelectionChange?.(null);
    onActiveToolChange?.('none');
  }, [onSelectionChange, onActiveToolChange]);
  
  // 清除选区
  const handleInvertSelection = useCallback(() => {
    if (selection) {
      onSelectionChange?.(invertSelection(selection));
    }
  }, [selection, onSelectionChange]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newExpanded = prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category];
      
      // 如果所有分类都被折叠，清除选中的操作
      if (newExpanded.length === 0) {
        setSelectedOperation(null);
        setParams({});
      }
      
      return newExpanded;
    });
  };

  // 根据参数计算面板高度
  const calculatePanelHeight = useCallback((operation: OperationConfig): number => {
    if (operation.params.length === 0) {
      return 100; // 无参数时最小高度
    }

    // 基础高度：拖拽手柄 + 描述行 + 按钮 + 内边距
    const baseHeight = 10 + 30 + 40 + 30; // 约 110px
    
    // 根据参数类型计算每个参数需要的高度
    let paramsHeight = 0;
    operation.params.forEach(param => {
      switch (param.type) {
        case 'range':
          paramsHeight += 55; // 滑块需要更多空间
          break;
        case 'select':
          paramsHeight += 50;
          break;
        case 'color':
          paramsHeight += 50;
          break;
        case 'boolean':
          paramsHeight += 30;
          break;
        case 'number':
          paramsHeight += 50;
          break;
        default:
          paramsHeight += 40;
      }
    });

    const totalHeight = baseHeight + paramsHeight;
    
    // 限制在最小和最大范围内
    return Math.max(120, Math.min(400, totalHeight));
  }, []);

  // 拖拽调整高度
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !panelRef.current) return;
    
    const rect = panelRef.current.getBoundingClientRect();
    const newHeight = rect.bottom - e.clientY;
    setParamPanelHeight(Math.max(120, Math.min(400, newHeight)));
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleOperationSelect = (operation: OperationConfig) => {
    setSelectedOperation(operation.name);
    const defaultParams: Record<string, unknown> = {};
    operation.params.forEach(p => {
      defaultParams[p.name] = p.default;
    });
    setParams(defaultParams);
    
    // 自动调整面板高度
    const autoHeight = calculatePanelHeight(operation);
    setParamPanelHeight(autoHeight);
  };

  const handleParamChange = (name: string, value: unknown) => {
    setParams(prev => ({ ...prev, [name]: value }));
  };

  const handleApply = () => {
    if (selectedOperation) {
      onApply(selectedOperation, params);
    }
  };

  const renderParamInput = (param: ParamConfig) => {
    switch (param.type) {
      case 'range':
        return (
          <div key={param.name} className="space-y-2">
            <div className="flex justify-between text-xs">
              <Label className="text-white/60">{param.label}</Label>
              <span className="text-cyan-400/80 font-mono">
                {typeof params[param.name] === 'number' 
                  ? (param.step && param.step < 1 
                      ? (params[param.name] as number).toFixed(2) 
                      : String(params[param.name]))
                  : String(param.default)}
              </span>
            </div>
            <Slider
              value={[params[param.name] as number ?? (param.default as number)]}
              min={param.min}
              max={param.max}
              step={param.step ?? 1}
              onValueChange={([value]) => handleParamChange(param.name, value)}
              className="mt-1"
            />
          </div>
        );
      
      case 'select':
        return (
          <div key={param.name} className="space-y-2">
            <Label className="text-xs text-white/60">{param.label}</Label>
            <Select
              value={params[param.name] as string ?? (param.default as string)}
              onValueChange={(value) => handleParamChange(param.name, value)}
            >
              <SelectTrigger className="h-9 bg-white/5 border-white/10 text-white/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {param.options?.map(opt => (
                  <SelectItem 
                    key={String(opt.value)} 
                    value={String(opt.value)}
                    className="text-white/70 focus:bg-white/10 focus:text-white"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case 'color':
        return (
          <div key={param.name} className="space-y-2">
            <Label className="text-xs text-white/60">{param.label}</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={params[param.name] as string ?? (param.default as string)}
                onChange={(e) => handleParamChange(param.name, e.target.value)}
                className="w-12 h-9 p-1 bg-white/5 border-white/10"
              />
              <Input
                value={params[param.name] as string ?? (param.default as string)}
                onChange={(e) => handleParamChange(param.name, e.target.value)}
                className="flex-1 h-9 bg-white/5 border-white/10 text-white/70"
              />
            </div>
          </div>
        );
      
      case 'boolean':
        return (
          <div key={param.name} className="flex items-center justify-between py-1">
            <Label className="text-xs text-white/60">{param.label}</Label>
            <Switch
              checked={params[param.name] as boolean ?? (param.default as boolean)}
              onCheckedChange={(checked) => handleParamChange(param.name, checked)}
            />
          </div>
        );
      
      case 'number':
        return (
          <div key={param.name} className="space-y-2">
            <Label className="text-xs text-white/60">{param.label}</Label>
            <Input
              type="number"
              value={params[param.name] as number ?? (param.default as number)}
              min={param.min}
              max={param.max}
              step={param.step}
              onChange={(e) => handleParamChange(param.name, parseFloat(e.target.value))}
              className="h-9 bg-white/5 border-white/10 text-white/70"
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-white/90">图像处理</h2>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col gap-3 p-4">
        {/* 选区工具 */}
        {imageWidth && imageHeight && (
          <div className="pb-3 border-b border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-3.5 w-3.5 rounded bg-gradient-to-r from-orange-500 to-cyan-500" />
              <span className="text-xs font-medium text-white/70">选区工具</span>
              {selection && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 ml-auto text-[10px] text-white/40 hover:text-white hover:bg-white/10"
                  onClick={handleClearSelection}
                >
                  清除
                </Button>
              )}
            </div>
            
            {/* 工具按钮 */}
            <div className="flex items-center gap-1.5 mb-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 rounded-md border transition-all",
                        activeTool === 'wand' 
                          ? "bg-gradient-to-r from-orange-500/80 to-yellow-500/80 border-orange-400/50 text-black shadow-lg shadow-orange-500/20" 
                          : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20"
                      )}
                      onClick={() => onActiveToolChange?.(activeTool === 'wand' ? 'none' : 'wand')}
                      disabled={isProcessing}
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-xs">
                    <p>魔棒工具</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 rounded-md border transition-all",
                        activeTool === 'lasso' 
                          ? "bg-gradient-to-r from-cyan-500/80 to-purple-500/80 border-cyan-400/50 text-black shadow-lg shadow-cyan-500/20" 
                          : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20"
                      )}
                      onClick={() => onActiveToolChange?.(activeTool === 'lasso' ? 'none' : 'lasso')}
                      disabled={isProcessing}
                    >
                      <Lasso className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-xs">
                    <p>套索工具</p>
                  </TooltipContent>
                </Tooltip>
                
                <div className="w-px h-5 bg-white/10 mx-1" />
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 rounded-md border transition-all",
                        activeTool === 'rectangle' 
                          ? "bg-gradient-to-r from-blue-500/80 to-indigo-500/80 border-blue-400/50 text-black shadow-lg shadow-blue-500/20" 
                          : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20"
                      )}
                      onClick={() => onActiveToolChange?.(activeTool === 'rectangle' ? 'none' : 'rectangle')}
                      disabled={isProcessing}
                    >
                      <Square className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-xs">
                    <p>矩形选区</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 rounded-md border transition-all",
                        activeTool === 'ellipse' 
                          ? "bg-gradient-to-r from-pink-500/80 to-rose-500/80 border-pink-400/50 text-black shadow-lg shadow-pink-500/20" 
                          : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20"
                      )}
                      onClick={() => onActiveToolChange?.(activeTool === 'ellipse' ? 'none' : 'ellipse')}
                      disabled={isProcessing}
                    >
                      <Circle className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-xs">
                    <p>椭圆选区</p>
                  </TooltipContent>
                </Tooltip>
                
                <div className="w-px h-5 bg-white/10 mx-1" />
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20 disabled:opacity-30"
                      onClick={handleInvertSelection}
                      disabled={isProcessing || !selection}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-xs">
                    <p>反选</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md bg-white/5 border-white/10 text-white/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 disabled:opacity-30"
                      onClick={handleClearSelection}
                      disabled={isProcessing || !selection}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-xs">
                    <p>取消选区</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* 魔棒参数 */}
            {activeTool === 'wand' && (
              <div className="space-y-2.5 p-2.5 rounded-lg bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-white/60">容差</Label>
                    <span className="text-[10px] font-mono text-orange-300">{currentWandParams.tolerance}</span>
                  </div>
                  <Slider
                    value={[currentWandParams.tolerance]}
                    onValueChange={([value]) => handleWandParamsChange({ ...currentWandParams, tolerance: value })}
                    min={1}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-white/60">连续</Label>
                  <Switch
                    checked={currentWandParams.contiguous}
                    onCheckedChange={(checked) => handleWandParamsChange({ ...currentWandParams, contiguous: checked })}
                    className="scale-75 origin-right"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-white/60">反选</Label>
                  <Switch
                    checked={currentWandParams.invert}
                    onCheckedChange={(checked) => handleWandParamsChange({ ...currentWandParams, invert: checked })}
                    className="scale-75 origin-right"
                  />
                </div>
                
                <p className="text-[9px] text-white/30 leading-relaxed pt-1">
                  点击图像选择颜色相似的区域
                </p>
              </div>
            )}
            
            {/* 套索参数 */}
            {activeTool === 'lasso' && (
              <div className="space-y-2.5 p-2.5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-white/60">羽化</Label>
                    <span className="text-[10px] font-mono text-cyan-300">{currentLassoParams.feather}px</span>
                  </div>
                  <Slider
                    value={[currentLassoParams.feather]}
                    onValueChange={([value]) => handleLassoParamsChange({ ...currentLassoParams, feather: value })}
                    min={0}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-white/60">反选</Label>
                  <Switch
                    checked={currentLassoParams.invert}
                    onCheckedChange={(checked) => handleLassoParamsChange({ ...currentLassoParams, invert: checked })}
                    className="scale-75 origin-right"
                  />
                </div>
                
                <p className="text-[9px] text-white/30 leading-relaxed pt-1">
                  在图像上拖动绘制选区，松开完成选择
                </p>
              </div>
            )}
            
            {/* 选区信息 */}
            {selection && selection.bounds.width > 0 && (
              <div className="mt-2 text-[9px] text-white/30 px-2 py-1 rounded bg-white/5 border border-white/5">
                选区: {selection.bounds.width} × {selection.bounds.height} px
              </div>
            )}
          </div>
        )}
        
        {/* 操作列表 */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {Object.entries(OPERATION_CONFIGS).map(([category, operations]) => (
            <Collapsible
              key={category}
              open={expandedCategories.includes(category)}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5 px-2 -ml-2">
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 flex-shrink-0 text-cyan-400 transition-transform duration-200",
                    !expandedCategories.includes(category) && "-rotate-90"
                  )} 
                />
                <span className="truncate">{categoryLabels[category] || category}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <div className="grid grid-cols-2 gap-2 mt-2 ml-6">
                  {operations.map(op => {
                    const Icon = iconMap[op.icon] || Circle;
                    return (
                      <Button
                        key={op.name}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-auto py-2 px-3 flex items-center gap-2 justify-start text-left",
                          "bg-white/5 hover:bg-white/10 border border-white/10",
                          "transition-all duration-200",
                          selectedOperation === op.name && "bg-gradient-to-r from-orange-500/40 to-cyan-500/40 border-orange-400/50 text-white shadow-lg shadow-orange-500/10"
                        )}
                        onClick={() => handleOperationSelect(op)}
                      >
                        <Icon className={cn(
                          "h-3.5 w-3.5 flex-shrink-0",
                          selectedOperation === op.name ? "text-white" : "text-orange-400"
                        )} />
                        <span className="text-xs truncate text-white/70">{op.name}</span>
                      </Button>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {/* 参数面板 */}
        {selectedOperation && (
          <div 
            ref={panelRef}
            style={{ height: paramPanelHeight }}
            className="border-t border-white/10 flex-shrink-0 bg-white/5 -mx-4 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500 flex flex-col transition-all duration-300 ease-out"
          >
            {/* 拖拽手柄 */}
            <div
              ref={resizeRef}
              onMouseDown={handleMouseDown}
              className={cn(
                "h-1.5 w-full cursor-row-resize flex items-center justify-center",
                "hover:bg-gradient-to-r hover:from-orange-500/30 hover:via-yellow-500/20 hover:to-cyan-500/30",
                "transition-colors duration-200",
                isResizing && "bg-gradient-to-r from-orange-500/50 via-yellow-500/30 to-cyan-500/50"
              )}
            >
              <GripHorizontal className="h-3 w-6 text-white/30" />
            </div>
            
            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-orange-400 to-cyan-400 animate-pulse" />
                <span className="text-xs text-white/50">
                  {getAllOperations().find(o => o.name === selectedOperation)?.description}
                </span>
              </div>
              {(() => {
                const operation = getAllOperations().find(o => o.name === selectedOperation);
                if (!operation || operation.params.length === 0) return null;
                return (
                  <div className="space-y-4 pr-1">
                    {operation.params.map(renderParamInput)}
                  </div>
                );
              })()}
              <Button 
                size="sm"
                className="w-full bg-gradient-to-r from-orange-500 via-yellow-500 to-cyan-500 hover:from-orange-400 hover:via-yellow-400 hover:to-cyan-400 text-black font-medium border-0 shadow-lg shadow-orange-500/20 transition-all duration-200" 
                onClick={handleApply}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                    <span>处理中...</span>
                  </div>
                ) : (
                  '应用效果'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getAllOperations(): OperationConfig[] {
  return Object.values(OPERATION_CONFIGS).flat();
}
