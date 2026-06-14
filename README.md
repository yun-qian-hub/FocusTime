# FocusTime

一个简洁高效的个人任务管理和日程安排应用，帮助你更好地规划时间、管理任务。

## ✨ 功能特性

- 📅 **日历管理**：直观的日历视图，支持添加、编辑、删除日程，支持重复事件
- ✅ **待办事项**：灵活的任务管理，支持优先级设置和完成状态追踪
- 📝 **便签**：多彩便签，记录灵感和想法，支持标签分类
- ⏰ **闹钟**：多种铃声选择，支持重复提醒，准时响铃提醒
- ⭐ **重要事件**：标记考试、比赛、活动等重要事件，支持颜色标记和筛选
- 💾 **数据管理**：一键导出/导入数据，支持数据重置

## 🛠️ 技术栈

- Vue 3 + TypeScript
- Vite 5
- Pinia（状态管理）
- TailwindCSS 3
- Lucide Vue Next（图标）

## 🚀 快速开始

### 1. 安装 Node.js

首先确保你的电脑上安装了 Node.js（版本 18 或更高）：

- 下载地址：https://nodejs.org/
- 安装完成后打开命令行，输入 `node -v` 确认安装成功

### 2. 克隆项目

```bash
git clone https://github.com/yun-qian-hub/FocusTime.git
cd FocusTime
```

### 3. 安装依赖

```bash
npm install
```

### 4. 启动开发服务器

```bash
npm run dev
```

启动后会显示类似这样的信息：

```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

在浏览器中打开 `http://localhost:5173/` 即可使用。

### 5. 构建生产版本

如果你需要部署到服务器：

```bash
npm run build
```

构建完成后，`dist` 目录就是可以部署的静态文件。

### 6. 预览生产版本

```bash
npm run preview
```

## 📁 项目结构

```
src/
├── components/           # 组件目录
│   ├── Calendar/        # 日历组件
│   ├── Todo/            # 待办事项组件
│   ├── Notes/           # 便签组件
│   ├── Alarm/           # 闹钟组件
│   ├── Important/       # 重要事件组件
│   ├── DataManager/     # 数据管理组件
│   └── Layout/          # 布局组件
├── stores/              # Pinia 状态管理
├── types/               # TypeScript 类型定义
├── App.vue              # 根组件
├── main.ts              # 入口文件
└── style.css            # 全局样式
```

## 📱 界面预览

### 日历视图
- 月视图展示，清晰查看整个月的日程
- 有事件的日期自动变色，方便识别
- 双击或右键快速添加日程
- 支持自定义日期格子颜色

### 待办事项
- 按优先级分类（高、中、低）
- 支持搜索和筛选
- 一键完成任务

### 便签
- 多种颜色可选
- 支持标签分类
- 拖拽排序

### 闹钟
- 多种铃声选择
- 支持重复设置（每天、工作日、周末）
- 准时提醒

### 重要事件
- 5种事件类型（考试、比赛、活动、截止、其他）
- 支持颜色标记和筛选
- 一键导入到待办事项

## 📄 数据持久化

应用使用 localStorage 进行数据持久化，数据保存在浏览器本地，无需后端服务。

## 📝 License

MIT
