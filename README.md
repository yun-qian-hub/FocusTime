# FocusTime

一个简洁高效的个人任务管理和日程安排应用，帮助你更好地规划时间、管理任务。

## 功能模块

- **日历**：月视图日历，支持日程添加/编辑/删除、重复事件、完成标注、显示/隐藏已完成
- **待办**：任务管理，支持优先级（高/中/低）、搜索筛选、截止日期
- **笔记**：多彩笔记记录灵感想法，标签分类，加密记事本，支持放大编辑
- **闹钟**：多铃声提醒，支持重复设置，24小时时钟表盘
- **事件**：考试/比赛/活动等重要事件管理，支持颜色标记、类型筛选、优先级
- **周期**：周期性事件管理
- **课表**：课程表管理
- **番茄**：番茄钟专注计时，目标轮数自定义，专注时长统计
- **数据**：数据可视化看板，数据导出/导入/重置

## 技术栈

- Vue 3 + TypeScript
- Vite 5
- Pinia（状态管理）
- TailwindCSS 3
- Lucide Vue Next（图标）

## 快速开始

### 1. 安装 Node.js

确保安装了 Node.js（版本 18 或更高）：

- 下载地址：https://nodejs.org/
- 安装完成后命令行输入 `node -v` 确认安装成功

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

浏览器打开 `http://localhost:5173/` 即可使用。

### 5. 构建生产版本

```bash
npm run build
```

### 6. 预览生产版本

```bash
npm run preview
```

## 项目结构

```
src/
├── components/           # 组件目录
│   ├── Calendar/        # 日历
│   ├── Todo/            # 待办
│   ├── Notes/           # 笔记 + 加密记事本
│   ├── Alarm/           # 闹钟
│   ├── Important/       # 事件
│   ├── Period/          # 周期事件
│   ├── Schedule/        # 课表
│   ├── Pomodoro/        # 番茄钟
│   ├── DataManager/     # 数据管理
│   └── Layout/          # 布局（侧边栏）
├── stores/              # Pinia 状态管理
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数（存储、颜色）
├── App.vue              # 根组件
├── main.ts              # 入口文件
└── style.css            # 全局样式
```

## 数据持久化

应用使用 localStorage 进行数据持久化，数据保存在浏览器本地，无需后端服务。

## License

MIT
