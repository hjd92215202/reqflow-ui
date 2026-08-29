# ReqFlow Desktop Client (reqflow-ui)

<p align="center">
  <img src="./src/assets/logo.png" alt="ReqFlow Logo" width="96" height="96">
</p>

<p align="center">
  <strong>专为工程师与产研团队打造的下一代私有化自托管需求追踪、阶段协同与 Wiki 沉淀工作台</strong>
</p>

<p align="center">
  <a href="https://v2.tauri.app/"><img src="https://img.shields.io/badge/Tauri-v2.0-24C8D8?style=flat-square&logo=tauri&logoColor=white" alt="Tauri"></a>
  <a href="https://vuejs.org/"><img src="https://img.shields.io/badge/Vue-3.4+-4FC08D?style=flat-square&logo=vue.js&logoColor=white" alt="Vue 3"></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5.0+-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"></a>
  <a href="https://element-plus.org/"><img src="https://img.shields.io/badge/Element--Plus-2.5+-409EFF?style=flat-square&logo=element-plus&logoColor=white" alt="Element Plus"></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust-2021-DEA584?style=flat-square&logo=rust&logoColor=white" alt="Rust"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License"></a>
</p>

---

## 💡 核心架构理念：Self-Hosted & 100% 数据主权

企业的需求排期、代码设计方案和实施复盘属于核心资产。**ReqFlow** 坚定践行 **“Bring Your Own Backend”** 的私有化自托管架构：
- 🏢 **零数据外流**：绝不依赖中心化公有云 SaaS，后端一键部署在您的内网服务器或个人私有云上。
- 🖥️ **跨平台原生桌面体验**：基于 **Rust + Tauri v2** 构建，内存占用相比 Electron 骤降 90%，冷启动毫秒级响应。
- 🔗 **一键接入**：客户端内置私有化节点切换器，配置一次永久记住。

---

## ✨ 核心特性

### 1. 📋 需求全生命周期管理 (Requirement Hub)
- **实时手柄拖拽排序**：鼠标按住排序手柄即可上下滑动实时重排优先级，自动持久化。
- **阶段完成度透视**：迷你进度条实时汇总子阶段与任务完成比率，全局进展一览无余。
- **状态流转矩阵**：支持待处理、进行中、测试中、已上线、挂起等多态管理。

### 2. 📍 树形协同工作矩阵 (Work Matrix)
- **Excel 级原地即时编辑**：双击阶段名称原地重命名、点击日期快速唤起排期选择、回车即刻原子级落库。
- **树形任务无限拆解**：支持主子任务多层级递归拆解 (`SubTask Tree`)。
- **PostgreSQL JSONB 动态扩展列**：无需重启后端或修改数据库，即可直接在客户端动态“➕ 添加扩展列”（如测试负责人、Bug单号、设计稿Link等），并支持列级高级筛选与删除。

### 3. ✅ 智能双模待办中心 (Smart Todo Center)
- **日常与项目待办统一协同**：
  - **日常个人待办**：极速输入框按 `Enter` 秒级记录个人待办。
  - **需求派生待办**：自动拉取工作矩阵中指派给当前用户的子任务，支持一键直达矩阵现场。
- **完成进度分析看板**：环形动态仪表盘、待办分类分布与逾期预警提示。

### 4. 📖 项目 Wiki 沉淀与安全分享 (Wiki Library)
- **三模 Markdown 编辑器**：支持纯编辑 (`EDIT`)、双栏实时分屏 (`SPLIT`)、纯沉浸式阅读 (`PREVIEW`)。
- **工程化标准模板**：一键套用《🛠️ 技术架构方案》、《⚠️ 踩坑与排坑记录》、《🎯 项目实施复盘》、《📝 需求变更说明》。
- **双级收缩布局**：左侧目录树与分类列表均支持平滑折叠，释放最大阅读视口。
- **🔒 随机令牌安全分享 (Token-Based Sharing)**：生成基于 16 位不可逆随机 Token 的只读分享链接，彻底防枚举与爬虫，外部浏览器免登录直接秒开完整 Markdown 网页。

### 5. 🪟 工业级桌面原生交互
- **窗口控制智能分发**：彻底解决拖动窗口与双击最大化/全屏事件冲突。
- **多平台自适应**：macOS 自动让位贴合红黄绿原生胶囊灯，Windows/Linux 渲染 Fluent 规范控制键。

---

## 🛠️ 技术栈

