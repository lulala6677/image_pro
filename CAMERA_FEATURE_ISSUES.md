# 摄像头拍照功能 - 问题与解决方案记录

## 功能概述

摄像头拍照功能使用 WebRTC API (`navigator.mediaDevices.getUserMedia`) 实现实时预览和拍照，支持：
- 实时摄像头预览
- 拍照获取图像
- 前后摄像头切换
- 多摄像头设备选择
- 智能设备类型识别

---

## 问题与解决方案汇总

### 问题 1: 浏览器兼容性与权限检测

**发现提交:** `da80b17` → `a83c12c`  
**问题描述:** 
- 部分浏览器不支持 WebRTC API
- 缺乏权限检测和清晰的错误提示
- HTTPS 安全连接要求未告知用户

**错误类型与提示:**
| 错误名称 | 原因 | 用户提示 |
|----------|------|----------|
| `NotAllowedError` / `PermissionDeniedError` | 权限被拒绝 | 摄像头权限被拒绝。请在浏览器地址栏左侧点击图标，允许摄像头访问权限后刷新页面重试。 |
| `NotFoundError` / `DevicesNotFoundError` | 未检测到设备 | 未检测到摄像头设备。请确保您的电脑已连接摄像头。 |
| `NotReadableError` / `TrackStartError` | 设备被占用 | 摄像头被其他应用程序占用。请关闭其他使用摄像头的程序后重试。 |
| `OverconstrainedError` | 分辨率不支持 | 摄像头不支持请求的分辨率。正在尝试较低分辨率... |
| `NotSupportedError` | 浏览器不支持 | 浏览器不支持摄像头功能 |

**解决方案:**
```typescript
// 1. 检测浏览器支持
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  setErrorMessage('您的浏览器不支持摄像头功能，请使用现代浏览器（如 Chrome、Firefox、Safari）');
  return;
}

// 2. 检测 HTTPS 连接
const isSecure = window.location.protocol === 'https:' || 
                 window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1';
if (!isSecure) {
  setErrorMessage('摄像头功能需要 HTTPS 安全连接。请确保网站使用 HTTPS 协议访问。');
  return;
}

// 3. 根据错误类型提供具体提示
catch (error: unknown) {
  if (error instanceof Error) {
    if (error.name === 'NotAllowedError') {
      setErrorMessage('摄像头权限被拒绝...');
    } else if (error.name === 'NotFoundError') {
      setErrorMessage('未检测到摄像头设备...');
    }
    // ... 其他错误类型
  }
}
```

---

### 问题 2: 前置摄像头镜像翻转

**发现提交:** `a83c12c`  
**问题描述:** 
- 前置摄像头预览画面是镜像的（左右反转）
- 拍照保存的图片也是镜像的
- 用户体验不佳

**解决方案:**
```typescript
// 拍照时，如果使用前置摄像头，水平翻转后再绘制
const capturePhoto = useCallback(() => {
  if (!videoRef.current || !canvasRef.current) return;
  
  const video = videoRef.current;
  const canvas = canvasRef.current;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 如果是前置摄像头，水平翻转
  if (facingMode === 'user') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  
  ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
  // ... 保存逻辑
}, [facingMode, onImageCapture, stopCamera, onClose]);
```

---

### 问题 3: 多摄像头设备选择

**发现提交:** `294fbf0`  
**问题描述:** 
- 只有一个摄像头时，用户被强制要求选择，体验繁琐
- 多摄像头时用户无法区分是电脑摄像头还是外接摄像头
- 无法切换使用不同摄像头

**解决方案:**
```typescript
// 智能摄像头选择逻辑
const handleSelectCameraMode = useCallback(async () => {
  const cameraList = await getCameraList();
  setCameras(cameraList);

  if (cameraList.length === 0) {
    setErrorMessage('未检测到摄像头设备...');
  } else if (cameraList.length === 1) {
    // 只有一个摄像头，直接使用
    setSelectedCamera(cameraList[0].deviceId);
    setMode('camera');
  } else {
    // 多个摄像头，显示选择界面
    setMode('choose-camera');
  }
}, [getCameraList]);

// 使用指定设备 ID 启动摄像头
const startCamera = useCallback(async (deviceId?: string) => {
  const constraints: MediaStreamConstraints = {
    video: deviceId ? {
      deviceId: { exact: deviceId },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    } : {
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  // ...
}, [selectedCamera]);
```

