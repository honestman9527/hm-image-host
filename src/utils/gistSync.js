import { Octokit } from '@octokit/rest';

// 默认的Gist描述，用于识别图床配置Gist
const GIST_DESCRIPTION = 'Image Hosting Pro Configuration';
const CONFIG_FILENAME = 'image-hosting-config.json';
// 不再使用单一历史文件名，而是动态生成
// const HISTORY_FILENAME = 'upload-history.json';

// 根据profileId生成历史文件名
const getHistoryFilename = (profileId) => `history-${profileId}.json`;

/**
 * 创建新的配置Gist
 * @param {Octokit} octokit - Octokit实例
 * @param {Object} settings - 设置对象
 * @returns {Promise<string>} - 返回创建的Gist ID
 */
export async function createConfigGist(octokit, settings) {
  try {
    // 首先检查用户是否有gist权限
    try {
      // 尝试获取用户信息，验证令牌有效
      const { data: user } = await octokit.users.getAuthenticated();
      console.log('已验证GitHub用户:', user.login);
    } catch (authError) {
      console.error('GitHub认证失败:', authError);
      throw new Error(`GitHub认证失败: ${authError.message}. 请检查您的令牌是否有效。`);
    }
    
    // 确保不包含令牌信息
    const settingsToSave = { ...settings };
    delete settingsToSave.token;
    
    // 创建Gist，只包含配置文件
    const response = await octokit.gists.create({
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [CONFIG_FILENAME]: {
          content: JSON.stringify(settingsToSave, null, 2)
        }
      }
    });
    return response.data.id;
  } catch (error) {
    console.error('创建Gist失败:', error);
    // 提供更详细的错误信息
    if (error.status === 404) {
      throw new Error('创建Gist失败: 您的GitHub令牌可能没有gist权限。请确保在创建令牌时勾选了"gist"权限。');
    } else if (error.status === 401) {
      throw new Error('创建Gist失败: GitHub认证失败。您的令牌可能已过期或无效。');
    } else if (error.status === 403) {
      throw new Error('创建Gist失败: 权限被拒绝。您可能达到了API请求限制或令牌权限不足。');
    }
    throw error;
  }
}

/**
 * 查找配置Gist
 * @param {Octokit} octokit - Octokit实例
 * @returns {Promise<string|null>} - 返回Gist ID，如果未找到则返回null
 */
export async function findConfigGist(octokit) {
  try {
    // 获取用户的所有Gist
    const { data: gists } = await octokit.gists.list();
    
    // 查找描述匹配的Gist
    const configGist = gists.find(gist => 
      gist.description === GIST_DESCRIPTION && 
      gist.files && 
      gist.files[CONFIG_FILENAME]
    );
    
    return configGist ? configGist.id : null;
  } catch (error) {
    console.error('查找Gist失败:', error);
    throw error;
  }
}

/**
 * 保存设置到Gist
 * @param {Octokit} octokit - Octokit实例
 * @param {string} gistId - Gist ID
 * @param {Object} settings - 设置对象
 */
export async function saveSettingsToGist(octokit, gistId, settings) {
  try {
    // 创建设置的副本，移除敏感信息
    const settingsToSave = { ...settings };
    // 移除令牌信息，保留其他设置
    delete settingsToSave.token;
    
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [CONFIG_FILENAME]: {
          content: JSON.stringify(settingsToSave, null, 2)
        }
      }
    });
  } catch (error) {
    console.error('保存设置到Gist失败:', error);
    throw error;
  }
}

/**
 * 保存上传历史到Gist
 * @param {Octokit} octokit - Octokit实例
 * @param {string} gistId - Gist ID
 * @param {Array} history - 上传历史数组
 * @param {string} profileId - 配置ID
 */
export async function saveHistoryToGist(octokit, gistId, history, profileId) {
  try {
    const filename = getHistoryFilename(profileId);
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: {
          content: JSON.stringify(history, null, 2)
        }
      }
    });
  } catch (error) {
    console.error(`保存历史到Gist失败 (Profile: ${profileId}):`, error);
    throw error;
  }
}

/**
 * 从Gist加载设置
 * @param {Octokit} octokit - Octokit实例
 * @param {string} gistId - Gist ID
 * @returns {Promise<Object>} - 返回设置对象
 */
export async function loadSettingsFromGist(octokit, gistId) {
  try {
    const { data: gist } = await octokit.gists.get({
      gist_id: gistId
    });
    
    if (gist.files && gist.files[CONFIG_FILENAME]) {
      return JSON.parse(gist.files[CONFIG_FILENAME].content);
    }
    return null;
  } catch (error) {
    console.error('从Gist加载设置失败:', error);
    throw error;
  }
}

/**
 * 从Gist加载上传历史
 * @param {Octokit} octokit - Octokit实例
 * @param {string} gistId - Gist ID
 * @param {string} profileId - 配置ID
 * @returns {Promise<Array>} - 返回上传历史数组
 */
export async function loadHistoryFromGist(octokit, gistId, profileId) {
  try {
    const filename = getHistoryFilename(profileId);
    const { data: gist } = await octokit.gists.get({
      gist_id: gistId
    });
    
    if (gist.files && gist.files[filename] && gist.files[filename].content) {
      return JSON.parse(gist.files[filename].content);
    }
    // 如果没有对应的历史文件，返回空数组
    return [];
  } catch (error) {
    console.error(`从Gist加载历史失败 (Profile: ${profileId}):`, error);
    // 如果Gist本身不存在，也会抛错，这里返回空数组是安全的
    if (error.status === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * 从Gist中删除一个Profile的历史文件
 * @param {Octokit} octokit - Octokit实例
 * @param {string} gistId - Gist ID
 * @param {string} profileId - 配置ID
 */
export async function deleteHistoryFromGist(octokit, gistId, profileId) {
  try {
    const filename = getHistoryFilename(profileId);
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: null // 将文件名设置为null来删除文件
      }
    });
  } catch (error)
  {
    console.error(`删除Gist历史文件失败 (Profile: ${profileId}):`, error);
    // 即使文件不存在或删除失败，也不应阻塞流程
  }
}

/**
 * 初始化或获取配置Gist
 * @param {string} token - GitHub访问令牌
 * @returns {Promise<{octokit: Octokit, gistId: string}>} - 返回Octokit实例和Gist ID
 */
export async function initGistSync(token) {
  if (!token) {
    throw new Error('GitHub访问令牌不能为空');
  }
  
  const octokit = new Octokit({ auth: token });
  
  // 尝试查找现有的配置Gist
  let gistId = await findConfigGist(octokit);
  
  // 如果没有找到，创建一个新的
  if (!gistId) {
    // 获取本地设置和历史
    const localSettings = JSON.parse(localStorage.getItem('github-settings') || '{}');
    
    // 移除令牌信息再保存到Gist
    const settingsToSave = { ...localSettings };
    delete settingsToSave.token;
    
    // 创建新的Gist，只包含设置文件，不包含历史
    gistId = await createConfigGist(octokit, settingsToSave);
  }
  
  return { octokit, gistId };
} 