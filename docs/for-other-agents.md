# 其他 AI Agent 使用指南

本项目的 MCP Server 遵循标准 Model Context Protocol，不仅限于 OpenClaw。任何支持 MCP 协议的 AI Agent 都可以使用。

---

## 通用 MCP 接入方式

### 最低要求

- Node.js >= 18
- MCP 客户端支持 `stdio` transport
- 构建好的 `dist/index.js` 文件

### 启动命令

```bash
node /path/to/openclaw-clawcode-boost/mcp-server/dist/index.js
```

Server 通过 stdin/stdout 进行 MCP 通信，不需要网络端口。

---

## Cursor 中使用

### 方法 1：通过 MCP 配置文件

在项目根目录创建 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "claude-code-boost": {
      "command": "node",
      "args": ["/path/to/openclaw-clawcode-boost/mcp-server/dist/index.js"]
    }
  }
}
```

### 方法 2：全局配置

编辑 `~/.cursor/mcp.json`（所有项目共享）：

```json
{
  "mcpServers": {
    "claude-code-boost": {
      "command": "node",
      "args": ["/path/to/openclaw-clawcode-boost/mcp-server/dist/index.js"]
    }
  }
}
```

配置后重启 Cursor，Agent 模式下会自动发现并使用这些工具。

### 配合 Cursor Skills 使用

把 `skills/` 目录下的 SKILL.md 文件内容转换为 Cursor Rules：

1. 创建 `.cursor/rules/` 目录
2. 把每个 SKILL.md 的内容复制到对应的 `.mdc` 文件中
3. 例如 `skills/permission-guard/SKILL.md` 变成 `.cursor/rules/permission-guard.mdc`

---

## Windsurf / Cline 中使用

这些编辑器也支持 MCP 配置。在各自的设置文件中添加类似配置：

### Windsurf

在 `~/.windsurf/mcp_config.json` 中添加：

```json
{
  "mcpServers": {
    "claude-code-boost": {
      "command": "node",
      "args": ["/path/to/openclaw-clawcode-boost/mcp-server/dist/index.js"],
      "transport": "stdio"
    }
  }
}
```

### Cline

在 Cline 设置面板中的 MCP Servers 部分添加同样的配置。

---

## Claude Desktop 中使用

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）或对应的 Windows/Linux 路径：

```json
{
  "mcpServers": {
    "claude-code-boost": {
      "command": "node",
      "args": ["/path/to/openclaw-clawcode-boost/mcp-server/dist/index.js"]
    }
  }
}
```

重启 Claude Desktop 后即可使用。

---

## 自定义 Agent 集成

如果你在开发自己的 AI Agent，以下是集成指南。

### 使用 MCP SDK 连接

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["/path/to/openclaw-clawcode-boost/mcp-server/dist/index.js"],
});

const client = new Client({ name: "my-agent", version: "1.0.0" });
await client.connect(transport);

// 列出可用工具
const tools = await client.listTools();
console.log(tools);

// 调用智能路由
const result = await client.callTool({
  name: "smart_route",
  arguments: { prompt: "read and edit a config file", limit: 3 },
});
console.log(result);
```

### 不使用 MCP SDK（直接 JSON-RPC）

MCP 本质上是 JSON-RPC 2.0 over stdio。你可以直接通过 stdin/stdout 发送和接收 JSON-RPC 消息：

```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "smart_route", "arguments": {"prompt": "search for files", "limit": 3}}}
```

---

## 不使用 MCP 的情况

如果你的 Agent 不支持 MCP，仍然可以从本项目受益：

### 1. 提取设计模式

阅读 [architecture.md](architecture.md) 了解 6 个核心设计模式，在自己的代码中实现。

### 2. 使用 Skills 作为 Prompt 模板

`skills/` 目录下的 SKILL.md 文件本质上是结构化的 prompt 指导。你可以：
- 把它们直接嵌入到你的 system prompt 中
- 在需要时按需加载（类似 RAG）
- 改写成你的 Agent 框架的格式

### 3. 复用评分算法

`mcp-server/src/utils/scorer.ts` 中的评分算法是独立的纯函数，可以直接复制到任何 TypeScript/JavaScript 项目中使用。

---

## 可用工具速查表

| 工具名 | 用途 | 典型输入 |
|--------|------|----------|
| `smart_route` | 智能匹配最佳工具 | `{ prompt: "...", limit: 5 }` |
| `permission_check` | 检查工具是否被允许 | `{ tool_name: "BashTool" }` |
| `permission_update` | 更新权限策略 | `{ deny_names: [...], deny_prefixes: [...] }` |
| `budget_tracker` | 预算追踪 | `{ action: "create/record/status/reset", ... }` |
| `session_manager` | 会话管理 | `{ action: "save/load/list", ... }` |
| `parity_audit` | 代码审计 | `{ directory: "/path/to/project" }` |

---

## 常见集成问题

### Q: Server 启动后没有输出？

正常。MCP Server 通过 stdio 通信，不会在终端打印内容。调试信息会输出到 stderr。

### Q: 工具调用返回错误？

检查：
1. Node.js 版本是否 >= 18
2. 是否运行了 `npm run build`
3. 路径是否正确（使用绝对路径）

### Q: 如何查看 Server 日志？

运行时添加 `2>server.log` 重定向 stderr：

```bash
node /path/to/dist/index.js 2>server.log
```

### Q: 可以同时给多个 Agent 使用吗？

每个 Agent 需要启动独立的 Server 进程（各自的 stdio 通道）。预算和会话数据通过文件系统共享，不同进程可以读取同一份会话文件。