---

### 问题 4: 摄像头设备类型识别

**发现提交:** `625c03d`  
**问题描述:** 
- 摄像头列表中名称混乱（UUID、默认名称等）
- 无法区分电脑自带摄像头和外接摄像头
- 无法区分手机摄像头应用（虚拟摄像头）

**解决方案:**
```typescript
// 手机品牌关键词列表
const PHONE_BRANDS = [
  'iPhone', 'Samsung', 'OPPO', 'vivo', 'Xiaomi', 'Huawei', 'Honor', 'OnePlus',
  'Realme', 'Redmi', 'Pixel', 'LG', 'Sony', 'Motorola', 'Nokia', 'ZTE',
  'Lenovo', 'Asus', 'HTC', 'BlackBerry', 'Windows 虚拟摄像头', '虚拟摄像头',
  'DroidCam', 'IP Webcam', 'iVCam', 'EpocCam', 'Camo'
];

// 电脑摄像头关键词列表
const PC_CAMERA_KEYWORDS = [
  'Integrated', 'Webcam', 'USB Camera', 'USB2.0', 'USB3.0', 'HD Camera',
  'HD WebCam', 'WebCam', 'Camera', 'FaceTime', 'Built-in', 'Internal'
];

// 根据摄像头名称识别设备类型
function detectDeviceType(label: string): { type: 'phone' | 'pc' | 'unknown'; displayName: string } {
  const lowerLabel = label.toLowerCase();
  
  // 检查是否是手机摄像头
  for (const brand of PHONE_BRANDS) {
    if (lowerLabel.includes(brand.toLowerCase())) {
      return { type: 'phone', displayName: brand };
    }
  }
  
  // 检查是否是电脑摄像头
  for (const keyword of PC_CAMERA_KEYWORDS) {
    if (lowerLabel.includes(keyword.toLowerCase())) {
      return { type: 'pc', displayName: label };
    }
  }
  
  return { type: 'unknown', displayName: label };
}
```

---

### 问题 5: 摄像头设备名称显示

**发现提交:** `a64dfa6` → `8c8b4ca` → `c955385`  
**问题描述:** 
- 首次获取设备列表时，设备标签（label）为空或只有 UUID
- 设备名称无法实时获取，需要先请求权限
- 设备类型识别不准确

**解决方案:**
```typescript
// 获取摄像头列表 - 先请求权限才能获取设备标签
const getCameraList = useCallback(async (): Promise<CameraDevice[]> => {
  try {
    // 先请求一次权限，这样才能获取到设备标签
    const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
    tempStream.getTracks().forEach(track => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices
      .filter(device => device.kind === 'videoinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `摄像头 ${device.deviceId.slice(0, 8)}`,
        kind: device.kind
      }));
    
    return videoDevices;
  } catch (error) {
    console.error('获取摄像头列表失败:', error);
    return [];
  }
}, []);
```

---

### 问题 6: 设备热插拔与刷新

**发现提交:** `e222866`  
**问题描述:** 
- 设备连接/断开后列表不更新
- 用户无法手动刷新获取最新设备信息
- 设备变化时无通知

**解决方案:**
```typescript
// 监听设备变化（设备连接/断开/名称改变）
useEffect(() => {
  if (!open) return;

  const handleDeviceChange = async () => {
    const cameraList = await getCameraList();
    setCameras(cameraList);
  };

  navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
  
  return () => {
    navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
  };
}, [open, getCameraList]);

// 添加刷新按钮
<button
  onClick={async () => {
    setCameras([]);
    const cameraList = await getCameraList();
    setCameras(cameraList);
  }}
  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
  title="刷新设备列表"
>
  <RefreshCw className="h-4 w-4 text-white/70" />
</button>
```

