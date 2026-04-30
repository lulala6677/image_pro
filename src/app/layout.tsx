import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '数字图像处理实验室',
    template: '%s | 数字图像处理实验室',
  },
  description:
    '一款强大的数字图像处理工具，支持多种图像处理功能。',
  keywords: [
    '图像处理',
    '图片编辑',
    '滤镜',
    '图像增强',
  ],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        {children}
      </body>
    </html>
  );
}
