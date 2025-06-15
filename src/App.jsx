import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu, Typography, ConfigProvider, theme, Button, Dropdown, Space } from 'antd'
import { UploadOutlined, PictureOutlined, SettingOutlined, MenuOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons'
import { useSync } from './contexts/SyncContext'
import { useTheme } from './contexts/ThemeContext'
import './App.css'

const { Header, Content, Footer } = Layout
const { Title } = Typography

function App() {
  const location = useLocation()
  const navigate = useNavigate();
  const { theme: currentTheme, toggleTheme } = useTheme();
  const { isInitialized, initializeSync } = useSync()

  // 自动同步逻辑
  useEffect(() => {
    const settingsStr = localStorage.getItem('github-settings');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      const token = import.meta.env.VITE_GITHUB_TOKEN;

      if (settings.enableSync && token && !isInitialized) {
        console.log('App.jsx: 检测到已启用云同步，将在应用加载时自动同步。');
        initializeSync(token);
      }
    }
  }, [isInitialized, initializeSync]);

  const menuItems = [
    {
      key: '/images',
      icon: <PictureOutlined />,
      label: '图片管理',
      onClick: () => navigate('/images')
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings')
    },
  ];

  const menu = (
    <Menu items={menuItems} />
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          colorBgContainer: 'var(--component-background)',
          colorBorder: 'var(--border-color)',
        },
        components: {
          Layout: {
            headerBg: 'transparent',
            bodyBg: 'transparent',
            footerBg: 'transparent'
          },
          Card: {
            colorBgContainer: 'transparent'
          },
          Menu: {
            colorItemBg: 'transparent',
          }
        }
      }}
    >
      <Layout className="app-layout">
        <Header className="app-header">
          <div className="logo-container">
            <Link to="/">
              <img src="/hm.png" alt="logo" className="logo-image" />
            </Link>
            <Title level={4} className="app-title">HM 图床</Title>
          </div>
          <Space>
            <Button 
              type="text" 
              icon={currentTheme === 'dark' ? <SunOutlined /> : <MoonOutlined />} 
              onClick={toggleTheme}
              className="theme-button"
            />
            <Dropdown overlay={menu} trigger={['click']}>
              <Button type="text" icon={<MenuOutlined />} className="menu-button" />
            </Dropdown>
          </Space>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
        <Footer className="app-footer">
          HM 图床 ©{new Date().getFullYear()} Created with React & Ant Design
        </Footer>
      </Layout>
    </ConfigProvider>
  )
}

export default App
