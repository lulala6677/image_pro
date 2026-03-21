'use client';

import { useState } from 'react';
import { 
  Maximize2, RotateCw, FlipHorizontal, Move, 
  Circle, CircleDot, TrendingUp, SwitchCamera, Zap, BarChart3, Sliders, Expand,
  Sparkles, Activity,
  Cloud, Layers, Grid3x3, Wind, Focus, CircleDot as Bilateral,
  Scan, Palette, RefreshCw, Split, Sprout,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleOperationSelect = (operation: OperationConfig) => {
    setSelectedOperation(operation.name);
    // 初始化参数默认值
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
              <Label>{param.label}</Label>
              <span className="text-muted-foreground">
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
            />
          </div>
        );
      
      case 'select':
        return (
          <div key={param.name} className="space-y-2">
            <Label className="text-xs">{param.label}</Label>
            <Select
              value={params[param.name] as string ?? (param.default as string)}
              onValueChange={(value) => handleParamChange(param.name, value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {param.options?.map(opt => (
                  <SelectItem key={String(opt.value)} value={String(opt.value)}>
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
            <Label className="text-xs">{param.label}</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={params[param.name] as string ?? (param.default as string)}
                onChange={(e) => handleParamChange(param.name, e.target.value)}
                className="w-10 h-8 p-1"
              />
              <Input
                value={params[param.name] as string ?? (param.default as string)}
                onChange={(e) => handleParamChange(param.name, e.target.value)}
                className="flex-1 h-8"
              />
            </div>
          </div>
        );
      
      case 'boolean':
        return (
          <div key={param.name} className="flex items-center justify-between">
            <Label className="text-xs">{param.label}</Label>
            <Switch
              checked={params[param.name] as boolean ?? (param.default as boolean)}
              onCheckedChange={(checked) => handleParamChange(param.name, checked)}
            />
          </div>
        );
      
      case 'number':
        return (
          <div key={param.name} className="space-y-2">
            <Label className="text-xs">{param.label}</Label>
            <Input
              type="number"
              value={params[param.name] as number ?? (param.default as number)}
              min={param.min}
              max={param.max}
              step={param.step}
              onChange={(e) => handleParamChange(param.name, parseFloat(e.target.value))}
              className="h-8"
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-sm">图像处理</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
        {/* 操作列表 */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {Object.entries(OPERATION_CONFIGS).map(([category, operations]) => (
            <Collapsible
              key={category}
              open={expandedCategories.includes(category)}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors">
                {expandedCategories.includes(category) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {categoryLabels[category] || category}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {operations.map(op => {
                    const Icon = iconMap[op.icon] || Circle;
                    return (
                      <Button
                        key={op.name}
                        variant={selectedOperation === op.name ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          "h-auto py-2 px-3 flex flex-col items-center gap-1",
                          selectedOperation === op.name && "ring-2 ring-primary"
                        )}
                        onClick={() => handleOperationSelect(op)}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs truncate w-full text-center">{op.name}</span>
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
          <div className="border-t pt-4 space-y-4">
            <div className="text-sm font-medium">
              {getAllOperations().find(o => o.name === selectedOperation)?.description}
            </div>
            {(() => {
              const operation = getAllOperations().find(o => o.name === selectedOperation);
              if (!operation || operation.params.length === 0) return null;
              return (
                <div className="space-y-3">
                  {operation.params.map(renderParamInput)}
                </div>
              );
            })()}
            <Button 
              className="w-full" 
              onClick={handleApply}
              disabled={isProcessing}
            >
              {isProcessing ? '处理中...' : '应用效果'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to get all operations
function getAllOperations(): OperationConfig[] {
  return Object.values(OPERATION_CONFIGS).flat();
}
