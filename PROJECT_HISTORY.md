# 数字图像处理平台 ImagePro - 项目版本历史详细记录

## 项目概述

基于 Next.js 16 的数字图像处理平台，支持多种图像处理操作，包括几何变换、灰度变换、噪声处理、滤波、边缘检测、颜色调整、图像分割等，同时具备选区工具和 AI 智能处理能力。

**技术栈：**
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui
- coze-coding-dev-sdk (AI 图像生成)

---

## 版本历史详细记录

### v1.0 - 项目初始化
**提交:** `a0dce4a`  
**日期:** 2026-03-21  
**功能:** 实现功能全面的数字图像处理平台 ImagePro

---

### v1.1 - UI 界面优化
**提交:** `60331d0` → `647e31f`  
**日期:** 2026-03-22 ~ 2026-03-23  

#### 问题 1: react-resizable-panels 兼容性问题

**问题描述:**
- react-resizable-panels 依赖导致布局异常
- 中间区域覆盖整个页面，左右面板被遮挡
- 拖拽调整功能无法正常工作

**技术分析:**
```
原方案: react-resizable-panels
├── PanelGroup
│   ├── Panel (left)
│   ├── PanelResizeHandle
│   └── Panel (right)
└── 问题: 第三方库与 Next.js App Router 存在兼容性问题
```

**解决方案: 自定义 PanelLayout 组件**

创建 `src/components/ui/panel-layout.tsx`，使用原生 CSS flexbox 实现：

```tsx
// 核心实现：flexbox 三栏布局 + 鼠标拖拽
export function PanelLayout({ leftPanel, centerPanel, rightPanel }) {
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(260);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  
  // 鼠标移动处理 - 实时更新面板宽度
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
  }, [isDraggingLeft, isDraggingRight]);
  
  // 全局事件监听 - 拖拽时添加，结束时移除
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
    <div className="flex h-full w-full">
      {/* 左侧面板 - 固定宽度可调 */}
      <div style={{ width: leftWidth }}>{leftPanel}</div>
      
      {/* 左侧拖拽手柄 - 悬浮时显示渐变 */}
      <div onMouseDown={() => setIsDraggingLeft(true)} 
           className="hover:bg-gradient-to-b hover:from-orange-500/50 hover:via-yellow-500/30 hover:to-cyan-500/50">
      </div>
      
      {/* 中间面板 - 自适应填充 */}
      <div className="flex-1 min-w-0">{centerPanel}</div>
      
      {/* 右侧拖拽手柄 */}
      <div onMouseDown={() => setIsDraggingRight(true)} />
      
      {/* 右侧面板 */}
      <div style={{ width: rightWidth }}>{rightPanel}</div>
    </div>
  );
}
```

**技术要点:**
1. 使用 `useRef` 获取容器引用，计算鼠标相对位置
2. 使用 `useEffect` 动态添加/移除全局鼠标事件
3. 限制最小/最大宽度，防止面板过窄或过宽
4. 拖拽时设置 `userSelect: none` 防止选中文本

---

### v1.2 - 选区工具功能
**提交:** `97eaabc` → `2e20ef9` → `4256e7b`  
**日期:** 2026-03-24 ~ 2026-03-25  

#### 新增功能

##### 1. 魔棒工具 (Magic Wand)

**技术实现 - 洪水填充算法:**

```typescript
export function magicWandSelect(
  pixelData: ImageData,
  startX: number,
  startY: number,
  params: WandToolParams
): SelectionData {
  const { width, height, data } = pixelData;
  const { tolerance, contiguous, invert } = params;
  
  // 创建选区蒙版 - 二维布尔数组
  const mask: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));
  
  // 获取起始点颜色
  const startIdx = (startY * width + startX) * 4;
  const startR = data[startIdx];
  const startG = data[startIdx + 1];
  const startB = data[startIdx + 2];
  
  // 计算颜色距离（欧几里得距离）
  const colorDistance = (idx: number): number => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    return Math.sqrt(
      (r - startR) ** 2 +
      (g - startG) ** 2 +
      (b - startB) ** 2
    );
  };
  
  if (contiguous) {
    // 连续选择 - BFS 洪水填充
    const visited: boolean[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false));
    const queue: Point[] = [{ x: startX, y: startY }];
    visited[startY][startX] = true;
    
    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const idx = (y * width + x) * 4;
      
      if (colorDistance(idx) <= tolerance) {
        mask[y][x] = true;
        
        // 四个方向扩散
        for (const { dx, dy } of [
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny][nx]) {
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }
  } else {
    // 非连续选择 - 全图扫描
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (colorDistance(idx) <= tolerance) {
          mask[y][x] = true;
        }
      }
    }
  }
  
  return { mask, bounds: calculateBounds(mask, width, height), toolType: 'wand' };
}
```

