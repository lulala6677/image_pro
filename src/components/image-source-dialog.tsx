'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, RefreshCw, AlertCircle, Monitor, Smartphone, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface CameraDevice {
  deviceId: string;
  label: string;
  kind: string;
  deviceType: 'phone' | 'pc' | 'unknown';
}

interface ImageSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onImageCapture: (dataUrl: string, width: number, height: number) => void;
}

// 根据摄像头名称识别设备类型
function detectDeviceType(label: string): { type: 'phone' | 'pc' | 'unknown'; displayName: string } {
  const lowerLabel = label.toLowerCase();
  
  // 检查是否是手机摄像头
  for (const brand of PHONE_BRANDS) {
    if (label.toLowerCase().includes(brand.toLowerCase())) {
      // 提取手机品牌名称
      const brandMatch = label.match(new RegExp(brand, 'i'));
      const displayName = brandMatch ? brandMatch[0] : brand;
      return { type: 'phone', displayName };
    }
  }
  
  // 检查是否是电脑摄像头
  for (const keyword of PC_CAMERA_KEYWORDS) {
    if (lowerLabel.includes(keyword.toLowerCase())) {
      return { type: 'pc', displayName: label };
    }
  }
  
  // 默认未知类型
  return { type: 'unknown', displayName: label };
}

