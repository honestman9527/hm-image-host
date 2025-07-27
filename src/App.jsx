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
  const [pageTitle, setPageTitle] = useState('GitHub图床');
  // 密码校验相关
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(true);
  const [passwordError, setPasswordError] = useState('');
  const appPassword = import.meta.env.VITE_APP_PASSWORD;

  // 文本变量
  const t = {
    title: 'HM 图床',
    upload: '上传图片',
    imageManager: '图片管理',
    settings: '设置',
    footer: 'HM 图床 ©{year} Created with React & Ant Design',
    passwordTitle: '访问验证',
    passwordPlaceholder: '请输入访问密码',
    passwordError: '密码错误，请重试',
    passwordConfirm: '确认',
    passwordCancel: '退出'
  };

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

  // 密码校验逻辑
  useEffect(() => {
    // 如果已认证则关闭弹窗
    if (isAuthenticated) {
      setShowPasswordModal(false);
    } else {
      setShowPasswordModal(true);
    }
  }, [isAuthenticated]);

  const handlePasswordConfirm = () => {
    if (passwordInput === String(appPassword)) {
      setIsAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError(t.passwordError);
      setPasswordInput('');
    }
  };

  const handlePasswordCancel = () => {
    // 退出页面，可自定义行为，这里刷新页面
    window.location.href = 'https://www.baidu.com';
  };

  // 根据当前路径设置页面标题
  useEffect(() => {
    switch (location.pathname) {
      case '/':
        setPageTitle(t.upload);
        break;
      case '/images':
        setPageTitle(t.imageManager);
        break;
      case '/settings':
        setPageTitle(t.settings);
        break;
      default:
        setPageTitle(t.title);
        break;
    }
  }, [location.pathname, t]);

  const menuItems = [
    {
      key: '/images',
      icon: <PictureOutlined />,
      label: t.imageManager,
      onClick: () => navigate('/images')
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: t.settings,
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
      {/* 密码验证弹窗 */}
      <Modal
        title={t.passwordTitle}
        open={showPasswordModal}
        closable={false}
        maskClosable={false}
        footer={null}
        centered
      >
        <Input.Password
          placeholder={t.passwordPlaceholder}
          value={passwordInput}
          onChange={e => setPasswordInput(e.target.value)}
          onPressEnter={handlePasswordConfirm}
          style={{ marginBottom: 12 }}
        />
        {passwordError && <div style={{ color: 'red', marginBottom: 12 }}>{passwordError}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handlePasswordCancel}>{t.passwordCancel}</Button>
          <Button type="primary" onClick={handlePasswordConfirm}>{t.passwordConfirm}</Button>
        </div>
      </Modal>
      {/* 主内容 */}
      {isAuthenticated && (
        <Layout className="app-layout">
          <Header className="app-header">
            <div className="logo-container">
              <Link to="/">
                <img src="/hm.png" alt="logo" className="logo-image" />
              </Link>
              <Title level={4} className="app-title">{t.title}</Title>
            </div>
            <div className="page-title-container">
              <Title level={4} className="page-title">{pageTitle}</Title>
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
            {t.footer.replace('{year}', new Date().getFullYear())}
          </Footer>
        </Layout>
      )}
    </ConfigProvider>
  )
}

export default App