##### 2. 套索工具 (Lasso)

**技术实现 - 射线法多边形选择:**

```typescript
export function lassoSelect(
  width: number,
  height: number,
  points: Point[],
  params: LassoToolParams
): SelectionData {
  const mask: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));
  
  // 射线法判断点是否在多边形内
  const pointInPolygon = (px: number, py: number): boolean => {
    let inside = false;
    const n = points.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      
      // 射线与边相交
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    return inside;
  };
  
  // 扫描线算法填充多边形
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pointInPolygon(x, y)) {
        mask[y][x] = true;
      }
    }
  }
  
  return { mask, bounds: calculateBounds(mask, width, height), toolType: 'lasso' };
}
```

#### 问题 2: 选区处理不生效

**问题描述:**
- 应用选区后图片没有变化
- 选区内的像素没有被正确处理

**根因分析:**
1. `applyOperation` 依赖数组中缺少 `selection`
2. mask 数组初始化方式在某些场景下有问题

**修复方案:**

```typescript
// 修复 1: 添加 selection 到依赖数组
useEffect(() => {
  if (!currentImage || !processedImage) return;
  
  // ... 处理逻辑
}, [currentImage, processedImage, selection]); // 添加 selection

// 修复 2: 增强选区应用函数
export function applySelectionMask(
  originalData: ImageData,
  processedData: ImageData,
  selection: SelectionData,
  width: number,
  height: number
): ImageData {
  if (!selection || !selection.mask || selection.bounds.width === 0) {
    return processedData;
  }
  
  const result = new ImageData(width, height);
  const { mask } = selection;
  
  // 尺寸匹配检查
  if (mask.length !== height || (mask[0] && mask[0].length !== width)) {
    console.warn('选区 mask 尺寸不匹配');
    return processedData;
  }
  
  let selectedCount = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const isSelected = mask[y] && mask[y][x];
      
      if (isSelected) {
        selectedCount++;
        // 选区内使用处理后的像素
        result.data[idx] = processedData.data[idx];
        result.data[idx + 1] = processedData.data[idx + 1];
        result.data[idx + 2] = processedData.data[idx + 2];
        result.data[idx + 3] = processedData.data[idx + 3];
      } else {
        // 选区外保留原图
        result.data[idx] = originalData.data[idx];
        result.data[idx + 1] = originalData.data[idx + 1];
        result.data[idx + 2] = originalData.data[idx + 2];
        result.data[idx + 3] = originalData.data[idx + 3];
      }
    }
  }
  
  console.log('选区应用完成:', { selectedCount, totalPixels: width * height });
  return result;
}
```

---

### v1.3 - 处理动画与撤销功能
**提交:** `e91d41b` → `b7589f8` → `c5caef5` → `0166368`  
**日期:** 2026-03-26  

#### 新增功能

##### 1. 撤销功能

**技术实现:**

```typescript
// 状态定义
interface HistoryEntry {
  id: string;
  operation: string;
  params: Record<string, unknown>;
  dataUrl: string;
  timestamp: number;
}

const MAX_HISTORY = 50; // 最多保留50步

// 撤销逻辑
const handleUndo = useCallback(() => {
  if (historyIndex > 0) {
    const prevEntry = history[historyIndex - 1];
    setProcessedImage({
      id: prevEntry.id,
      dataUrl: prevEntry.dataUrl,
      width: prevEntry.width,
      height: prevEntry.height,
    });
    setHistoryIndex(historyIndex - 1);
  }
}, [historyIndex, history]);

// 添加历史记录
const addToHistory = (entry: HistoryEntry) => {
  const newHistory = history.slice(0, historyIndex + 1);
  newHistory.push(entry);
  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift();
  }
  setHistory(newHistory);
  setHistoryIndex(newHistory.length - 1);
};
```

##### 2. 处理动画效果

**技术实现 - CSS 动画:**

