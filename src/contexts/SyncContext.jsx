import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { 
  initGistSync, 
  loadSettingsFromGist, 
  loadHistoryFromGist, 
  saveSettingsToGist, 
  saveHistoryToGist,
  deleteHistoryFromGist
} from '../utils/gistSync';

// 创建Context
export const SyncContext = createContext();

// 自定义Hook，用于在组件中使用SyncContext
export const useSync = () => useContext(SyncContext);

// SyncProvider组件
export const SyncProvider = ({ children }) => {
  const [syncState, setSyncState] = useState({
    isInitialized: false,
    isSyncing: false,
    lastSynced: null,
    gistId: null,
    octokit: null,
    error: null,
  });

  // 初始化同步
  const initializeSync = useCallback(async (token) => {
    if (!token) return;
    
    setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      // 初始化Gist同步
      const { octokit, gistId } = await initGistSync(token);
      let settings = JSON.parse(localStorage.getItem('github-settings') || '{}');
      
      // 从Gist加载设置
      const gistSettings = await loadSettingsFromGist(octokit, gistId);
      if (gistSettings) {
        // 合并设置，Gist为准，但保留本地输入的token
        settings = {
          ...gistSettings,
          token: token // 使用当前输入的token
        };
        localStorage.setItem('github-settings', JSON.stringify(settings));
      }
      
      // 首次初始化时，加载当前活动profile的历史记录
      const activeProfileId = settings.activeProfileId;
      if (activeProfileId) {
        const gistHistory = await loadHistoryFromGist(octokit, gistId, activeProfileId);
        // 即使Gist上没有历史文件，也用空数组覆盖本地，以确保一致性
        localStorage.setItem('upload-history', JSON.stringify(gistHistory || []));
      } else {
        // 没有活动配置，确保本地历史为空
        localStorage.setItem('upload-history', '[]');
      }
      
      // 更新同步状态
      setSyncState({
        isInitialized: true,
        isSyncing: false,
        lastSynced: new Date(),
        gistId,
        octokit,
        error: null,
      });
      
      message.success('云端数据同步成功');
      return true;
    } catch (error) {
      console.error('初始化同步失败:', error);
      
      // 提供更友好的错误提示
      let errorMessage = error.message || '同步失败';
      
      // 检查是否是权限相关错误
      if (errorMessage.includes('gist权限') || errorMessage.includes('权限被拒绝')) {
        errorMessage = '同步失败: GitHub令牌缺少gist权限。请在GitHub上创建新令牌，并确保勾选gist权限。';
      } else if (errorMessage.includes('认证失败') || errorMessage.includes('无效')) {
        errorMessage = '同步失败: GitHub认证失败。请检查您的令牌是否正确或已过期。';
      }
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: errorMessage,
      }));
      
      message.error(errorMessage);
      return false;
    }
  }, []);

  // 同步设置到Gist
  const syncSettings = useCallback(async (settings) => {
    const { octokit, gistId, isInitialized } = syncState;
    
    if (!isInitialized || !octokit || !gistId) {
      return false;
    }
    
    setSyncState(prev => ({ ...prev, isSyncing: true }));
    
    try {
      // 确保移除令牌信息再同步
      const settingsToSync = { ...settings };
      delete settingsToSync.token;
      
      await saveSettingsToGist(octokit, gistId, settingsToSync);
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSynced: new Date(),
      }));
      
      return true;
    } catch (error) {
      console.error('同步设置失败:', error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message || '同步设置失败',
      }));
      message.error(`同步设置失败: ${error.message}`);
      return false;
    }
  }, [syncState]);

  // 同步指定profile的单个历史记录
  const syncHistoryRecord = useCallback(async (record, profileId) => {
    const { octokit, gistId, isInitialized } = syncState;
    if (!isInitialized || !octokit || !gistId) return false;

    try {
      // 1. 获取当前profile在本地的历史
      const localHistory = JSON.parse(localStorage.getItem('upload-history') || '[]');
      
      // 2. 将新记录添加到最前面
      const newHistory = [record, ...localHistory];

      // 3. 将合并后的历史推送到Gist
      await saveHistoryToGist(octokit, gistId, newHistory, profileId);
      
      return true;
    } catch (error) {
      console.error('同步历史记录失败:', error);
      message.error(`同步记录失败: ${error.message}`);
      return false;
    }
  }, [syncState]);

  // 从Gist删除单条历史记录
  const deleteHistoryRecord = useCallback(async (recordId, profileId) => {
    const { octokit, gistId, isInitialized } = syncState;
    if (!isInitialized || !octokit || !gistId) return false;

    setSyncState(prev => ({ ...prev, isSyncing: true }));
    try {
      const history = await loadHistoryFromGist(octokit, gistId, profileId);
      const updatedHistory = history.filter(record => record.id !== recordId);
      await saveHistoryToGist(octokit, gistId, updatedHistory, profileId);
      
      // 更新本地存储
      localStorage.setItem('upload-history', JSON.stringify(updatedHistory));

      setSyncState(prev => ({ ...prev, isSyncing: false, lastSynced: new Date() }));
      return true;
    } catch (error) {
      console.error('删除云端历史记录失败:', error);
      setSyncState(prev => ({ ...prev, isSyncing: false, error: error.message }));
      message.error(`删除云端记录失败: ${error.message}`);
      return false;
    }
  }, [syncState]);

  // 切换活动Profile时，从Gist加载对应的历史记录
  const switchActiveProfile = useCallback(async (profileId) => {
    const { octokit, gistId, isInitialized } = syncState;
    if (!isInitialized || !octokit || !gistId) {
      // 如果未初始化，则只清空本地历史
      localStorage.setItem('upload-history', '[]');
      return;
    }

    setSyncState(prev => ({ ...prev, isSyncing: true }));
    try {
      const history = await loadHistoryFromGist(octokit, gistId, profileId);
      localStorage.setItem('upload-history', JSON.stringify(history));
      setSyncState(prev => ({ ...prev, isSyncing: false }));
      message.success(`已切换到配置，并同步历史记录`);
    } catch (error) {
      console.error(`切换配置历史失败 (Profile: ${profileId}):`, error);
      setSyncState(prev => ({ ...prev, isSyncing: false, error: error.message }));
      message.error(`切换配置失败: ${error.message}`);
    }
  }, [syncState]);
  
  // 删除某个Profile的所有历史记录
  const deleteProfileHistory = useCallback(async (profileId) => {
    const { octokit, gistId, isInitialized } = syncState;
    if (!isInitialized || !octokit || !gistId) return;

    try {
      await deleteHistoryFromGist(octokit, gistId, profileId);
    } catch (error) {
      console.error(`删除Profile历史文件失败:`, error);
      message.error(`删除云端历史文件失败`);
    }
  }, [syncState]);

  // 提供Context值
  const value = {
    ...syncState,
    initializeSync,
    syncSettings,
    syncHistoryRecord,
    deleteHistoryRecord,
    switchActiveProfile,
    deleteProfileHistory,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}; 