'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
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
    };
    img.src = dataUrl;
  });
}

function HistogramChart({ data, color, label }: { data: number[]; color: string; label: string }) {
  const max = useMemo(() => Math.max(...data, 1), [data]);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">像素值分布</span>
      </div>
      <div className="h-32 flex items-end gap-px bg-muted/30 rounded p-2">
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
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span>255</span>
      </div>
    </div>
  );
}

function HistogramDisplay({ dataUrl }: { dataUrl: string }) {
  const [data, setData] = useState<HistogramData | null>(null);
  
  useEffect(() => {
    getHistogramFromImage(dataUrl).then(setData);
  }, [dataUrl]);
  
  if (!data) {
    return <div className="text-center text-muted-foreground text-sm py-4">计算中...</div>;
  }

  return (
    <Tabs defaultValue="gray" className="w-full">
      <TabsList className="grid w-full grid-cols-4 h-8">
        <TabsTrigger value="gray" className="text-xs">灰度</TabsTrigger>
        <TabsTrigger value="r" className="text-xs">R</TabsTrigger>
        <TabsTrigger value="g" className="text-xs">G</TabsTrigger>
        <TabsTrigger value="b" className="text-xs">B</TabsTrigger>
      </TabsList>
      <TabsContent value="gray" className="mt-2">
        <HistogramChart data={data.gray} color="#888888" label="灰度通道" />
      </TabsContent>
      <TabsContent value="r" className="mt-2">
        <HistogramChart data={data.r} color="#ef4444" label="红色通道" />
      </TabsContent>
      <TabsContent value="g" className="mt-2">
        <HistogramChart data={data.g} color="#22c55e" label="绿色通道" />
      </TabsContent>
      <TabsContent value="b" className="mt-2">
        <HistogramChart data={data.b} color="#3b82f6" label="蓝色通道" />
      </TabsContent>
    </Tabs>
  );
}

export function Histogram({ dataUrl }: HistogramProps) {
  if (!dataUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">直方图</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground text-sm py-8">
          上传图片后显示直方图
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">直方图</CardTitle>
      </CardHeader>
      <CardContent>
        <HistogramDisplay dataUrl={dataUrl} />
      </CardContent>
    </Card>
  );
}