```css
/* globals.css - 虹彩模糊效果 */
@keyframes rainbow-blur {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.animate-rainbow-blur {
  animation: rainbow-blur 3s ease infinite;
}

/* 揭示动画 - 从左到右扫过 */
@keyframes reveal {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-reveal {
  animation: reveal 0.8s ease-out forwards;
}
```

**React 组件实现:**

```tsx
{isProcessing && (
  <div className="absolute inset-0 rounded-2xl overflow-hidden">
    {/* 毛玻璃背景 */}
    <div className="absolute inset-0 backdrop-blur-md bg-black/20" />
    
    {/* 虹彩渐变模糊层 */}
    <div 
      className="absolute inset-0 animate-rainbow-blur"
      style={{
        background: 'linear-gradient(135deg, rgba(251,146,60,0.3) 0%, rgba(250,204,21,0.3) 25%, rgba(34,211,238,0.3) 50%, rgba(168,85,247,0.3) 75%, rgba(251,146,60,0.3) 100%)',
      }}
    />
    
    {/* 发光脉冲效果 */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-yellow-400 to-cyan-400 blur-2xl opacity-70 animate-pulse scale-150" />
        <div className="relative px-8 py-4 bg-black/50 backdrop-blur-sm rounded-2xl border border-white/20">
          <span className="text-lg font-bold bg-gradient-to-r from-orange-400 via-yellow-300 to-cyan-400 bg-clip-text text-transparent">
            处理中
          </span>
        </div>
      </div>
    </div>
  </div>
)}
```

#### 问题 3: 连续操作 ID 冲突

**问题描述:**
- 连续点击相同操作时，动画效果异常
- React key 冲突导致渲染问题

**根因:**
- 相同操作的 ID 相同，导致动画冲突

**修复方案 - 生成唯一 ID:**

```typescript
// 生成唯一ID
const generateId = () => `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 更新处理后的图像 - 生成新的唯一ID避免冲突
const newId = generateId();
const newProcessedImage: ProcessedImage = {
  id: newId,  // 使用新ID
  dataUrl: result.dataUrl,
  width: result.width,
  height: result.height
};

// 历史记录也使用新ID
const historyEntry: HistoryEntry = {
  id: newId,
  operation: operation,
  params: params,
  dataUrl: result.dataUrl,
  timestamp: Date.now()
};
```

---

### v1.4 - AI 内容填充
**提交:** `26e1a27` → `21bb201` → `a7608ad` → `48d9912` → `e7d0750`  
**日期:** 2026-03-27 ~ 2026-03-28  

#### 问题 4: 内容填充选区定位问题

**问题描述:**
- 填充内容与选区位置不匹配
- AI 生成的填充区域偏移

**根因:**
- 选区 bounds 计算正确，但应用到 AI 处理时坐标转换错误

**修复方案:**

```typescript
// 修复选区定位 - 提取选区内容时正确处理坐标
async function extractSelectionForFill(
  imageDataUrl: string,
  selection: SelectionData,
  width: number,
  height: number
): Promise<{ extractedData: string; offsetX: number; offsetY: number }> {
  const img = await loadImage(imageDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // 先绘制原图
  ctx.drawImage(img, 0, 0);
  
  // 获取边界
  const { bounds } = selection;
  const { x: offsetX, y: offsetY } = bounds;
  
  // 获取边界内的选区蒙版
  const { mask } = selection;
  
  // 清空画布，重新绘制只有选区的内容
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0);
  
  // 使用 destination-in 模式，只保留选区内容
  ctx.globalCompositeOperation = 'destination-in';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y] && mask[y][x]) {
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  
  return {
    extractedData: canvas.toDataURL('image/png'),
    offsetX,
    offsetY
  };
}
```

#### 问题 5: 内容填充跨域问题

**问题描述:**
- AI API 调用时遇到跨域限制
- 直接发送图片 URL 被 CORS 阻止

**修复方案 - 服务端代理:**

```typescript
// 服务端 API 路由处理跨域
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, prompt, maskUrl } = body;
    
    // 下载图片（服务端不受 CORS 限制）
    const imageResponse = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      headers: { 'Accept': 'image/*' }
    });
    
    // 转换为 base64
    const imageBase64 = Buffer.from(imageResponse.data).toString('base64');
    const imageDataUrl = `data:${imageResponse.headers['content-type']};base64,${imageBase64}`;
    
    // 调用 AI 服务
    const response = await client.generate({
      prompt,
      image: imageDataUrl,
      mask: maskUrl,
      size: '2K'
    });
    
    return NextResponse.json({ success: true, imageUrl: response.imageUrl });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