export function ImageSourceDialog({ open, onClose, onImageCapture }: ImageSourceDialogProps) {
  const [mode, setMode] = useState<'select' | 'choose-camera' | 'camera'>('select');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 清理摄像头
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setHasPermission(null);
    setErrorMessage(null);
  }, []);

  // 获取摄像头列表
  const getCameraList = useCallback(async (): Promise<CameraDevice[]> => {
    try {
      // 先请求一次权限，这样才能获取到设备标签
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => {
          const { type, displayName } = detectDeviceType(device.label || '');
          return {
            deviceId: device.deviceId,
            label: device.label || `摄像头 ${device.deviceId.slice(0, 8)}`,
            kind: device.kind,
            deviceType: type,
            displayName
          };
        });
      
      // 按设备类型排序：电脑摄像头优先，然后是手机摄像头，最后是未知
      const typeOrder = { 'pc': 0, 'unknown': 1, 'phone': 2 };
      videoDevices.sort((a, b) => typeOrder[a.deviceType] - typeOrder[b.deviceType]);
      
      return videoDevices;
      
      return videoDevices;
    } catch (error) {
      console.error('获取摄像头列表失败:', error);
      return [];
    }
  }, []);

  // 选择拍摄模式时，先检测摄像头
  const handleSelectCameraMode = useCallback(async () => {
    setErrorMessage(null);
    setCameras([]); // 先清空列表，确保重新获取
    
    // 检查是否支持摄像头
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasPermission(false);
      setErrorMessage('您的浏览器不支持摄像头功能，请使用现代浏览器（如 Chrome、Firefox、Safari）');
      setMode('camera');
      return;
    }

    // 获取摄像头列表（每次都重新获取最新信息）
    const cameraList = await getCameraList();
    setCameras(cameraList);

    if (cameraList.length === 0) {
      setHasPermission(false);
      setErrorMessage('未检测到摄像头设备。请确保您的电脑已连接摄像头。');
      setMode('camera');
    } else if (cameraList.length === 1) {
      // 只有一个摄像头，直接使用
      setSelectedCamera(cameraList[0].deviceId);
      setMode('camera');
    } else {
      // 多个摄像头，显示选择界面
      setMode('choose-camera');
    }
  }, [getCameraList]);

  // 启动摄像头
  const startCamera = useCallback(async (deviceId?: string) => {
    setErrorMessage(null);
    setHasPermission(null);

    const targetDeviceId = deviceId || selectedCamera;
    if (!targetDeviceId) {
      setHasPermission(false);
      setErrorMessage('请选择要使用的摄像头');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: targetDeviceId ? {
          deviceId: { exact: targetDeviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsStreaming(true);
            setHasPermission(true);
          }).catch(err => {
            console.error('视频播放失败:', err);
            setHasPermission(false);
            setErrorMessage('视频播放失败，请重试');
          });
        };
        videoRef.current.onerror = () => {
          setHasPermission(false);
          setErrorMessage('视频加载失败');
        };
      }
    } catch (error: unknown) {
      console.error('摄像头访问失败:', error);
      setHasPermission(false);

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setErrorMessage('摄像头权限被拒绝。请在浏览器地址栏左侧点击图标，允许摄像头访问权限后刷新页面重试。');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setErrorMessage('未检测到摄像头设备。请确保您的电脑已连接摄像头。');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          setErrorMessage('摄像头被其他应用程序占用。请关闭其他使用摄像头的程序后重试。');
        } else if (error.name === 'OverconstrainedError') {
          // 尝试使用默认设置
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.onloadedmetadata = () => {
                videoRef.current?.play();
                setIsStreaming(true);
                setHasPermission(true);
              };
            }
          } catch {
            setErrorMessage('无法启动摄像头');
          }
        } else {
          setErrorMessage(`摄像头访问失败: ${error.message}`);
        }
      } else {
        setErrorMessage('摄像头访问失败，请检查设备连接');
      }
    }
  }, [selectedCamera]);

  // 切换摄像头
  const switchCamera = useCallback(async () => {
    stopCamera();
    
    // 找到当前摄像头的索引，切换到下一个
    const currentIndex = cameras.findIndex(c => c.deviceId === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    
    setSelectedCamera(nextCamera.deviceId);
  }, [cameras, selectedCamera, stopCamera]);

  // 拍照
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !isStreaming) return;
    if (videoRef.current.videoWidth === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onImageCapture(dataUrl, video.videoWidth, video.videoHeight);

    stopCamera();
    setMode('select');
    onClose();
  }, [isStreaming, onImageCapture, stopCamera, onClose]);

  // 处理文件上传
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        onImageCapture(dataUrl, img.width, img.height);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    onClose();
  }, [onImageCapture, onClose]);

  // 摄像头启动状态
  const cameraStartedRef = useRef(false);
  
  // 监听 mode 变化启动摄像头
  useEffect(() => {
    if (mode === 'camera' && selectedCamera && !cameraStartedRef.current) {
      cameraStartedRef.current = true;
      // 使用 requestAnimationFrame 延迟调用，避免在 effect 中直接调用 setState
      const timer = requestAnimationFrame(() => {
        startCamera(selectedCamera);
      });
      return () => cancelAnimationFrame(timer);
    } else if (mode !== 'camera') {
      cameraStartedRef.current = false;
    }
  }, [mode, selectedCamera, startCamera]);

  // 监听设备变化（设备连接/断开/名称改变）
  useEffect(() => {
    if (!open) return;

    const handleDeviceChange = async () => {
      // 设备变化时重新获取列表
      const cameraList = await getCameraList();
      setCameras(cameraList);
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [open, getCameraList]);

  // 对话框关闭时清理
  useEffect(() => {
    if (!open) {
      // 使用 requestAnimationFrame 延迟调用
      const timer = requestAnimationFrame(() => {
        stopCamera();
        setMode('select');
        setCameras([]);
        setSelectedCamera(null);
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [open, stopCamera]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mx-4 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {mode === 'select' ? (
          /* 选择模式 */
          <div className="p-8">
            <h3 className="text-xl font-semibold text-white text-center mb-6">选择图片来源</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* 拍摄按钮 */}
              <button
                onClick={handleSelectCameraMode}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-gradient-to-br from-orange-400/40 via-amber-300/30 to-orange-500/40 border border-white/20 hover:border-white/40 transition-all group"
              >
                <div className="p-4 rounded-full bg-gradient-to-br from-orange-400/60 to-orange-500/60 group-hover:from-orange-400 group-hover:to-orange-500 transition-all">
                  <Camera className="h-8 w-8 text-white" />
                </div>
                <span className="text-white font-medium">拍摄照片</span>
              </button>

              {/* 导入按钮 */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-gradient-to-br from-cyan-400/40 via-blue-300/30 to-cyan-500/40 border border-white/20 hover:border-white/40 transition-all group"
              >
                <div className="p-4 rounded-full bg-gradient-to-br from-cyan-400/60 to-cyan-500/60 group-hover:from-cyan-400 group-hover:to-cyan-500 transition-all">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <span className="text-white font-medium">导入图片</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        ) : mode === 'choose-camera' ? (
          /* 选择摄像头 */
          <div className="p-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-white">选择摄像头</h3>
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
            </div>
            <p className="text-white/50 text-sm text-center mb-6">检测到 {cameras.length} 个摄像头设备</p>
            <div className="space-y-3">
              {cameras.map((camera) => {
                // 根据设备类型确定图标和描述
                const isPcCamera = camera.deviceType === 'pc';
                const isPhoneCamera = camera.deviceType === 'phone';
                
                return (
                  <button
                    key={camera.deviceId}
                    onClick={() => {
                      setSelectedCamera(camera.deviceId);
                      setMode('camera');
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border transition-all",
                      "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-full",
                      isPcCamera 
                        ? "bg-gradient-to-br from-cyan-400/50 to-blue-500/50"
                        : isPhoneCamera
                          ? "bg-gradient-to-br from-orange-400/50 to-orange-500/50"
                          : "bg-gradient-to-br from-gray-400/50 to-gray-500/50"
                    )}>
                      {isPcCamera ? (
                        <Monitor className="h-6 w-6 text-white" />
                      ) : isPhoneCamera ? (
                        <Smartphone className="h-6 w-6 text-white" />
                      ) : (
                        <Video className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{camera.label}</p>
                      <p className="text-white/40 text-xs">
                        {isPcCamera ? '电脑摄像头' : isPhoneCamera ? '手机摄像头' : '外接摄像头'}
                      </p>
                    </div>
                    <Camera className="h-5 w-5 text-white/40" />
                  </button>
                );
              })}
            </div>
            
            {/* 返回按钮 */}
            <button
              onClick={() => setMode('select')}
              className="w-full mt-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all"
            >
              返回上一步
            </button>
          </div>
        ) : (
          /* 摄像头模式 */
          <div className="relative">
            {/* 视频预览 */}
            <div
              className="relative bg-black"
              style={{ aspectRatio: '4/3' }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover",
                  !isStreaming && "hidden"
                )}
              />

              {/* 加载中 / 无权限提示 */}
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {hasPermission === false ? (
                    <div className="text-center p-6 max-w-md">
                      <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                      <p className="text-white/90 font-medium mb-2">无法访问摄像头</p>
                      <p className="text-white/60 text-sm leading-relaxed">{errorMessage || '请检查浏览器权限设置'}</p>
                      <div className="flex gap-2 justify-center mt-4">
                        <button
                          onClick={() => startCamera(selectedCamera || undefined)}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 text-sm transition-colors"
                        >
                          重试
                        </button>
                        <button
                          onClick={() => setMode('select')}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 text-sm transition-colors"
                        >
                          返回
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-white/20 border-t-white/80 rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-white/70">正在启动摄像头...</p>
                      <p className="text-white/40 text-xs mt-2">请允许浏览器访问摄像头</p>
                    </div>
                  )}
                </div>
              )}

              {/* 当前摄像头名称 */}
              {isStreaming && cameras.length > 1 && (
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10">
                  <p className="text-white/80 text-xs">
                    {cameras.find(c => c.deviceId === selectedCamera)?.label || '摄像头'}
                  </p>
                </div>
              )}

              {/* 控制按钮 */}
              {isStreaming && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                  {/* 切换摄像头 - 只有多摄像头时显示 */}
                  {cameras.length > 1 && (
                    <button
                      onClick={switchCamera}
                      className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                      title="切换摄像头"
                    >
                      <RefreshCw className="h-5 w-5 text-white" />
                    </button>
                  )}

                  {/* 拍照按钮 */}
                  <button
                    onClick={capturePhoto}
                    className="p-4 rounded-full bg-white hover:bg-white/90 transition-colors shadow-lg"
                    title="拍照"
                  >
                    <div className="w-8 h-8 rounded-full border-4 border-gray-800" />
                  </button>

                  {/* 取消 */}
                  <button
                    onClick={() => {
                      stopCamera();
                      if (cameras.length > 1) {
                        setMode('choose-camera');
                      } else {
                        setMode('select');
                      }
                    }}
                    className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                    title="取消"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 隐藏的 canvas 用于拍照 */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
