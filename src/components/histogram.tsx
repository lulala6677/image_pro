'use client';

import { useMemo, useState, useEffect, useRef } from 'react';

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
    // 允许跨域
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

function HistogramChart({ data, color, label }: { data: number[]; color: string; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const max = useMemo(() => Math.max(...data, 1), [data]);
  
  // 将数据转换为 SVG 路径
  const bars = useMemo(() => {
    return data.map((value, index) => ({
      height: (value / max) * 100,
      index
    }));
  }, [data, max]);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs px-1">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="text-muted-foreground text-[10px]">0-255</span>
      </div>
      <div 
        ref={containerRef}
        className="h-12 bg-muted/30 rounded overflow-hidden relative"
      >
        <div className="absolute inset-0 flex">
          {bars.map((bar) => (
            <div
              key={bar.index}
              className="flex-1"
              style={{
                backgroundColor: color,
                opacity: 0.7,
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
    
    setData(null);
    setError(null);
    setLoading(true);
    
    getHistogramFromImage(dataUrl)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [dataUrl]);
  
  if (loading) {
    return <div className="text-center text-muted-foreground text-xs py-4">计算直方图...</div>;
  }
  
  if (error) {
    return <div className="text-center text-destructive text-xs py-2">错误: {error}</div>;
  }
  
  if (!data) {
    return <div className="text-center text-muted-foreground text-xs py-4">等待图片...</div>;
  }

  return (
    <div className="space-y-3">
      <HistogramChart data={data.gray} color="#6b7280" label="灰度" />
      <HistogramChart data={data.r} color="#ef4444" label="红色 (R)" />
      <HistogramChart data={data.g} color="#22c55e" label="绿色 (G)" />
      <HistogramChart data={data.b} color="#3b82f6" label="蓝色 (B)" />
    </div>
  );
}

export function Histogram({ dataUrl }: HistogramProps) {
  if (!dataUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs p-4 text-center">
        <p>上传图片后</p>
        <p>显示直方图</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-2">
      <div className="text-xs font-medium text-muted-foreground mb-2">直方图</div>
      <HistogramDisplay dataUrl={dataUrl} />
    </div>
  );
}