### v1.5 - Canvas + AI 扩图功能
**提交:** `be12e53` → `94a795d` → `a557267`  
**日期:** 2026-03-29 ~ 2026-03-31  

#### 新功能: Canvas + AI 填充扩图

**技术架构:**

```
┌─────────────────────────────────────────────────────────────┐
│                    扩图处理流程                               │
├─────────────────────────────────────────────────────────────┤
│  1. 下载原图 (axios)                                         │
│           ↓                                                  │
│  2. 获取原图尺寸 (Sharp)                                     │
│           ↓                                                  │
│  3. 计算新画布尺寸                                            │
│     newWidth = origWidth + left + right                      │
│     newHeight = origHeight + top + bottom                    │
│           ↓                                                  │
│  4. 创建扩展画布 (Sharp)                                      │
│     - 填充白色背景                                            │
│     - 将原图放置在中心位置                                    │
│           ↓                                                  │
│  5. AI 填充扩展区域                                          │
│     - 使用 Outpainting prompt                                │
│     - 强调保持原图内容不变                                    │
│           ↓                                                  │
│  6. 返回扩展后的图片                                          │
└─────────────────────────────────────────────────────────────┘
```

**核心代码实现:**

```typescript
export async function expandImage(
  imageUrl: string,
  expandConfig: {
    expandLeft: number;
    expandRight: number;
    expandTop: number;
    expandBottom: number;
  }
) {
  // 1. 下载原图
  const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const originalImageBuffer = Buffer.from(imageResponse.data);
  
  // 2. 获取原图尺寸
  const { width: origWidth, height: origHeight } = await getImageDimensions(originalImageBuffer);
  
  // 3. 计算新画布尺寸
  const newWidth = origWidth + expandConfig.expandLeft + expandConfig.expandRight;
  const newHeight = origHeight + expandConfig.expandTop + expandConfig.expandBottom;
  
  // 4. 使用 Sharp 创建扩展画布
  const expandedImageBuffer = await sharp({
    create: {
      width: newWidth,
      height: newHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 } // 白色背景
    }
  })
  .composite([{
    input: originalImageBuffer,
    left: expandConfig.expandLeft,
    top: expandConfig.expandTop
  }])
  .png()
  .toBuffer();
  
  // 5. 调用 AI 填充
  const expandedBase64 = expandedImageBuffer.toString('base64');
  const expandedDataUrl = `data:image/png;base64,${expandedBase64}`;
  
  const expandPrompt = 
    `Outpainting: Seamlessly extend this image at the edges. 
     CRITICAL: 
     1. The CENTER of the image (original content) must remain EXACTLY the same
     2. Only generate new content at the EDGES
     3. New content must match the style, lighting, colors of the original`;
  
  const response = await client.generate({
    prompt: expandPrompt,
    image: expandedDataUrl,
    size: `${newWidth}x${newHeight}`,
  });
  
  return {
    imageUrl: response.imageUrl,
    originalWidth: origWidth,
    originalHeight: origHeight,
    newWidth,
    newHeight
  };
}
```

---

### v1.6 - AI 工具面板重构
**提交:** `2b6b1aa` → `194e516` → `2a9167b`  
**日期:** 2026-04-01 ~ 2026-04-02  

**改进内容:**
- 重新设计 AI 工具面板 UI 布局
- 优化面板字体颜色可读性（从深色改为浅色）
- 与基础处理风格保持一致

---

### v1.7 - 对比功能增强
**提交:** `cc163f5` → `bf69d04`  
**日期:** 2026-04-03  

#### 新增功能: 按住对比

**技术实现:**

```tsx
// 按住对比模式
const [isHoldingCompare, setIsHoldingCompare] = useState(false);

<div
  className="relative"
  onMouseDown={() => setIsHoldingCompare(true)}
  onMouseUp={() => setIsHoldingCompare(false)}
  onMouseLeave={() => setIsHoldingCompare(false)}
>
  {/* 处理后的图像 */}
  <img src={processedImage.dataUrl} className="w-full h-full object-contain" />
  
  {/* 按住时显示原图 */}
  {isHoldingCompare && (
    <div className="absolute inset-0">
      <img 
        src={currentImage.dataUrl} 
        className="w-full h-full object-contain"
      />
    </div>
  )}
</div>

// 快捷键支持
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      handleUndo();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleUndo]);
```

