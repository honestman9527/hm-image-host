# HM 图床 - 专业、易用的 GitHub 图床应用

HM 图床是一个现代化、功能丰富的图床应用，它允许您使用自己的 GitHub 仓库作为稳定、免费的图片存储空间。无论您是博主、开发者还是需要频繁分享图片的用户，HM 图床都能提供专业、高效的解决方案。

![屏幕截图 2025-06-14 104006.jpg](https://cdn.944986.xyz/zhizun62/images1/main/test/20250614_ldprv21K.webp)
![屏幕截图 2025-06-14 104021.jpg](https://cdn.944986.xyz/zhizun62/images1/main/test/20250614_kj8e6Bk5.webp)
*(请将上方截图链接替换为您自己的项目截图)*

## ✨ 功能特性

- **多种上传方式**：支持拖拽、点击选择、批量上传图片。
- **自动压缩**：在上传前智能压缩图片，节省存储空间和访问流量。
- **高度可配置**：
    -   自定义 GitHub 仓库、分支和存储路径。
    -   支持自定义 CDN 或图床加速域名。
- **强大的图片管理**：
    -   提供**网格**和**时间线**两种视图，方便浏览和管理。
    -   支持按文件名搜索和按日期范围筛选。
- **多种链接格式**：一键生成和复制 `URL`, `Markdown`, `HTML` 等多种格式的链接。
- **☁️ 云同步**：
    -   使用 GitHub Gist 在多设备间同步您的配置和上传历史。
    -   一次配置，处处使用。
- **现代化体验**：
    -   内置**亮色**与**暗色**主题，随心切换。
    -   支持**中/英**双语。
    -   完全响应式设计，在桌面和移动设备上均有完美体验。

## 🚀 技术栈

- **前端框架**: [React](https://reactjs.org/)
- **UI 组件库**: [Ant Design](https://ant.design/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **路由**: [React Router](https://reactrouter.com/)
- **GitHub API**: [Octokit.js](https://github.com/octokit/octokit.js)
- **状态管理**: React Context

## 🛠️ 开始使用

### 1. 准备 GitHub 个人访问令牌

您需要一个具有 `repo` 和 `gist` 权限的 GitHub 个人访问令牌 (Personal Access Token)。

1.  访问 [GitHub 令牌设置页面](https://github.com/settings/tokens)。
2.  点击 "Generate new token"，选择 "Generate new token (classic)"。
3.  在 "Note" 中填写一个方便记忆的名称，例如 `hm-image-hosting`。
4.  在 "Select scopes" 中，务必勾选以下两个权限：
    -   `repo`：用于读写您的图片仓库。
    -   `gist`：用于云同步您的配置和历史记录。
5.  点击 "Generate token" 并复制生成的令牌。**请注意，这个令牌只会显示一次，请妥善保管。**

### 2. 配置应用

1.  打开应用的**设置**页面。
2.  将上一步生成的令牌粘贴到 "GitHub 访问令牌" 输入框中。
3.  填写您用于存储图片的 GitHub 用户名（或组织名）、仓库名和分支。如果仓库不存在，您需要先在 GitHub 上创建。
4.  （可选）填写图片在仓库中存储的路径，例如 `images` 或 `assets/blog`。
5.  （可选）如果您使用了 CDN 服务来加速 GitHub 仓库的访问，可以将您的 CDN 域名填入"自定义 CDN 域名"中。
6.  点击**保存设置**。

### 3. 开始上传

返回首页，现在您可以开始上传图片了！上传成功后，您可以在下方的历史记录中找到图片并复制链接。

## ☁️ 关于云同步

当您启用"云同步"功能后，应用会：
1.  在您的 GitHub Gist 中创建一个私有的 Gist，用于存储配置文件和上传历史。
2.  在您每次修改设置或上传图片后，自动将数据同步到该 Gist。
3.  当您在新的设备上登录时，应用会自动从 Gist 拉取数据，恢复您的工作环境。

要使用此功能，请确保您的 GitHub 令牌包含了 `gist` 权限。

## 部署

您可以轻松地将此项目部署到任何支持静态网站的平台，例如 [Vercel](https://vercel.com/), [Netlify](https://www.netlify.com/) 或 [Cloudflare Pages](https://pages.cloudflare.com/)。

### 环境变量

为了增强安全性，建议将 GitHub 令牌配置为环境变量。在部署平台的环境变量设置中，添加一个名为 `VITE_GITHUB_TOKEN` 的变量，并将其值设为您的令牌。应用会自动读取此环境变量。
