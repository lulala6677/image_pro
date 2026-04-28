'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { BarChart3 } from 'lucide-react';

interface HistogramProps {
  dataUrl: string;
}

interface HistogramData {
  r: number[];
  g: number[];
  b: number[];
  gray: number[];
}

async function getHistogramFromImage(dataUrl: string): Promise<HistogramData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取 canvas context'));
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        const r = new Array(256).fill(0);
        const g = new Array(256).fill(0);
        const b = new Array(256).fill(0);
        const gray = new Array(256).fill(0);
        
        for (let i = 0; i < data.length; i += 4) {
          const rVal = Math.min(255, Math.max(0, data[i]));
          const gVal = Math.min(255, Math.max(0, data[i + 1]));
          const bVal = Math.min(255, Math.max(0, data[i + 2]));
          r[rVal]++;
          g[gVal]++;
          b[bVal]++;
          const grayVal = Math.min(255, Math.max(0, Math.round(0.299 * rVal + 0.587 * gVal + 0.114 * bVal)));
          gray[grayVal]++;
        }
        
        resolve({ r, g, b, gray });
      } catch (err) {
        console.error('Histogram error:', err);
        reject(err);
      }
    };
    img.onerror = (e) => {
      console.error('Image load error:', e);
      reject(new Error('图片加载失败'));
    };
    img.src = dataUrl;
  });
}

function HistogramChart({ data, label, gradientFrom, gradientTo }: { 
  data: number[]; 
  label: string;
  gradientFrom: string;
  gradientTo: string;
}) {
  const max = useMemo(() => Math.max(...data, 1), [data]);
  
  const bars = useMemo(() => {
    return data.map((value, index) => ({
      height: (value / max) * 100,
      index
    }));
  }, [data, max]);
  
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs px-1">
        <span className="font-medium text-white/60">{label}</span>
        <span className="text-cyan-400/60 font-mono text-[10px]">0-255</span>
      </div>
      <div className="h-10 bg-white/5 rounded-lg overflow-hidden relative border border-white/5">
        <div className="absolute inset-0 flex">
          {bars.map((bar) => (
            <div
              key={bar.index}
              className="flex-1"
              style={{
                background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`,
                opacity: 0.8,
                marginTop: `${100 - bar.height}%`,
                minHeight: bar.height > 0 ? '1px' : '0'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HistogramDisplay({ dataUrl }: { dataUrl: string }) {
  const [data, setData] = useState<HistogramData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!dataUrl) return;
    
    let cancelled = false;
    let mounted = true;
    
    // 使用 async 函数并在内部处理状态
    const fetchData = async () => {
      // 初始状态设置
      if (mounted) {
        setLoading(true);
        setError(null);
        setData(null);
      }
      
      try {
        const result = await getHistogramFromImage(dataUrl);
        if (mounted && !cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (mounted && !cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    };
    
    fetchData();
      
    return () => {
      cancelled = true;
      mounted = false;
    };
  }, [dataUrl]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-white/40">
          <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-cyan-400 animate-spin" />
          <span className="text-xs">计算直方图...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-4">
        <span className="text-xs text-red-400/60">错误: {error}</span>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-xs text-white/30">等待图片...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HistogramChart 
        data={data.gray} 
        label="灰度" 
        gradientFrom="rgba(255, 255, 255, 0.4)"
        gradientTo="rgba(255, 255, 255, 0.1)"
      />
      <HistogramChart 
        data={data.r} 
        label="红色 (R)" 
        gradientFrom="rgba(251, 146, 60, 0.8)"
        gradientTo="rgba(251, 146, 60, 0.2)"
      />
      <HistogramChart 
        data={data.g} 
        label="绿色 (G)" 
        gradientFrom="rgba(34, 197, 94, 0.8)"
        gradientTo="rgba(34, 197, 94, 0.2)"
      />
      <HistogramChart 
        data={data.b} 
        label="蓝色 (B)" 
        gradientFrom="rgba(34, 211, 238, 0.8)"
        gradientTo="rgba(34, 211, 238, 0.2)"
      />
    </div>
  );
}

export function Histogram({ dataUrl }: HistogramProps) {
  if (!dataUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-white/30 p-6">
        <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">等待图片</p>
        <p className="text-xs mt-1">上传图片后显示直方图</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-orange-400" />
        <span className="text-sm font-medium text-white/70">直方图</span>
      </div>
      <HistogramDisplay dataUrl={dataUrl} />
    </div>
  );
}
