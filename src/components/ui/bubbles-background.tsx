'use client';

import { useEffect, useRef } from 'react';

interface Bubble {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  hue: number;
  saturation: number;
  lightness: number;
}

export function BubblesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let bubbles: Bubble[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // 虹彩色彩范围：橙色(30) -> 黄色(60) -> 青色(180) -> 蓝色(220) -> 紫色(280)
    const rainbowHues = [30, 45, 60, 180, 200, 220, 260, 280];

    const createBubble = (): Bubble => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 100 + 40,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.12 + 0.03,
      hue: rainbowHues[Math.floor(Math.random() * rainbowHues.length)],
      saturation: 80 + Math.random() * 20,
      lightness: 50 + Math.random() * 20,
    });

    const initBubbles = () => {
      bubbles = [];
      const count = Math.floor((canvas.width * canvas.height) / 60000);
      for (let i = 0; i < Math.min(count, 15); i++) {
        bubbles.push(createBubble());
      }
    };

    const drawBubble = (bubble: Bubble) => {
      const gradient = ctx.createRadialGradient(
        bubble.x, bubble.y, 0,
        bubble.x, bubble.y, bubble.size
      );
      
      const color1 = `hsla(${bubble.hue}, ${bubble.saturation}%, ${bubble.lightness}%, ${bubble.opacity})`;
      const color2 = `hsla(${bubble.hue + 30}, ${bubble.saturation - 10}%, ${bubble.lightness - 10}%, ${bubble.opacity * 0.5})`;
      const color3 = `hsla(${bubble.hue}, ${bubble.saturation - 20}%, ${bubble.lightness - 20}%, 0)`;

      gradient.addColorStop(0, color1);
      gradient.addColorStop(0.5, color2);
      gradient.addColorStop(1, color3);

      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // 高光效果
      const highlightGradient = ctx.createRadialGradient(
        bubble.x - bubble.size * 0.3,
        bubble.y - bubble.size * 0.3,
        0,
        bubble.x - bubble.size * 0.3,
        bubble.y - bubble.size * 0.3,
        bubble.size * 0.4
      );
      highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${bubble.opacity * 1.2})`);
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
      ctx.fillStyle = highlightGradient;
      ctx.fill();
    };

    const updateBubble = (bubble: Bubble) => {
      bubble.x += bubble.speedX;
      bubble.y += bubble.speedY;

      // 缓慢变化色相，创造流动的彩虹效果
      bubble.hue += 0.05;
      if (bubble.hue > 280) bubble.hue = 30;

      // 边界检测
      if (bubble.x < -bubble.size) bubble.x = canvas.width + bubble.size;
      if (bubble.x > canvas.width + bubble.size) bubble.x = -bubble.size;
      if (bubble.y < -bubble.size) bubble.y = canvas.height + bubble.size;
      if (bubble.y > canvas.height + bubble.size) bubble.y = -bubble.size;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      bubbles.forEach(bubble => {
        updateBubble(bubble);
        drawBubble(bubble);
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    initBubbles();
    animate();

    window.addEventListener('resize', () => {
      resize();
      initBubbles();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
