# 架构解析：从 Claude Code 源码（claw-code）中学到了什么

本文档详细解析 claw-code 仓库中值得借鉴的设计模式，以及我们如何将这些模式移植到 OpenClaw 工具包中。

---

## 背景

[claw-code](https://github.com/instructkr/claw-code) 是社区对 Claude Code Agent 架构的 Python clean-room 重写。虽然它不是完整可运行的 Claude Code 替代品，但其代码中蕴含了大量来自真实生产环境的架构智慧。

我们重点研究了以下源文件：

| 文件 | 包含的设计模式 |
|------|----------------|
| `runtime.py` | 智能路由、会话编排、流式事件 |
| `permissions.py` | 不可变策略对象、前缀匹配 |
| `query_engine.py` | 预算控制、停止原因、会话压缩 |
| `session_store.py` | 会话持久化、JSON 存储 |
| `parity_audit.py` | 文件级覆盖率审计 |
| `models.py` | 共享数据模型、不可变值对象 |
| `execution_registry.py` | 统一注册表模式 |
| `transcript.py` | 对话记录与压缩 |

---

## 模式 1：评分路由（Score-Based Routing）

### 原始代码

```python
# claw-code/src/runtime.py
class PortRuntime:
    @staticmethod
    def _score(tokens: set[str], module: PortingModule) -> int:
        haystacks = [module.name.lower(), module.source_hint.lower(),
                     module.responsibility.lower()]
        score = 0
        for token in tokens:
            if any(token in haystack for haystack in haystacks):
                score += 1
        return score
```

### 核心思想

1. 把用户的自然语言 prompt 拆分成 token 集合
2. 对每个工具/命令，检查有多少 token 出现在其名称、来源、职责描述中
3. 选择得分最高的匹配项
4. 保证至少选出一个 command 和一个 tool（如果有匹配的话）

### 我们的移植

```typescript
// mcp-server/src/utils/scorer.ts
function scoreEntry(tokens: Set<string>, entry: ToolEntry): number {
  const haystacks = [
    entry.name.toLowerCase(),
    entry.sourceHint.toLowerCase(),
    entry.responsibility.toLowerCase(),
  ];
  let score = 0;
  for (const token of tokens) {
    if (haystacks.some((h) => h.includes(token))) {
      score += 1;
    }
  }
  return score;
}
```

### 为什么有用

当 Agent 可以使用几十个工具时，盲目扫描所有工具的 schema 消耗大量 token。评分路由用简单的关键词匹配快速缩小范围，把几十个工具筛选到 3-5 个候选项，极大减少 token 浪费。

---

## 模式 2：不可变策略对象（Immutable Policy Object）

### 原始代码

```python
# claw-code/src/permissions.py
@dataclass(frozen=True)
class ToolPermissionContext:
    deny_names: frozenset[str] = field(default_factory=frozenset)
    deny_prefixes: tuple[str, ...] = ()

    def blocks(self, tool_name: str) -> bool:
        lowered = tool_name.lower()
        return (lowered in self.deny_names or
                any(lowered.startswith(prefix) for prefix in self.deny_prefixes))
```

### 核心思想

- 权限策略是**不可变的**（`frozen=True`），一旦创建就不能修改
- 支持两种匹配方式：精确名称匹配（`deny_names`）和前缀匹配（`deny_prefixes`）
- 接口极简：只有一个 `blocks(name) -> bool` 方法
- 策略与工具实现完全解耦

### 为什么有用

把权限逻辑从工具实现中抽离出来，使得：
- 可以在不修改工具代码的情况下调整权限
- 权限策略可以序列化/传输/存储
- 容易在测试中 mock

---

## 模式 3：预算控制引擎（Budget Control Engine）

### 原始代码

```python
# claw-code/src/query_engine.py
@dataclass(frozen=True)
class QueryEngineConfig:
    max_turns: int = 8
    max_budget_tokens: int = 2000
    compact_after_turns: int = 12

@dataclass(frozen=True)
class TurnResult:
    prompt: str
    output: str
    usage: UsageSummary
    stop_reason: str  # 'completed' | 'max_turns_reached' | 'max_budget_reached'
```

### 核心思想

1. **配置不可变**：`QueryEngineConfig` 用 `frozen=True`，运行时不会被意外修改
2. **显式停止原因**：每次对话轮次的结果都包含 `stop_reason`，明确告诉上层"为什么停了"
3. **自动压缩**：当消息数超过 `compact_after_turns` 时，自动截断旧消息
4. **预算预判**：在执行前计算预期 token 用量，如果会超支就提前停止

### 为什么有用

没有预算控制，一个复杂任务可能在 Agent 不知不觉中消耗大量 token。预算引擎让 Agent 有了"成本意识"，能在资源耗尽前做出合理决策。

---

## 模式 4：流式事件协议（Tagged Event Streaming）

### 原始代码

```python
# claw-code/src/query_engine.py
def stream_submit_message(self, prompt, ...):
    yield {'type': 'message_start', 'session_id': self.session_id}
    yield {'type': 'command_match', 'commands': matched_commands}
    yield {'type': 'tool_match', 'tools': matched_tools}
    yield {'type': 'permission_denial', 'denials': [...]}
    yield {'type': 'message_delta', 'text': result.output}
    yield {'type': 'message_stop', 'usage': {...}, 'stop_reason': ...}
```

### 核心思想

用 Python 生成器（generator）产出**带类型标签的事件对象**。每个事件都有 `type` 字段标识其类别。这种模式可以直接映射到：
- SSE（Server-Sent Events）用于 Web UI
- WebSocket 消息
- MCP 协议的通知机制

### 为什么有用

让前端/调用方可以实时展示 Agent 的工作进度，而不是等待整个操作完成。

---

## 模式 5：会话持久化（Session Persistence）

### 原始代码

```python
# claw-code/src/session_store.py
@dataclass(frozen=True)
class StoredSession:
    session_id: str
    messages: tuple[str, ...]
    input_tokens: int
    output_tokens: int

def save_session(session: StoredSession) -> Path:
    path = DEFAULT_SESSION_DIR / f'{session.session_id}.json'
    path.write_text(json.dumps(asdict(session), indent=2))
    return path
```

### 核心思想

- 会话状态用值对象表示（`frozen` dataclass）
- 持久化为简单的 JSON 文件
- 使用 session_id 作为文件名
- 支持从文件恢复（`load_session`）

### 为什么有用

AI Agent 最大的弱点之一是"健忘"——每次对话都从零开始。会话持久化让 Agent 可以在多次对话之间保持上下文，适合持续性工作。

---

## 模式 6：统一注册表（Unified Registry）

### 原始代码

```python
# claw-code/src/execution_registry.py
@dataclass(frozen=True)
class ExecutionRegistry:
    commands: tuple[MirroredCommand, ...]
    tools: tuple[MirroredTool, ...]

    def command(self, name: str) -> MirroredCommand | None:
        lowered = name.lower()
        for command in self.commands:
            if command.name.lower() == lowered:
                return command
        return None
```

### 核心思想

- 所有可执行项（命令 + 工具）注册到统一的 Registry 中
- 按名称查找，大小写不敏感
- Registry 本身不可变，只在启动时构建一次
- 查找返回 `None` 而非抛异常

### 为什么有用

统一的注册表让你可以：
- 在一个地方看到所有可用能力
- 轻松做权限过滤（在 Registry 上套一层 filter）
- 便于测试（mock 整个 Registry）
- 支持插件化（动态注册新条目）

---

## 整体架构流程

```
用户输入 prompt
    ↓
[评分路由] — 从工具目录中找到最佳匹配
    ↓
[权限检查] — 过滤掉被禁止的工具
    ↓
[预算检查] — 确认还有剩余预算
    ↓
[执行工具] — 调用匹配的工具
    ↓
[记录结果] — 更新 token 用量、添加到 transcript
    ↓
[判断停止] — 检查是否达到预算/轮次上限
    ↓
[持久化] — 保存会话状态以便恢复
```

这就是 Claude Code 运行时的核心循环，我们把其中每个环节都做成了独立的 MCP 工具，让 OpenClaw 也能拥有同样的"工程智慧"。

---

## 总结

从 claw-code 学到的不是某个具体功能的实现，而是**如何组织一个 AI Agent 的运行时系统**：

1. 工具目录化、单一真相源
2. 不可变配置 + 可变状态，清晰的边界
3. 显式停止原因，不隐藏系统决策
4. 权限与执行解耦
5. 会话状态可持久化、可恢复
6. 流式事件便于实时 UI

这些模式组合在一起，让一个 AI Agent 从"能用"变成"好用"。
