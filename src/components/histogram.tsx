'use client';

import { useMemo, useState, useEffect } from 'react';

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
          r[data[i]]++;
          g[data[i + 1]]++;
          b[data[i + 2]]++;
          const grayVal = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          gray[grayVal]++;
        }
        
        resolve({ r, g, b, gray });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
}

function HistogramChart({ data, color, label }: { data: number[]; color: string; label: string }) {
  const max = useMemo(() => Math.max(...data, 1), [data]);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">0-255</span>
      </div>
      <div className="h-16 flex items-end gap-px bg-muted/50 rounded px-1 py-0.5">
        {data.map((value, index) => (
          <div
            key={index}
            className="flex-1 rounded-t transition-all duration-100"
            style={{
              height: `${(value / max) * 100}%`,
              backgroundColor: color,
              opacity: 0.8,
              minHeight: value > 0 ? '1px' : '0'
            }}
          />
        ))}
      </div>
    </div>
  );
}

function HistogramDisplay({ dataUrl }: { dataUrl: string }) {
  const [data, setData] = useState<HistogramData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    setData(null);
    setError(null);
    getHistogramFromImage(dataUrl)
      .then(setData)
      .catch(err => setError(err.message));
  }, [dataUrl]);
  
  if (error) {
    return <div className="text-center text-destructive text-xs py-2">错误: {error}</div>;
  }
  
  if (!data) {
    return <div className="text-center text-muted-foreground text-xs py-4">计算中...</div>;
  }

  return (
    <div className="space-y-2">
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
      <div className="text-sm font-semibold mb-2">直方图</div>
      <HistogramDisplay dataUrl={dataUrl} />
    </div>
  );
}
