import React, { useState, useCallback, useEffect } from 'react';
import { Typography, Card, Upload, Button, message, Progress, Switch, Input, Form, Spin } from 'antd';
import { InboxOutlined, SettingOutlined } from '@ant-design/icons';
import { useDropzone } from 'react-dropzone';
import Compressor from 'compressorjs';
import { Octokit } from '@octokit/rest';
import { useSync } from '../contexts/SyncContext';
import { useNavigate } from 'react-router-dom';
import './Upload.css';

const { Title, Paragraph } = Typography;
const { Dragger } = Upload;

const UploadPage = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressImages, setCompressImages] = useState(true);
  const [convertToWebP, setConvertToWebP] = useState(false);
  
  const [activeProfile, setActiveProfile] = useState(null);
  const [appSettings, setAppSettings] = useState(null);

  const navigate = useNavigate();
  const { isInitialized, syncHistory } = useSync();

  useEffect(() => {
    // 封装加载逻辑，以便复用
    const loadSettings = () => {
      const savedSettings = localStorage.getItem('github-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setAppSettings(parsed);
        if (parsed.profiles && parsed.activeProfileId) {
          const profile = parsed.profiles.find(p => p.id === parsed.activeProfileId);
          setActiveProfile(profile);
        } else {
          setActiveProfile(null);
        }
      }
    };
    
    // 页面加载时立即读取一次
    loadSettings();

    // 监听 'focus' 事件，当窗口重新获得焦点时（比如从设置页切回来），重新加载设置
    window.addEventListener('focus', loadSettings);

    // 清理监听器
    return () => {
      window.removeEventListener('focus', loadSettings);
    };
  }, []);

  // 检查设置是否完成
  const isSettingsComplete = () => {
    return import.meta.env.VITE_GITHUB_TOKEN && activeProfile;
  };

  // 处理文件拖放
  const onDrop = useCallback(acceptedFiles => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
      status: 'ready', // ready, uploading, success, error
      progress: 0,
      url: ''
    }));
    
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': []
    }
  });

  // 压缩图片
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      if (!compressImages) {
        resolve(file);
        return;
      }

      // 获取文件类型
      const fileType = file.type;
      const fileName = file.name;
      const fileExt = fileName.split('.').pop().toLowerCase();
      
      // 压缩配置
      const options = {
        // 基本配置
        quality: 0.8,
        // 如果选择转换为WebP格式
        mimeType: convertToWebP ? 'image/webp' : undefined,
        // 针对不同格式的特殊配置
        ...(/^image\/png/.test(fileType) ? {
          // PNG特殊配置 - PNG通常压缩效果有限
          quality: 0.75,
          convertSize: 500000, // 500KB以上的PNG进行压缩
          strict: true, // 严格模式
          checkOrientation: true,
        } : {}),
        ...(/^image\/jpe?g/.test(fileType) ? {
          // JPEG特殊配置
          quality: 0.8,
        } : {}),
        ...(/^image\/gif/.test(fileType) ? {
          // GIF特殊配置 - 注意GIF压缩可能会失去动画效果
          quality: 0.7,
        } : {}),
        success(result) {
          resolve(result);
        },
        error(err) {
          console.error(`压缩图片失败 (${fileExt}):`, err);
          // 如果压缩失败，返回原始文件
          resolve(file);
        },
      };

      new Compressor(file, options);
    });
  };

  // 生成随机字符串
  const generateRandomString = (length = 10) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  // 上传单个文件到GitHub
  const uploadToGitHub = async (fileObj, index, currentActiveProfile) => {
    try {
      // 更新文件状态为上传中
      setFiles(prevFiles => {
        const newFiles = [...prevFiles];
        newFiles[index] = { ...newFiles[index], status: 'uploading' };
        return newFiles;
      });

      // 压缩图片
      const compressedFile = await compressImage(fileObj.file);
      
      // 读取文件内容
      const content = await readFileAsBase64(compressedFile);
      
      // 创建Octokit实例，直接使用环境变量中的Token
      const octokit = new Octokit({ auth: import.meta.env.VITE_GITHUB_TOKEN });
      
      // 生成文件路径
      const date = new Date();
      const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
      const randomString = generateRandomString(8);
      // 获取文件扩展名，如果转换为WebP则修改扩展名
      let fileExt = fileObj.name.split('.').pop();
      if (convertToWebP) {
        fileExt = 'webp';
      }
      const fileName = `${timestamp}_${randomString}.${fileExt}`;
      const filePath = `${currentActiveProfile.path}/${fileName}`;
      
      // 上传文件到GitHub
      const response = await octokit.repos.createOrUpdateFileContents({
        owner: currentActiveProfile.owner,
        repo: currentActiveProfile.repo,
        path: filePath,
        message: `Upload image: ${fileName}`,
        content: content,
        branch: currentActiveProfile.branch
      });
      
      // 生成图片URL
      let imageUrl;
      if (currentActiveProfile.customDomain) {
        const cdnBase = currentActiveProfile.customDomain.replace(/\/+$/, '');
        imageUrl = `${cdnBase}/${currentActiveProfile.owner}/${currentActiveProfile.repo}/${currentActiveProfile.branch}/${filePath}`;
      } else {
        imageUrl = `https://raw.githubusercontent.com/${currentActiveProfile.owner}/${currentActiveProfile.repo}/${currentActiveProfile.branch}/${filePath}`;
      }
      
      // 更新文件状态为成功
      setFiles(prevFiles => {
        const newFiles = [...prevFiles];
        newFiles[index] = { 
          ...newFiles[index], 
          status: 'success', 
          progress: 100,
          url: imageUrl
        };
        return newFiles;
      });
      
      // 保存上传记录到本地存储
      saveUploadHistory({
        id: `img_${Date.now()}_${randomString}`,
        name: fileObj.name,
        url: imageUrl,
        size: compressedFile.size,
        date: new Date().toISOString(),
        path: filePath,
        profileId: currentActiveProfile.id
      });
      
      return true;
    } catch (error) {
      console.error('上传失败:', error);
      
      // 更新文件状态为错误
      setFiles(prevFiles => {
        const newFiles = [...prevFiles];
        newFiles[index] = { ...newFiles[index], status: 'error' };
        return newFiles;
      });
      
      message.error(`上传失败: ${fileObj.name}`);
      return false;
    }
  };

  // 读取文件为Base64
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
        resolve(encoded);
      };
      reader.onerror = error => reject(error);
    });
  };

  // 保存上传历史
  const saveUploadHistory = (record) => {
    const historyString = localStorage.getItem('upload-history') || '[]';
    const history = JSON.parse(historyString);
    const newHistory = [record, ...history];
    localStorage.setItem('upload-history', JSON.stringify(newHistory));
    
    // 如果启用了云同步，只同步新增的记录
    if (appSettings?.enableSync && isInitialized) {
      syncHistory([record]).catch(error => {
        console.error('同步历史记录失败:', error);
      });
    }
  };

  // 开始上传所有文件
  const handleUpload = async () => {
    if (!isSettingsComplete() || !activeProfile) {
      message.error('请先在设置页面中配置并指定一个活动的仓库');
      return;
    }
    
    if (files.length === 0) {
      message.warning('请先选择要上传的图片');
      return;
    }
    
    setUploading(true);
    setProgress(0);
    
    let successCount = 0;
    
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'ready') {
        const success = await uploadToGitHub(files[i], i, activeProfile);
        if (success) {
          successCount++;
        }
      } else {
        successCount++;
      }
      
      // 更新总进度
      const newProgress = Math.floor(((i + 1) / files.length) * 100);
      setProgress(newProgress);
    }
    
    setUploading(false);
    
    if (successCount === files.length) {
      message.success('所有图片上传成功！');
    } else {
      message.warning(`上传完成，${successCount}/${files.length} 个文件成功`);
    }
  };

  // 移除文件
  const handleRemove = (index) => {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      // 释放预览URL
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // 复制链接
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => message.success('链接已复制到剪贴板'))
      .catch(err => message.error('复制失败: ' + err));
  };

  return (
    <div className="upload-container">
      <Typography className="upload-header">
        <Title level={2}>上传图片</Title>
        <Paragraph>
          将图片上传到您的GitHub仓库，获取可用于博客的图片链接
        </Paragraph>
      </Typography>

      {!isSettingsComplete() && (
        <Card className="settings-reminder">
          <SettingOutlined style={{ fontSize: '24px', marginRight: '8px' }} />
          <div>
            <p>您需要先完成GitHub设置才能上传图片</p>
            <Button type="primary" onClick={() => navigate('/settings')}>前往设置</Button>
          </div>
        </Card>
      )}

      <Card title="上传选项" className="upload-options">
        <Form layout="horizontal">
          <Form.Item label="压缩图片">
            <Switch 
              checked={compressImages} 
              onChange={setCompressImages} 
              checkedChildren="开启" 
              unCheckedChildren="关闭"
            />
            <span className="option-description">开启后将压缩图片以节省空间</span>
          </Form.Item>
          <Form.Item label="转换为WebP格式">
            <Switch 
              checked={convertToWebP} 
              onChange={setConvertToWebP} 
              checkedChildren="开启" 
              unCheckedChildren="关闭"
              disabled={!compressImages}
            />
            <span className="option-description">开启后将所有图片转换为WebP格式，体积更小（推荐用于PNG图片）</span>
          </Form.Item>
        </Form>
      </Card>

      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        <p><InboxOutlined style={{ fontSize: '48px' }} /></p>
        <p className="main-text">点击或拖拽图片到此区域上传</p>
        <p className="sub-text">支持单个或批量上传</p>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          <div className="file-list-header">
            <h3>待上传文件 ({files.length})</h3>
            <Button 
              type="primary" 
              onClick={handleUpload} 
              loading={uploading}
              disabled={!isSettingsComplete()}
            >
              {uploading ? '上传中...' : '开始上传'}
            </Button>
          </div>
          
          {uploading && (
            <div className="upload-progress">
              <Progress percent={progress} status="active" />
            </div>
          )}
          
          <div className="file-items">
            {files.map((file, index) => (
              <div key={index} className={`file-item ${file.status}`}>
                <div className="file-preview">
                  <img src={file.preview} alt={file.name} />
                  {file.status === 'uploading' && (
                    <div className="file-loading">
                      <Spin />
                    </div>
                  )}
                </div>
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                  <div className="file-status">
                    {file.status === 'ready' && '待上传'}
                    {file.status === 'uploading' && '上传中...'}
                    {file.status === 'success' && '上传成功'}
                    {file.status === 'error' && '上传失败'}
                  </div>
                </div>
                <div className="file-actions">
                  {file.status === 'success' ? (
                    <Button 
                      type="link" 
                      onClick={() => copyToClipboard(file.url)}
                    >
                      复制链接
                    </Button>
                  ) : (
                    <Button 
                      type="link" 
                      danger 
                      onClick={() => handleRemove(index)}
                      disabled={uploading}
                    >
                      移除
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;