| 领域 | 技术方案 | 说明 |
| :--- | :--- | :--- |
| **Desktop Core** | [Tauri v2.0](https://v2.tauri.app/) + [Rust](https://www.rust-lang.org/) | 轻量、高安全、极低系统资源占用 |
| **Frontend Framework** | [Vue 3](https://vuejs.org/) (`<script setup>` + SFC) | 渐进式响应式前端框架 |
| **Build Tool** | [Vite 5](https://vitejs.dev/) | 极速热更新与现代前端构建工具 |
| **State Management** | [Pinia](https://pinia.vuejs.org/) | 类型安全、轻量化全局状态管理 |
| **UI Components** | [Element Plus](https://element-plus.org/) | 全面深度汉化、精细化桌面端定制样式 |
| **Routing** | [Vue Router 4](https://router.vuejs.org/) | Hash 路由驱动，支持外部只读免登录访问 |
| **Network** | [Axios](https://axios-http.com/) | 动态后端 BaseURL 拼接与 JWT 拦截器 |

---

## 🚀 本地开发与运行

### 1. 环境准备
确保您的本地环境安装了以下工具链：
- **Node.js**: `v18.0.0+` (推荐 `v20.x`)
- **Rust & Cargo**: 最新稳定版（安装参考 [rustup.rs](https://rustup.rs/)）
- **C/C++ 编译工具**（Windows 下需 Visual Studio C++ 工具包，macOS 下需 Xcode Command Line Tools）

### 2. 克隆并安装依赖
```bash
git clone https://github.com/hjd92215202/reqflow-ui.git
cd reqflow-ui

# 安装前端依赖
npm install
```

### 3. 本地启动

#### 方式 A：纯前端 Web 调试模式（浏览器环境）
```bash
npm run dev
```
*本地将启动 Vite 服务于 `http://localhost:5173`。*

#### 方式 B：桌面端原生环境调试（推荐）
```bash
npm run tauri:dev
```
*Tauri 将自动编译 Rust 壳并拉起原生的桌面工作台窗口。*

---

## 📦 跨平台打包构建

构建完成的安装包将输出在 `src-tauri/target/release/bundle/` 目录下：

### 🪟 Windows (.exe / .msi)
```bash
npm run tauri:build
```

### 🍎 macOS (.dmg / .app)
支持一键打包支持 Intel 与 Apple Silicon 的双架构通用安装包：
```bash
# 安装 macOS 交叉编译目标
rustup target add x86_64-apple-darwin aarch64-apple-darwin

# 构建 Universal 通用架构安装包
npm run tauri:build -- --target universal-apple-darwin
```

---

## 📁 目录结构导览

```text
reqflow-ui/
├── .github/workflows/      # GitHub Actions CI/CD 自动构建与发布
├── src-tauri/              # Tauri Rust 桌面端核心源码与配置
│   ├── capabilities/       # Tauri 权限与窗口控制声明
│   ├── icons/              # 多平台各尺寸高清应用图标
│   ├── Cargo.toml          # Rust 依赖声明
│   └── tauri.conf.json     # 桌面应用窗口、打包参数配置
├── src/
│   ├── api/                # 全模块 HTTP 接口封装 (Auth, Req, Matrix, Todo, Wiki)
│   ├── assets/             # 全局静态资源与 Notion/VSCode 风格样式
│   ├── components/         # 共享组件
│   ├── router/             # 路由配置 (含 /share/wiki/:token 独立只读路由)
│   ├── store/              # Pinia 状态库 (用户 Token & 私有化 ServerUrl 持久化)
│   ├── views/
│   │   ├── Login.vue             # 极简账密登录 & 独立服务器设置弹窗
│   │   ├── MainLayout.vue        # 桌面骨架 (自定义 TitleBar、48px 侧栏与状态栏)
│   │   ├── RequirementList.vue   # 需求管理 (支持拖拽排序与阶段完成率汇总)
│   │   ├── WorkMatrix.vue        # 树形工作矩阵 (就地改名、动态列扩展、排期修改)
│   │   ├── TodoList.vue          # 个人/需求待办中心 (进行中流转与数据看板)
│   │   ├── WikiLibrary.vue       # 知识库工作区 (三模 Markdown、模板与可折叠目录)
│   │   └── WikiShareView.vue     # 免登录公开只读 Markdown 分享页面
│   ├── App.vue             # 根入口 (Element Plus 全局中文国际化注入)
│   └── main.js             # Vue 实例初始化
├── package.json
└── vite.config.js
```

---

## 🤝 参与贡献

我们非常欢迎社区开发者提交 Pull Request 或报告 Issue！

1. Fork 本仓库并新建功能分支：`git checkout -b feature/AmazingFeature`
2. 提交你的修改：`git commit -m 'Add some AmazingFeature'`
3. 推送至分支：`git push origin feature/AmazingFeature`
4. 发起 Pull Request

---

## 📄 开源许可证

本项目基于 [MIT License](./LICENSE) 协议开源。