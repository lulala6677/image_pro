'use client';

import { useState } from 'react';
import { 
  Maximize2, RotateCw, FlipHorizontal, Move, 
  Circle, CircleDot, TrendingUp, SwitchCamera, Zap, BarChart3, Sliders, Expand,
  Sparkles, Activity,
  Cloud, Layers, Grid3x3, Wind, Focus, CircleDot as Bilateral,
  Scan, Palette, RefreshCw, Split, Sprout,
  ChevronDown, ChevronRight, Wand2
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
}

export function OperationPanel({ onApply, isProcessing }: OperationPanelProps) {
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['geometric']);

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

  const handleOperationSelect = (operation: OperationConfig) => {
    setSelectedOperation(operation.name);
    const defaultParams: Record<string, unknown> = {};
    operation.params.forEach(p => {
      defaultParams[p.name] = p.default;
    });
    setParams(defaultParams);
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
          <div className="border-t border-white/10 pt-4 space-y-4 flex-shrink-0 bg-white/5 -mx-4 px-4 pb-4 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-300">
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
                <div className="space-y-4 max-h-40 overflow-y-auto pr-1">
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
        )}
      </div>
    </div>
  );
}

function getAllOperations(): OperationConfig[] {
  return Object.values(OPERATION_CONFIGS).flat();
}