---

### 问题 7: 调试信息不足

**发现提交:** `2628362`  
**问题描述:** 
- 问题排查困难，缺乏诊断信息
- 用户无法判断环境配置是否正确
- 无法区分不同失败阶段

**解决方案:**
```typescript
const [debugInfo, setDebugInfo] = useState<string>('');

const startCamera = useCallback(async () => {
  setDebugInfo('开始检测...');
  
  // 检测各阶段状态
  if (!navigator.mediaDevices) {
    setDebugInfo('navigator.mediaDevices 不存在');
    return;
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const isSecure = protocol === 'https:' || hostname === 'localhost';
  
  setDebugInfo(`协议: ${protocol}, 主机: ${hostname}, 安全: ${isSecure}`);
  
  // 枚举设备
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter(d => d.kind === 'videoinput');
  setDebugInfo(prev => prev + ` | 摄像头设备: ${videoDevices.length} 个`);
  
  // 请求摄像头
  try {
    setDebugInfo(prev => prev + ' | 请求摄像头...');
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    setDebugInfo(prev => prev + ' | 获取成功');
    // ...
  } catch (error) {
    setDebugInfo(prev => prev + ` | 错误: ${error.name} - ${error.message}`);
  }
}, []);
```

---

## 完整代码架构

```
src/components/image-source-dialog.tsx
├── 状态管理
│   ├── mode: 'select' | 'choose-camera' | 'camera'
│   ├── cameras: CameraDevice[]          // 摄像头设备列表
│   ├── selectedCamera: string           // 当前选中的摄像头
│   ├── facingMode: 'user' | 'environment'
│   ├── isStreaming: boolean
│   ├── hasPermission: boolean | null
│   ├── errorMessage: string | null
│   └── debugInfo: string
│
├── 核心函数
│   ├── getCameraList()                 // 获取摄像头列表
│   ├── startCamera(deviceId?)          // 启动摄像头
│   ├── stopCamera()                    // 停止摄像头
│   ├── switchCamera()                  // 切换前后摄像头
│   ├── capturePhoto()                  // 拍照
│   └── handleFileUpload()              // 文件上传
│
├── 设备识别
│   ├── PHONE_BRANDS                    // 手机品牌关键词
│   ├── PC_CAMERA_KEYWORDS              // 电脑摄像头关键词
│   └── detectDeviceType(label)         // 识别设备类型
│
└── UI 组件
    ├── 选择模式界面 (select)
    ├── 摄像头选择界面 (choose-camera)
    └── 摄像头预览界面 (camera)
```

---

## 提交历史

| 提交 | 功能/修复 | 描述 |
|------|-----------|------|
| `da80b17` | feat | 添加拍摄功能，支持摄像头拍照或导入图片 |
| `a83c12c` | fix | 改进错误处理和提示信息 |
| `2628362` | feat | 添加调试信息帮助诊断问题 |
| `294fbf0` | feat | 实现智能摄像头选择功能 |
| `625c03d` | fix | 修复摄像头设备类型识别逻辑 |
| `a64dfa6` | fix | 摄像头列表显示设备真实名称 |
| `8c8b4ca` | docs | 说明摄像头名称实时获取机制 |
| `e222866` | feat | 添加摄像头设备列表刷新功能 |
| `c955385` | docs | 说明蓝牙名称与摄像头名称的区别 |

---

## 技术要点总结

1. **WebRTC API 使用**：`navigator.mediaDevices.getUserMedia()` 是核心 API
2. **权限管理**：需要 HTTPS 或 localhost 环境
3. **设备枚举**：先获取权限才能获取设备标签
4. **错误处理**：根据 `error.name` 区分不同错误类型
5. **设备类型识别**：通过关键词匹配判断设备来源
6. **热插拔监听**：使用 `devicechange` 事件监听设备变化
7. **镜像处理**：前置摄像头需要水平翻转
