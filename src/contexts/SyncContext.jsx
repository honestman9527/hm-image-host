import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { initGistSync, loadSettingsFromGist, loadHistoryFromGist, saveSettingsToGist, saveHistoryToGist } from '../utils/gistSync';

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
      
      // 从Gist加载设置
      const gistSettings = await loadSettingsFromGist(octokit, gistId);
      if (gistSettings) {
        // 合并设置，保留本地令牌但使用云端的其他设置
        const currentSettings = JSON.parse(localStorage.getItem('github-settings') || '{}');
        const mergedSettings = {
          ...gistSettings,
          token: token // 使用当前输入的token
        };
        
        localStorage.setItem('github-settings', JSON.stringify(mergedSettings));
      }
      
      // 从Gist加载历史
      const gistHistory = await loadHistoryFromGist(octokit, gistId);
      if (gistHistory && gistHistory.length > 0) {
        localStorage.setItem('upload-history', JSON.stringify(gistHistory));
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

  // 同步历史到Gist
  const syncHistory = useCallback(async (newHistoryRecord) => {
    const { octokit, gistId, isInitialized } = syncState;
    
    if (!isInitialized || !octokit || !gistId) {
      return false;
    }
    
    setSyncState(prev => ({ ...prev, isSyncing: true }));
    
    try {
      // 1. 从Gist拉取当前的历史记录
      const existingHistory = await loadHistoryFromGist(octokit, gistId);

      // 2. 合并历史记录 (将新记录添加到最前面)
      // 同时进行去重，防止因网络问题等意外情况重复添加
      const newHistory = [...newHistoryRecord, ...existingHistory];
      const uniqueHistory = newHistory.filter((record, index, self) =>
        index === self.findIndex((r) => (
          r.id === record.id || r.url === record.url // 使用id或url作为唯一标识
        ))
      );
      
      // 3. 将合并后的完整历史记录推送到Gist
      await saveHistoryToGist(octokit, gistId, uniqueHistory);

      // 4. (可选但推荐) 更新本地的`upload-history`为合并后的最新记录
      localStorage.setItem('upload-history', JSON.stringify(uniqueHistory));
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSynced: new Date(),
      }));
      
      return true;
    } catch (error) {
      console.error('同步历史失败:', error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message || '同步历史失败',
      }));
      message.error(`同步历史失败: ${error.message}`);
      return false;
    }
  }, [syncState]);

  // 从Gist删除单条历史记录
  const deleteHistoryRecord = useCallback(async (recordId) => {
    const { octokit, gistId, isInitialized } = syncState;

    if (!isInitialized || !octokit || !gistId) {
      return false;
    }

    setSyncState(prev => ({ ...prev, isSyncing: true }));

    try {
      // 1. 从Gist拉取当前的历史记录
      const existingHistory = await loadHistoryFromGist(octokit, gistId);

      // 2. 过滤掉要删除的记录
      const updatedHistory = existingHistory.filter(record => record.id !== recordId);

      // 3. 将更新后的历史推送到Gist
      await saveHistoryToGist(octokit, gistId, updatedHistory);
      
      // 4. 更新本地存储
      localStorage.setItem('upload-history', JSON.stringify(updatedHistory));

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSynced: new Date(),
      }));

      return true;
    } catch (error) {
      console.error('删除云端历史记录失败:', error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message || '删除云端历史记录失败',
      }));
      message.error(`删除云端记录失败: ${error.message}`);
      return false;
    }
  }, [syncState]);

  // 从云端拉取数据并覆盖本地
  const pullFromGist = useCallback(async () => {
    const { octokit, gistId, isInitialized, lastSynced } = syncState;
    if (!isInitialized || !octokit || !gistId) return false;

    setSyncState(prev => ({ ...prev, isSyncing: true }));
    try {
      const gistSettings = await loadSettingsFromGist(octokit, gistId);
      const gistHistory = await loadHistoryFromGist(octokit, gistId);

      if (gistSettings) {
        const currentSettings = JSON.parse(localStorage.getItem('github-settings') || '{}');
        const mergedSettings = { ...gistSettings, token: currentSettings.token };
        localStorage.setItem('github-settings', JSON.stringify(mergedSettings));
      }
      if (gistHistory) {
        localStorage.setItem('upload-history', JSON.stringify(gistHistory));
      }

      setSyncState(prev => ({ ...prev, isSyncing: false, lastSynced: new Date() }));
      message.success('已从云端恢复数据');
      return true;
    } catch (error) {
      console.error('从云端拉取数据失败:', error);
      setSyncState(prev => ({ ...prev, isSyncing: false, error: error.message }));
      message.error(`拉取失败: ${error.message}`);
      return false;
    }
  }, [syncState]);

  // 将本地数据推送到云端
  const pushToGist = useCallback(async () => {
    const { octokit, gistId, isInitialized } = syncState;
    if (!isInitialized || !octokit || !gistId) return false;

    setSyncState(prev => ({ ...prev, isSyncing: true }));
    try {
      const localSettings = JSON.parse(localStorage.getItem('github-settings') || '{}');
      const localHistory = JSON.parse(localStorage.getItem('upload-history') || '[]');
      
      const settingsToSync = { ...localSettings };
      delete settingsToSync.token;
      
      await saveSettingsToGist(octokit, gistId, settingsToSync);
      await saveHistoryToGist(octokit, gistId, localHistory);

      setSyncState(prev => ({ ...prev, isSyncing: false, lastSynced: new Date() }));
      message.success('本地数据已上传至云端');
      return true;
    } catch (error) {
      console.error('推送到云端失败:', error);
      setSyncState(prev => ({ ...prev, isSyncing: false, error: error.message }));
      message.error(`推送失败: ${error.message}`);
      return false;
    }
  }, [syncState]);

  // 提供Context值
  const value = {
    ...syncState,
    initializeSync,
    syncSettings,
    syncHistory,
    deleteHistoryRecord,
    pullFromGist,
    pushToGist,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}; 