---

### v1.8 - 像素检查器
**提交:** `c20a9c1`  
**日期:** 2026-04-16  

#### 新功能: 800% 像素检查器

**技术实现:**

```typescript
export function PixelInspector({ imageDataUrl, imageWidth, imageHeight, zoom, containerRef }) {
  const [hoverPixel, setHoverPixel] = useState<PixelInfo | null>(null);
  const [pixelData, setPixelData] = useState<ImageData | null>(null);
  
  // 缩放 >= 400% 时显示检查器
  const showInspector = zoom >= 400;
  
  // 加载像素数据
  useEffect(() => {
    if (!imageDataUrl || !showInspector) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, imageWidth, imageHeight);
      setPixelData(data);
    };
    img.src = imageDataUrl;
  }, [imageDataUrl, imageWidth, imageHeight, showInspector]);
  
  // 计算鼠标位置的像素信息
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!showInspector || !pixelData || !containerRef.current) return;
    
    const imgElement = containerRef.current.querySelector('img');
    if (!imgElement) return;
    
    const rect = imgElement.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    
    // 转换为图像坐标
    const x = Math.floor((relX / rect.width) * imageWidth);
    const y = Math.floor((relY / rect.height) * imageHeight);
    
    // 边界检查
    if (x < 0 || x >= imageWidth || y < 0 || y >= imageHeight) {
      setHoverPixel(null);
      return;
    }
    
    // 获取像素颜色
    const pixelIndex = (y * pixelData.width + x) * 4;
    const r = pixelData.data[pixelIndex];
    const g = pixelData.data[pixelIndex + 1];
    const b = pixelData.data[pixelIndex + 2];
    const grayscale = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    
    setHoverPixel({ x, y, r, g, b, grayscale });
  }, [showInspector, pixelData, imageWidth, imageHeight, containerRef]);
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4">
      {hoverPixel && (
        <div className="space-y-1 text-sm">
          <div>坐标: ({hoverPixel.x}, {hoverPixel.y})</div>
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded border border-white/30"
              style={{ backgroundColor: `rgb(${r},${g},${b})` }}
            />
            <span>R: {hoverPixel.r} G: {hoverPixel.g} B: {hoverPixel.b}</span>
          </div>
          <div>灰度值: {hoverPixel.grayscale}</div>
        </div>
      )}
    </div>
  );
}
```

---

### v1.9 - 摄像头集成
**提交:** (集成到主分支)  
**日期:** 2026-04-17  

#### 新功能: 摄像头拍照

**技术实现:**

```typescript
export function ImageSourceDialog({ onSelect }: { onSelect: (url: string) => void }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // 获取可用摄像头设备
  useEffect(() => {
    async function getDevices() {
      try {
        // 请求摄像头权限
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop());
        
        // 获取设备列表
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
        
        if (videoDevices.length > 0) {
          setSelectedDevice(videoDevices[0].deviceId);
        }
      } catch (err) {
        setError('无法访问摄像头');
      }
    }
    getDevices();
  }, []);
  
  // 启动摄像头
  useEffect(() => {
    if (!selectedDevice) return;
    
    async function startCamera() {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedDevice }
        });
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (err) {
        setError('启动摄像头失败');
      }
    }
    startCamera();
    
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [selectedDevice]);
  
  // 拍照
  const takePhoto = () => {
    if (!videoRef.current || !stream) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/png');
    onSelect(dataUrl);
  };
  
  return (
    <Dialog open onOpenChange={...}>
      {/* 摄像头选择下拉框 */}
      {devices.length > 1 && (
        <select 
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
        >
          {devices.map(d => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `摄像头 ${devices.indexOf(d) + 1}`}
            </option>
          ))}
        </select>
      )}
      
      {/* 视频预览 */}
      <video 
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full rounded-lg"
      />
      
      {/* 拍照按钮 */}
      <button onClick={takePhoto}>拍照</button>
    </Dialog>
  );
}
```

---

### v1.10 - 图片下载与对比修复
**提交:** `51f0aab` → `e352c50`  
**日期:** 2026-04-18  

#### 问题 6: AI 处理后无法对比

**问题描述:**
- 使用 AI 功能处理图片后，对比视图蓝屏
- 图像加载失败

**根因分析:**
- AI 生成的图片可能是透明背景
- 对比视图未正确处理透明区域
- 缺少统一的图片加载工具

