import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Spin } from 'antd';
import App from './App';

// 使用 React.lazy 进行组件的懒加载
const Upload = lazy(() => import('./pages/Upload'));
const ImageManager = lazy(() => import('./pages/ImageManager'));
const Settings = lazy(() => import('./pages/Settings'));

// 一个简单的加载中组件
const PageLoading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
    <Spin size="large" />
  </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Suspense fallback={<PageLoading />}><Upload /></Suspense>,
      },
      {
        path: 'images',
        element: <Suspense fallback={<PageLoading />}><ImageManager /></Suspense>,
      },
      {
        path: 'settings',
        element: <Suspense fallback={<PageLoading />}><Settings /></Suspense>,
      },
    ],
  },
]);

export default router;