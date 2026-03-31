---
name: auto_installer
description: Help users install and configure Claude Code Boost skills and MCP server through natural conversation. Just tell OpenClaw to install, and it handles everything.
---

# Auto Installer — 对话式安装助手

当用户提到以下任何一种说法时，自动触发安装流程：
- "安装 Claude Code Boost"
- "安装技能" / "安装 skills"
- "帮我配置 MCP"
- "install claude code boost"
- "setup skills"

## 安装流程

### 步骤 1：检查环境

使用 `exec` 工具运行以下命令，检查是否满足要求：

```bash
node -v
```

如果 Node.js 未安装，告诉用户：
> "需要先安装 Node.js。去 https://nodejs.org/ 下载最新版，安装后再来找我！"

### 步骤 2：下载项目

检查项目是否已存在：

```bash
ls ~/claude-code-boost 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"
```

如果不存在，帮用户下载：

```bash
cd ~ && git clone https://github.com/bcefghj/claude-code-boost.git
```

告诉用户：
> "正在从 GitHub 下载 Claude Code Boost 项目..."

### 步骤 3：构建 MCP Server

```bash
cd ~/claude-code-boost/mcp-server && npm install && npm run build
```

告诉用户：
> "正在编译 MCP Server，这需要几秒钟..."

### 步骤 4：安装 Skills

```bash
mkdir -p ~/.openclaw/workspace/skills
cp -r ~/claude-code-boost/skills/* ~/.openclaw/workspace/skills/
```

告诉用户：
> "正在安装 6 个智能技能..."

### 步骤 5：配置 MCP Server

检查配置文件是否存在：

```bash
cat ~/.openclaw/openclaw.json 2>/dev/null || echo "NO_CONFIG"
```

如果没有配置文件，创建它：

```bash
mkdir -p ~/.openclaw
cat > ~/.openclaw/openclaw.json << 'EOF'
{
  "mcpServers": {
    "claude-code-boost": {
      "command": "node",
      "args": ["HOME_PATH/claude-code-boost/mcp-server/dist/index.js"],
      "transport": "stdio"
    }
  }
}
EOF
```

注意：把 `HOME_PATH` 替换成用户的实际家目录路径（通过 `echo $HOME` 获取）。

如果已有配置文件，在其中添加 claude-code-boost 配置，不要覆盖现有的 MCP 服务器。

### 步骤 6：完成

告诉用户：

> "安装完成！我已经获得了 6 个超能力：
> 1. 智能路由 - 我能自动找到最合适的工具
> 2. 权限守卫 - 我会在执行危险操作前检查权限
> 3. 预算追踪 - 我会帮你监控 token 消耗
> 4. 会话记忆 - 我能记住之前的工作进度
> 5. 代码审计 - 我能扫描项目了解处理进度
> 6. 自动安装 - 就是刚才帮你完成的这个！
>
> 请重启我（运行 `openclaw gateway restart`），然后我就能使用这些新技能了！"

## 重要提示

- 每一步都要告诉用户正在做什么，让他们知道进度
- 如果任何步骤失败，用简单的语言解释问题和解决方法
- 不要用技术术语，说"下载"不说"clone"，说"编译"不说"build"
- 安装完成后，主动演示一个技能（比如用 smart_route 分析用户的一个请求）