**修复方案 - 统一图片加载工具:**

创建 `src/lib/image-processing/utils.ts`:

```typescript
/**
 * 创建带有图像的 Canvas，确保有白色背景
 * 解决透明区域导致的蓝屏/显示异常问题
 */
export async function createCanvasWithImage(
  imageDataUrl: string,
  width?: number,
  height?: number
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width || img.width;
      canvas.height = height || img.height;
      
      const ctx = canvas.getContext('2d')!;
      
      // 关键：填充白色背景防止透明区域异常
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 绘制图像（居中或平铺）
      if (width && height) {
        ctx.drawImage(img, 0, 0, width, height);
      } else {
        ctx.drawImage(img, 0, 0);
      }
      
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
}

/**
 * 统一获取图片数据 URL，确保有背景色
 */
export async function getImageDataUrl(
  imageDataUrl: string,
  width?: number,
  height?: number
): Promise<string> {
  const canvas = await createCanvasWithImage(imageDataUrl, width, height);
  return canvas.toDataURL('image/png');
}
```

**应用到对比视图:**

```tsx
// 对比视图组件
export function CompareView({ originalUrl, processedUrl }) {
  const [processedWithBg, setProcessedWithBg] = useState<string>(processedUrl);
  
  useEffect(() => {
    // 确保处理后的图片有背景
    getImageDataUrl(processedUrl).then(url => {
      setProcessedWithBg(url);
    });
  }, [processedUrl]);
  
  return (
    <div className="relative">
      <img src={processedWithBg} className="w-full" />
      {/* 其他对比逻辑 */}
    </div>
  );
}
```

#### 问题 7: 跨域下载失败

**问题描述:**
- 某些场景下图片下载失败
- 直接使用 `<a>` 标签的 download 属性在跨域时无效

**修复方案 - blob 方式下载:**

```typescript
export async function downloadImage(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 释放 blob URL
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    // 如果 fetch 失败，回退到直接打开
    window.open(url, '_blank');
  }
}
```

---

## 核心技术问题与解决方案汇总

| # | 问题 | 提交 | 解决方案 | 技术要点 |
|---|------|------|----------|----------|
| 1 | react-resizable-panels 兼容性问题 | 647e31f | 自定义 PanelLayout 组件 | flexbox + useEffect 全局事件 + userSelect 控制 |
| 2 | 选区处理不生效 | 4256e7b | 修复 mask 初始化 + 添加依赖 | BFS 洪水填充 + 射线法多边形 + 尺寸匹配检查 |
| 3 | 连续操作 ID 冲突 | 0166368 | 生成唯一 ID | `Date.now() + Math.random()` 组合 |
| 4 | 内容填充选区定位错误 | 26e1a27 | 修复坐标映射 | 蒙版正确映射到原图坐标系统 |
| 5 | 内容填充跨域问题 | a7608ad | 服务端代理 | axios 下载 + base64 转换 |
| 6 | 扩图边界不自然 | a557267 | Sharp 扩展算法 | composite 叠加 + AI outpainting |
| 7 | AI 处理后对比蓝屏 | 51f0aab | 统一图片加载工具 | 白色背景填充 + getImageDataUrl |
| 8 | 跨域下载失败 | e352c50 | blob 方式下载 | fetch + createObjectURL |

---

## 关键算法说明

### 1. 洪水填充算法 (Flood Fill)
用于魔棒工具的连续选择模式，通过 BFS 从种子点向四周扩散。

### 2. 射线法 (Ray Casting)
用于套索工具的多边形选择，通过统计射线与多边形边相交的次数判断点是否在多边形内。

### 3. 蒙版合成 (Mask Compositing)
用于选区应用，使用 `destination-in` 模式实现蒙版裁剪。

### 4. Canvas 坐标变换
用于图片处理，确保选区坐标正确映射到图像坐标系统。

---

## 总结

本项目从 v1.0 发展到 v1.10，每个版本都经历了：
1. **问题发现** - 通过测试和用户反馈识别问题
2. **根因分析** - 深入理解问题产生的技术原因
3. **方案设计** - 设计具体的技术实现方案
4. **代码实现** - 编写高质量的代码
5. **测试验证** - 确保修复有效且无副作用

所有技术改进都遵循：
- **渐进式增强** - 小步快跑，快速迭代
- **问题驱动** - 基于实际问题而非理论优化
- **代码质量** - 注重可读性和可维护性
