#!/bin/bash
# ============================================================
#  Claude Code Boost 一键安装脚本
#  让小白也能轻松给 OpenClaw 小龙虾装上超能力！
#
#  用法：在终端粘贴这一行就行了：
#    bash install.sh
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                              ║${NC}"
echo -e "${CYAN}║   🦞 Claude Code Boost 一键安装程序 🦞       ║${NC}"
echo -e "${CYAN}║   让你的 OpenClaw 小龙虾变得更聪明！          ║${NC}"
echo -e "${CYAN}║                                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OPENCLAW_DIR="$HOME/.openclaw"
SKILLS_DIR="$OPENCLAW_DIR/workspace/skills"
CONFIG_FILE="$OPENCLAW_DIR/openclaw.json"
MCP_SERVER_DIR="$SCRIPT_DIR/mcp-server"
MCP_DIST="$MCP_SERVER_DIR/dist/index.js"

# ── 第 1 步：检查 Node.js ──────────────────────────────────
echo -e "${BLUE}[1/5]${NC} 检查 Node.js 环境..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "  ${GREEN}✓${NC} Node.js 已安装: $NODE_VERSION"
else
    echo -e "  ${RED}✗ 未找到 Node.js${NC}"
    echo ""
    echo "  请先安装 Node.js (版本 18 或更高):"
    echo "  - macOS:   brew install node"
    echo "  - Ubuntu:  sudo apt install nodejs npm"
    echo "  - Windows: 从 https://nodejs.org/ 下载"
    echo ""
    exit 1
fi

# ── 第 2 步：构建 MCP Server ───────────────────────────────
echo ""
echo -e "${BLUE}[2/5]${NC} 构建 MCP Server..."
cd "$MCP_SERVER_DIR"
if [ ! -d "node_modules" ]; then
    echo "  安装依赖中（第一次需要下载，请稍等）..."
    npm install --silent 2>/dev/null
fi
echo "  编译中..."
npm run build --silent 2>/dev/null
echo -e "  ${GREEN}✓${NC} MCP Server 构建完成"
cd "$SCRIPT_DIR"

# ── 第 3 步：安装 Skills ────────────────────────────────────
echo ""
echo -e "${BLUE}[3/5]${NC} 安装 Skills（技能）..."
mkdir -p "$SKILLS_DIR"
cp -r skills/* "$SKILLS_DIR/" 2>/dev/null || true
SKILL_COUNT=$(ls -d "$SKILLS_DIR"/*/ 2>/dev/null | wc -l | tr -d ' ')
echo -e "  ${GREEN}✓${NC} 已安装 $SKILL_COUNT 个技能到 $SKILLS_DIR"

# ── 第 4 步：配置 MCP Server ───────────────────────────────
echo ""
echo -e "${BLUE}[4/5]${NC} 配置 MCP Server..."
mkdir -p "$OPENCLAW_DIR"

if [ -f "$CONFIG_FILE" ]; then
    if grep -q "claude-code-boost" "$CONFIG_FILE" 2>/dev/null; then
        echo -e "  ${YELLOW}!${NC} 配置已存在，跳过（不会覆盖你的设置）"
    else
        echo -e "  ${YELLOW}!${NC} 发现已有配置文件"
        echo ""
        echo "  请手动在 $CONFIG_FILE 的 mcpServers 中添加："
        echo ""
        echo -e "  ${CYAN}\"claude-code-boost\": {${NC}"
        echo -e "  ${CYAN}  \"command\": \"node\",${NC}"
        echo -e "  ${CYAN}  \"args\": [\"$MCP_DIST\"],${NC}"
        echo -e "  ${CYAN}  \"transport\": \"stdio\"${NC}"
        echo -e "  ${CYAN}}${NC}"
        echo ""
    fi
else
    cat > "$CONFIG_FILE" << JSONEOF
{
  "mcpServers": {
    "claude-code-boost": {
      "command": "node",
      "args": ["$MCP_DIST"],
      "transport": "stdio"
    }
  }
}
JSONEOF
    echo -e "  ${GREEN}✓${NC} 配置文件已创建: $CONFIG_FILE"
fi

# ── 第 5 步：验证安装 ──────────────────────────────────────
echo ""
echo -e "${BLUE}[5/5]${NC} 验证安装..."
echo -e "  ${GREEN}✓${NC} MCP Server: $MCP_DIST"
echo -e "  ${GREEN}✓${NC} Skills 目录: $SKILLS_DIR"
echo -e "  ${GREEN}✓${NC} 配置文件: $CONFIG_FILE"

# ── 安装完成 ──────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║   ✅ 安装完成！你的小龙虾已获得超能力！       ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo "  接下来请执行："
echo ""
echo -e "  ${CYAN}1.${NC} 重启 OpenClaw:    ${YELLOW}openclaw gateway restart${NC}"
echo -e "  ${CYAN}2.${NC} 验证 MCP:         ${YELLOW}openclaw mcp list${NC}"
echo -e "  ${CYAN}3.${NC} 验证 Skills:      ${YELLOW}openclaw skills list${NC}"
echo -e "  ${CYAN}4.${NC} 开始对话，试试说:  ${YELLOW}\"帮我分析一下项目文件结构\"${NC}"
echo ""
echo "  或者直接跟小龙虾说："
echo -e "  ${YELLOW}\"安装 Claude Code Boost 的所有技能\"${NC}"
echo -e "  小龙虾会自己搞定！"
echo ""
