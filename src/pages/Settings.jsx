import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Form, Input, Button, Card, message, Alert, Switch, Spin, Divider, Badge, Modal, Row, Col, Popconfirm, Tooltip, Popover, Space } from 'antd';
import { 
  GithubOutlined, LinkOutlined, SaveOutlined, QuestionCircleOutlined, 
  CloudSyncOutlined, CloudUploadOutlined, ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, CloudDownloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { Octokit } from '@octokit/rest';
import { useSync } from '../contexts/SyncContext';
import './Settings.css';

const { Title, Paragraph, Text } = Typography;

// 迁移旧版设置
const migrateSettings = (savedSettings) => {
  if (savedSettings && !savedSettings.profiles) {
    const defaultProfile = {
      id: `profile_${Date.now()}`,
      name: savedSettings.repo ? `${savedSettings.owner}/${savedSettings.repo}` : '默认配置',
      owner: savedSettings.owner || '',
      repo: savedSettings.repo || '',
      branch: savedSettings.branch || 'main',
      path: savedSettings.path || 'images',
      customDomain: savedSettings.customDomain || '',
    };
    return {
      profiles: [defaultProfile],
      activeProfileId: defaultProfile.id,
      enableSync: savedSettings.enableSync || false,
    };
  }
  return savedSettings;
};

const Settings = () => {
  const [form] = Form.useForm();
  const [modalForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const navigate = useNavigate();
  // 单独保存token，不存储在localStorage
  const [token, setToken] = useState('');
  
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('github-settings');
    const parsed = savedSettings ? JSON.parse(savedSettings) : null;
    const migrated = migrateSettings(parsed);
    return migrated || {
      profiles: [],
      activeProfileId: null,
      enableSync: false
    };
  });
  
  // 获取同步上下文
  const { 
    isInitialized, 
    isSyncing, 
    lastSynced, 
    error: syncError, 
    initializeSync, 
    syncSettings, 
    switchActiveProfile,
    deleteProfileHistory
  } = useSync();
  
  // 语言文本
  const t = {
    title: '设置',
    subtitle: '配置您的GitHub仓库信息和自定义CDN链接',
    githubSettings: 'GitHub仓库配置',
    repoConfigs: '仓库配置列表',
    addRepoConfig: '添加配置',
    editRepoConfig: '编辑配置',
    configName: '配置名称',
    configNamePlaceholder: '例如：个人博客图床',
    configNameRequired: '请输入配置名称',
    active: '当前使用',
    setActive: '设为当前',
    edit: '编辑',
    delete: '删除',
    deleteConfirm: '确定要删除此配置吗？',
    token: 'GitHub访问令牌',
    tokenRequired: '请输入GitHub访问令牌',
    tokenExtra: '需要具有repo和gist权限的个人访问令牌（Personal Access Token）',
    tokenPlaceholder: '输入GitHub访问令牌',
    owner: '仓库所有者 (可选)',
    ownerRequired: '请输入仓库所有者',
    ownerExtra: '您的GitHub用户名或组织名称，如果仅用于同步设置，可以留空',
    ownerPlaceholder: '输入仓库所有者 (可选)',
    repo: '仓库名称 (可选)',
    repoRequired: '请输入仓库名称',
    repoExtra: '用于存储图片的GitHub仓库名称，如果仅用于同步设置，可以留空',
    repoPlaceholder: '输入仓库名称 (可选)',
    branch: '分支名称',
    branchRequired: '请输入分支名称',
    branchExtra: '存储图片的分支，通常为main或master',
    branchPlaceholder: '输入分支名称',
    path: '存储路径',
    pathRequired: '请输入存储路径',
    pathExtra: '仓库中存储图片的目录路径，不需要前导斜杠',
    pathPlaceholder: '输入存储路径',
    testConnection: '测试连接',
    cdnSettings: 'CDN设置',
    customDomain: '自定义CDN域名',
    customDomainExtra: '可选，用于替代GitHub原始链接的自定义CDN域名，例如：https://cdn.example.com',
    customDomainPlaceholder: '输入自定义CDN域名（可选）',
    saveSettings: '保存设置',
    saveChanges: '保存更改',
    cancel: '取消',
    about: '关于GitHub图床',
    aboutContent: '本工具使用GitHub仓库作为图片存储空间，通过GitHub API上传图片并生成可用于博客的链接。',
    howToGetToken: '如何获取GitHub访问令牌：',
    tokenStep1: '访问',
    tokenStep1Link: 'GitHub令牌设置页面',
    tokenStep2: '点击 "Generate new token" (生成新令牌)',
    tokenStep3: '选择 "repo" 和 "gist" 权限范围（必须同时选择这两项权限）',
    tokenStep4: '生成并复制令牌',
    tokenStep5: '将令牌粘贴到上方的GitHub访问令牌输入框中',
    errorMessage: '请先填写GitHub令牌、所有者和仓库名',
    connectionSuccess: '连接成功！您的GitHub设置正常工作',
    branchNotExist: '分支 "{branch}" 不存在，请创建此分支或使用现有分支',
    connectionFailed: '连接失败: {error}',
    saveSuccess: '设置已保存',
    saveFailed: '保存设置失败',
    profileSaveSuccess: '配置已保存',
    profileSaveFailed: '配置保存失败',
    profileDeleteSuccess: '配置已删除',
    profileSetActiveSuccess: '已切换活动配置',
    syncSettings: '云同步设置',
    enableSync: '启用云同步',
    enableSyncExtra: '启用后，您的设置和上传历史将保存在GitHub Gist中，可在多设备间同步',
    pullFromCloud: '从云端恢复',
    pullFromCloudTooltip: '用云端的数据覆盖本地的所有配置和历史记录。此操作不可逆。',
    pushToCloud: '上传到云端',
    pushToCloudTooltip: '用本地的所有配置和历史记录覆盖云端数据。此操作不可逆。',
    syncStatus: '同步状态',
    syncInitialized: '已初始化',
    syncNotInitialized: '未初始化',
    lastSynced: '上次同步时间',
    syncError: '同步错误',
    syncInProgress: '正在同步...',
    syncSuccess: '同步成功',
    syncRequired: '需要同步',
    syncPermissions: '需要gist权限',
    syncPermissionsExtra: '确保您的GitHub令牌具有gist权限，以便使用云同步功能。如果遇到"Not Found"错误，请检查您的令牌是否有gist权限。'
  };

  // 初始化表单值
  useEffect(() => {
    // 全局设置表单
    form.setFieldsValue({
      enableSync: settings.enableSync,
    });
  }, [form, settings]);

  // 从Cloudflare Pages环境变量获取token
  useEffect(() => {
    const cfToken = import.meta.env.VITE_GITHUB_TOKEN;
    if (cfToken) {
      // 仅在内存中保存token，不存储到localStorage
      setToken(cfToken);
    }
  }, []);

  // 持久化设置的通用函数
  const persistSettings = async (newSettings) => {
    setLoading(true);
    try {
      localStorage.setItem('github-settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      
      const currentToken = token || import.meta.env.VITE_GITHUB_TOKEN || '';
      if (newSettings.enableSync && currentToken) {
        if (!isInitialized) {
          await initializeSync(currentToken);
        } else {
          // 同步整个设置对象
          await syncSettings({ ...newSettings, token: currentToken });
        }
      }
    } catch (error) {
      console.error('持久化设置失败:', error);
      message.error(t.saveFailed);
    } finally {
      setLoading(false);
    }
  };

  // 打开配置模态框
  const showProfileModal = (profile) => {
    setEditingProfile(profile);
    setTestResult(null);
    if (profile) {
      modalForm.setFieldsValue(profile);
    } else {
      modalForm.resetFields();
    }
    setIsModalVisible(true);
  };

  // 关闭配置模态框
  const handleCancelModal = () => {
    setIsModalVisible(false);
    setEditingProfile(null);
  };

  // 保存（新增/编辑）配置
  const handleSaveProfile = async (values) => {
    const newProfile = { ...editingProfile, ...values };
    let newProfiles;

    if (editingProfile) {
      // 编辑
      newProfiles = settings.profiles.map(p => p.id === newProfile.id ? newProfile : p);
    } else {
      // 新增
      newProfile.id = `profile_${Date.now()}`;
      newProfiles = [...settings.profiles, newProfile];
    }

    const newSettings = { ...settings, profiles: newProfiles };
    
    // 如果是第一个配置，自动设为活动
    if (newProfiles.length === 1) {
      newSettings.activeProfileId = newProfile.id;
    }
    
    await persistSettings(newSettings);
    message.success(t.profileSaveSuccess);
    handleCancelModal();
  };

  // 删除配置
  const handleDeleteProfile = async (profileId) => {
    // 如果开启了云同步，也从Gist删除对应的历史文件
    if (settings.enableSync && isInitialized) {
      await deleteProfileHistory(profileId);
    }
    
    const newProfiles = settings.profiles.filter(p => p.id !== profileId);
    const newSettings = { ...settings, profiles: newProfiles };
    
    // 如果删除的是当前活动的配置
    if (settings.activeProfileId === profileId) {
      const newActiveId = newProfiles.length > 0 ? newProfiles[0].id : null;
      newSettings.activeProfileId = newActiveId;
      // 如果有新的活动配置，则切换历史记录
      if (newActiveId) {
        await switchActiveProfile(newActiveId);
      } else {
        // 如果没有活动配置了，清空本地历史
        localStorage.setItem('upload-history', '[]');
      }
    }
    
    persistSettings(newSettings);
    message.success(t.profileDeleteSuccess);
  };
  
  // 设置活动配置
  const handleSetActiveProfile = async (profileId) => {
    const newSettings = { ...settings, activeProfileId: profileId };
    
    // 如果启用了云同步，切换Gist上的历史记录
    if (newSettings.enableSync && isInitialized) {
      await switchActiveProfile(profileId);
    } else {
      // 如果未启用云同步，则清空本地历史记录以避免混淆
      localStorage.setItem('upload-history', '[]');
    }

    await persistSettings(newSettings);
    message.success(t.profileSetActiveSuccess);
  };
  
  // 切换云同步
  const handleSyncChange = (checked) => {
    const newSettings = { ...settings, enableSync: checked };
    form.setFieldsValue({ enableSync: checked }); // 更新主表单
    
    persistSettings(newSettings);
    
    const currentToken = token || import.meta.env.VITE_GITHUB_TOKEN;
    
    if (checked && currentToken && !isInitialized) {
      initializeSync(currentToken).then(success => {
        if (!success) {
          message.error('同步初始化失败，请检查令牌权限');
        }
      });
    }
  };
  
  // 手动触发同步
  const handleManualSync = async () => {
    // 使用内存中的token或环境变量
    const currentToken = token || import.meta.env.VITE_GITHUB_TOKEN;
    
    if (!currentToken) {
      message.error(t.tokenRequired);
      return;
    }
    
    // 禁用同步按钮
    setLoading(true);
    
    try {
      console.log('手动触发同步...');
      
      let success;
      if (!isInitialized) {
        console.log('未初始化，调用initializeSync...');
        success = await initializeSync(currentToken);
      } else {
        console.log('已初始化，调用resyncAll...');
        success = await resyncAll();
      }
      
      if (success) {
        message.success(t.syncSuccess);
      }
    } catch (error) {
      console.error('手动同步过程中发生错误:', error);
      message.error(`${t.syncFailed}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 测试GitHub连接
  const testConnection = async () => {
    const values = await modalForm.validateFields();
    
    // 使用内存中的token或环境变量
    const currentToken = token || import.meta.env.VITE_GITHUB_TOKEN;
    
    if (!currentToken) {
      message.error(t.tokenRequired);
      return;
    }

    // 如果没有提供仓库和用户名，则只测试令牌是否有效
    const isTokenOnlyTest = !values.owner || !values.repo;

    setTestLoading(true);
    setTestResult(null);

    try {
      const octokit = new Octokit({ auth: currentToken });
      
      // 测试令牌是否有效
      const { data: user } = await octokit.users.getAuthenticated();
      
      if (isTokenOnlyTest) {
        // 只测试令牌，如果能获取用户信息，则成功
        setTestResult({
          success: true,
          message: `令牌有效，已验证为用户: ${user.login}`
        });
        setTestLoading(false);
        return;
      }
      
      // 如果提供了仓库信息，则继续测试仓库访问
      const { data: repo } = await octokit.repos.get({
        owner: values.owner,
        repo: values.repo
      });
      
      // 检查分支是否存在
      const { data: branches } = await octokit.repos.listBranches({
        owner: values.owner,
        repo: values.repo
      });
      
      const branchExists = branches.some(branch => branch.name === values.branch);
      
      if (!branchExists) {
        setTestResult({
          success: false,
          message: t.branchNotExist.replace('{branch}', values.branch)
        });
        return;
      }
      
      // 尝试创建测试文件
      const testPath = `${values.path}/test-connection.txt`;
      
      // 使用TextEncoder替代Buffer进行编码
      const encoder = new TextEncoder();
      const testContent = `测试连接 - ${new Date().toISOString()}`;
      const contentBytes = encoder.encode(testContent);
      const contentBase64 = btoa(String.fromCharCode(...contentBytes));
      
      await octokit.repos.createOrUpdateFileContents({
        owner: values.owner,
        repo: values.repo,
        path: testPath,
        message: 'Test connection',
        content: contentBase64,
        branch: values.branch
      });
      
      // 连接成功
      setTestResult({
        success: true,
        message: t.connectionSuccess
      });
    } catch (error) {
      console.error('测试连接失败:', error);
      setTestResult({
        success: false,
        message: t.connectionFailed.replace('{error}', error.message)
      });
    } finally {
      setTestLoading(false);
    }
  };

  // 格式化日期时间
  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  const pageTitle = (
    <div className="page-title-container">
      <Button 
        type="text" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/')}
        className="back-button"
      >
        返回
      </Button>
      <Title level={3} style={{ margin: 0 }}>{t.title}</Title>
    </div>
  );

  // 生成配置卡片内容的函数
  const renderProfileCardContent = (profile) => (
    <div className="profile-card-content">
      <div className="profile-info-row">
        <Text strong>Repo:</Text> 
        <Tooltip title={`${profile.owner}/${profile.repo}`}>
          <Text ellipsis>{profile.owner}/{profile.repo}</Text>
        </Tooltip>
      </div>
      <div className="profile-info-row">
        <Text strong>Branch:</Text> 
        <Text>{profile.branch}</Text>
      </div>
      <div className="profile-info-row">
        <Text strong>Path:</Text> 
        <Tooltip title={profile.path}>
          <Text ellipsis>{profile.path}</Text>
        </Tooltip>
      </div>
      {profile.customDomain && (
        <div className="profile-info-row">
          <Text strong>CDN:</Text> 
          <Tooltip title={profile.customDomain}>
            <Text ellipsis>{profile.customDomain}</Text>
          </Tooltip>
        </div>
      )}
      <div className="profile-card-actions">
        {settings.activeProfileId === profile.id ? (
          <Badge status="processing" text={t.active} />
        ) : (
          <Button 
            size="small" 
            onClick={() => handleSetActiveProfile(profile.id)}
          >
            {t.setActive}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="settings-container">
      <Card 
        title={pageTitle} 
        bordered={false} 
        className="settings-card-main"
        size="small"
      >
        <Paragraph>{t.subtitle}</Paragraph>
        
        {/* GitHub 配置部分 */}
        <div className="settings-section">
          <div className="section-header">
            <Title level={4}>
              <GithubOutlined /> {t.githubSettings}
            </Title>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => showProfileModal(null)}
              size="small"
            >
              {t.addRepoConfig}
            </Button>
          </div>
          
          {!import.meta.env.VITE_GITHUB_TOKEN && (
            <Alert
              message="GitHub令牌未配置"
              description="请联系管理员在Cloudflare Pages中配置VITE_GITHUB_TOKEN环境变量。"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          
          {import.meta.env.VITE_GITHUB_TOKEN && (
            <Alert
              message="GitHub令牌已配置"
              description="令牌已从环境变量中加载，无需手动输入。"
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <div className="profiles-grid">
            {settings.profiles.map(profile => (
              <Card 
                key={profile.id}
                className={`profile-card ${settings.activeProfileId === profile.id ? 'active-profile' : ''}`}
                size="small"
                title={
                  <Tooltip title={profile.name}>
                    <div className="profile-card-title">{profile.name}</div>
                  </Tooltip>
                }
                extra={
                  <Space>
                    <Tooltip title={t.edit}>
                      <Button 
                        type="text" 
                        icon={<EditOutlined />} 
                        onClick={() => showProfileModal(profile)}
                        size="small"
                      />
                    </Tooltip>
                    <Tooltip title={t.delete}>
                      <Popconfirm
                        title={t.deleteConfirm}
                        onConfirm={() => handleDeleteProfile(profile.id)}
                        okText="是"
                        cancelText="否"
                      >
                        <Button 
                          type="text" 
                          danger 
                          icon={<DeleteOutlined />}
                          size="small" 
                        />
                      </Popconfirm>
                    </Tooltip>
                  </Space>
                }
              >
                {renderProfileCardContent(profile)}
              </Card>
            ))}
          </div>
        </div>
        
        <Divider />
        
        {/* 其他设置部分 */}
        <div className="settings-grid">
          {/* 云同步设置 */}
          <Card 
            title={
              <div className="card-title-with-info">
                <CloudSyncOutlined /> {t.syncSettings}
                <Popover 
                  content={t.enableSyncExtra}
                  title={t.syncSettings}
                  trigger="hover"
                >
                  <InfoCircleOutlined className="info-icon" />
                </Popover>
              </div>
            } 
            className="settings-card"
            size="small"
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                enableSync: settings.enableSync,
              }}
            >
              <Form.Item
                name="enableSync"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren={t.enableSync} 
                  unCheckedChildren={t.enableSync}
                  onChange={handleSyncChange}
                  checked={settings.enableSync}
                />
              </Form.Item>
            </Form>
            
            <div className="sync-status-compact">
              <div className="sync-status-item">
                <Badge 
                  status={isInitialized ? 'success' : 'default'} 
                  text={isInitialized ? t.syncInitialized : t.syncNotInitialized} 
                />
              </div>
              
              <div className="sync-status-item">
                <Tooltip title={lastSynced ? formatDateTime(lastSynced) : '-'}>
                  <Text>{lastSynced ? '最近同步: ' + new Date(lastSynced).toLocaleDateString() : '-'}</Text>
                </Tooltip>
              </div>
            </div>
            
            {syncError && (
              <Alert
                message={t.syncError}
                description={syncError}
                type="error"
                showIcon
                className="sync-error-alert"
              />
            )}
          </Card>
          
          {/* 关于信息 */}
          <Card 
            title={<><QuestionCircleOutlined /> {t.about}</>} 
            className="settings-card"
            size="small"
          >
            <Paragraph>{t.aboutContent}</Paragraph>
            
            <Popover
              content={
                <ol className="token-steps">
                  <li>{t.tokenStep1} <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">{t.tokenStep1Link}</a></li>
                  <li>{t.tokenStep2}</li>
                  <li>{t.tokenStep3}</li>
                  <li>{t.tokenStep4}</li>
                  <li>{t.tokenStep5}</li>
                </ol>
              }
              title={t.howToGetToken}
              trigger="click"
              placement="bottom"
            >
              <Button type="link">{t.howToGetToken}</Button>
            </Popover>
          </Card>
        </div>
      </Card>

      {/* 新增/编辑配置的模态框 */}
      <Modal
        title={editingProfile ? t.editRepoConfig : t.addRepoConfig}
        open={isModalVisible}
        onCancel={handleCancelModal}
        footer={null}
        destroyOnClose
      >
        <Form
          form={modalForm}
          layout="vertical"
          onFinish={handleSaveProfile}
        >
          <Form.Item
            name="name"
            label={t.configName}
            rules={[{ required: true, message: t.configNameRequired }]}
          >
            <Input placeholder={t.configNamePlaceholder} />
          </Form.Item>
          <Form.Item
            name="owner"
            label={t.owner}
            rules={[{ required: true, message: t.ownerRequired }]}
            tooltip={t.ownerExtra}
          >
            <Input placeholder={t.ownerPlaceholder} />
          </Form.Item>
          <Form.Item
            name="repo"
            label={t.repo}
            rules={[{ required: true, message: t.repoRequired }]}
            tooltip={t.repoExtra}
          >
            <Input placeholder={t.repoPlaceholder} />
          </Form.Item>
          <Form.Item
            name="branch"
            label={t.branch}
            rules={[{ required: true, message: t.branchRequired }]}
            tooltip={t.branchExtra}
          >
            <Input placeholder={t.branchPlaceholder} />
          </Form.Item>
          <Form.Item
            name="path"
            label={t.path}
            rules={[{ required: true, message: t.pathRequired }]}
            tooltip={t.pathExtra}
          >
            <Input placeholder={t.pathPlaceholder} />
          </Form.Item>
          <Form.Item
            name="customDomain"
            label={t.customDomain}
            tooltip={t.customDomainExtra}
          >
            <Input placeholder={t.customDomainPlaceholder} />
          </Form.Item>
          
          <div className="modal-footer">
            <Button onClick={handleCancelModal}>{t.cancel}</Button>
            <Button type="primary" htmlType="submit" loading={loading}>{t.saveChanges}</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;