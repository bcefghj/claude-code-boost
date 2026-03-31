# 项目配置文件模板

> 这个文件放在你项目的根目录，用于告诉 AI Agent 关于你项目的重要信息。
> 类似于 Claude Code 的 CLAUDE.md，OpenClaw 会自动读取工作区内的配置文件。

## 项目信息

- 项目名称：[你的项目名]
- 主要语言：[Python / TypeScript / Go / ...]
- 包管理器：[npm / pip / cargo / ...]

## 常用命令

```bash
# 安装依赖
npm install

# 运行开发服务器
npm run dev

# 运行测试
npm test

# 构建生产版本
npm run build

# 代码检查
npm run lint
```

## 项目结构

```
src/           # 源代码
tests/         # 测试文件
docs/          # 文档
config/        # 配置文件
```

## 编码规范

- 使用 ESLint + Prettier 进行代码格式化
- 所有新功能需要编写单元测试
- 提交信息使用约定式提交 (Conventional Commits)
- 分支命名：feature/xxx, fix/xxx, docs/xxx

## 安全规则

- 不要在代码中硬编码密钥或密码
- 不要执行 `rm -rf` 命令
- 数据库操作前先备份
- 不要修改 .env 文件中的生产环境配置

## ClawCode Boost 工具使用说明

本项目已配置 clawcode-boost MCP Server，提供以下增强功能：

1. **智能路由 (smart_route)**：自动选择最佳工具
2. **权限守卫 (permission_check)**：执行危险操作前自动检查
3. **预算追踪 (budget_tracker)**：监控 token 消耗
4. **会话记忆 (session_manager)**：保存和恢复工作进度
5. **代码审计 (parity_audit)**：跟踪代码覆盖率

Agent 应该在每次会话开始时创建预算追踪，在执行危险操作前检查权限。
