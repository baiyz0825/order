#!/bin/bash
set -e

# ============================================================
#  精品咖啡烘焙店 - 在线点单系统 交互式安装脚本
# ============================================================

# 固定的 Docker 镜像地址（项目开发者维护）
IMAGE_NAME="ghcr.io/baiyz0825/order:latest"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }

# 打印标题
print_header() {
  clear
  echo ""
  echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${BLUE}║${NC}        ${BOLD}精品咖啡烘焙店 - 在线点单系统${NC}              ${BOLD}${BLUE}║${NC}"
  echo -e "${BOLD}${BLUE}║${NC}              ${BOLD}交互式安装向导${NC}                         ${BOLD}${BLUE}║${NC}"
  echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# 读取用户输入
read_input() {
  local prompt="$1"
  local default="$2"
  local var_name="$3"

  if [ -n "$default" ]; then
    echo -ne "${CYAN}▸${NC} ${prompt} ${YELLOW}[$default]${NC}: "
  else
    echo -ne "${CYAN}▸${NC} ${prompt}: "
  fi

  read -r response

  if [ -z "$response" ] && [ -n "$default" ]; then
    response="$default"
  fi

  eval "$var_name='$response'"
}

# 选择菜单
read_choice() {
  local prompt="$1"
  local default="$2"
  local var_name="$3"
  shift 3
  local options=("$@")

  echo ""
  echo -e "${CYAN}▸${NC} ${prompt}"
  local i=1
  for opt in "${options[@]}"; do
    if [ "$i" = "$default" ]; then
      echo -e "  ${GREEN}[$i]${NC} $opt ${YELLOW}(默认)${NC}"
    else
      echo -e "  [$i] $opt"
    fi
    ((i++))
  done

  local choice
  while true; do
    echo -ne "${CYAN}▸${NC} 请选择 ${YELLOW}[1-${#options[@]}]${NC}: "
    read -r choice

    if [ -z "$choice" ]; then
      choice="$default"
    fi

    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#options[@]}" ]; then
      eval "$var_name='${options[$((choice-1))]}'"
      break
    fi
    echo -e "${RED}✗${NC} 无效选择，请输入 1-${#options[@]} 之间的数字"
  done
}

# 确认操作
confirm() {
  local prompt="$1"
  local default="${2:-n}"

  if [ "$default" = "y" ]; then
    echo -ne "${CYAN}▸${NC} ${prompt} ${YELLOW}[Y/n]${NC}: "
  else
    echo -ne "${CYAN}▸${NC} ${prompt} ${YELLOW}[y/N]${NC}: "
  fi

  read -r response
  response=$(echo "$response" | tr '[:upper:]' '[:lower:]')

  if [ -z "$response" ]; then
    response="$default"
  fi

  [ "$response" = "y" ] || [ "$response" = "yes" ]
}

# 显示配置摘要
show_summary() {
  echo ""
  echo -e "${BOLD}${BLUE}═════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}  安装配置摘要${NC}"
  echo -e "${BOLD}${BLUE}═════════════════════════════════════════════════════════${NC}"
  echo ""

  # 显示部署模式
  if [ "$MODE" = "docker-image" ]; then
    echo -e "  ${CYAN}部署模式:${NC}       ${GREEN}Docker 镜像部署${NC}"
  elif [ "$MODE" = "source" ]; then
    if [ "$RUN_MODE" = "Docker 模式" ]; then
      echo -e "  ${CYAN}部署模式:${NC}       ${GREEN}源码部署 (Docker)${NC}"
    else
      echo -e "  ${CYAN}部署模式:${NC}       ${GREEN}源码部署 (本地)${NC}"
    fi
  fi

  echo -e "  ${CYAN}服务端口:${NC}       ${GREEN}$PORT${NC}"
  echo -e "  ${CYAN}JWT密钥:${NC}        ${GREEN}${JWT_SECRET:0:16}...${NC}"
  echo -e "  ${CYAN}填充测试数据:${NC}   ${GREEN}$([ "$SKIP_SEED" = false ] && echo '是' || echo '否')${NC}"

  # Docker 镜像部署的额外信息
  if [ "$MODE" = "docker-image" ]; then
    echo -e "  ${CYAN}镜像地址:${NC}       ${GREEN}$IMAGE_NAME${NC}"
    echo -e "  ${CYAN}容器名称:${NC}       ${GREEN}order-app${NC}"
    echo -e "  ${CYAN}数据卷:${NC}         ${GREEN}order-db-data, order-uploads${NC}"
  fi

  echo -e "${BOLD}${BLUE}═════════════════════════════════════════════════════════${NC}"
  echo ""
}

# ──────────────── 函数定义 ────────────────

# 带重试机制的 Docker 镜像拉取
pull_image_with_retry() {
  local max_attempts=3
  local wait_time=5
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    if [ $attempt -gt 1 ]; then
      info "重试第 $attempt 次 (最多 $max_attempts 次)..."
      sleep $wait_time
    fi

    info "正在拉取镜像: ${IMAGE_NAME}"

    if docker pull "${IMAGE_NAME}"; then
      ok "镜像拉取完成"
      return 0
    fi

    if [ $attempt -lt $max_attempts ]; then
      warn "镜像拉取失败，${wait_time}秒后自动重试..."
    fi

    ((attempt++))
  done

  fail "镜像拉取失败，已重试 $max_attempts 次。请检查网络连接或镜像地址"
}

# Docker 镜像部署函数
deploy_docker_image() {
  info "检查 Docker 环境..."

  if ! command -v docker &>/dev/null; then
    fail "未找到 Docker，请先安装: https://docs.docker.com/get-docker/"
  fi

  if ! docker info &>/dev/null; then
    fail "Docker 未运行，请先启动 Docker"
  fi

  ok "Docker 环境就绪"

  # 拉取镜像（带重试机制）
  pull_image_with_retry

  # 检查并处理现有容器
  CONTAINER_NAME="order-app"
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
      warn "发现运行中的容器，正在停止..."
      docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
    fi
    info "删除旧容器..."
    docker rm "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  fi

  # 检查数据卷
  if ! docker volume inspect order-db-data >/dev/null 2>&1; then
    info "创建数据卷..."
    docker volume create order-db-data
    docker volume create order-uploads
    ok "数据卷创建完成"

    # 首次部署，询问是否初始化数据库
    if [ "$SKIP_SEED" = false ]; then
      info "初始化数据库..."

      # 启动初始化容器
      docker run --rm \
        -v order-db-data:/app/data \
        -v order-uploads:/app/public/uploads \
        -e NODE_ENV=production \
        -e DATABASE_URL="file:/app/data/order.db" \
        -e JWT_SECRET="${JWT_SECRET}" \
        "${IMAGE_NAME}" \
        npx tsx prisma/seed.ts || warn "数据库初始化失败，您可以稍后手动执行"

      ok "数据库初始化完成"
    fi
  else
    info "检测到已存在数据卷，跳过初始化"
  fi

  # 启动容器
  info "启动容器..."
  docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    -p "${PORT}:3000" \
    -v order-db-data:/app/data \
    -v order-uploads:/app/public/uploads \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -e JWT_SECRET="${JWT_SECRET}" \
    -e DATABASE_URL="file:/app/data/order.db" \
    "${IMAGE_NAME}" || fail "容器启动失败"

  ok "容器已启动"

  # 等待服务就绪
  info "等待服务启动..."
  for i in {1..30}; do
    if curl -sf "http://localhost:${PORT}/api/settings" >/dev/null 2>&1; then
      ok "服务已就绪！"
      break
    fi
    if [ $i -eq 30 ]; then
      warn "服务启动超时，请稍后检查"
    fi
    sleep 1
  done

  # 保存配置
  cat > .env.docker <<EOF
# Docker 部署配置
PORT=${PORT}
JWT_SECRET=${JWT_SECRET}
DATABASE_URL=file:/app/data/order.db
IMAGE_NAME=${IMAGE_NAME}
EOF

  ok "配置已保存到 .env.docker"
}

# ──────────────── 主要流程 ────────────────

print_header

echo -e "${GREEN}欢迎使用交互式安装向导！${NC}"
echo -e "本向导将引导您完成系统的安装配置。"
echo ""
echo -e "${CYAN}支持的部署场景:${NC}"
echo "  • 源码部署      - 需要完整的源码和配置文件"
echo "  • Docker镜像部署 - 使用已构建好的 Docker 镜像"
echo ""

# 检查部署场景
DEPLOYMENT_MODE=""
HAS_SOURCE_CODE=false
HAS_DOCKER_IMAGE_DEPLOY=true

# 检查是否有源码（有 deploy.sh）
if [ -f "deploy.sh" ]; then
  HAS_SOURCE_CODE=true
fi

# 镜像地址已在脚本开头定义

# 步骤1: 部署信息
echo ""
echo -e "${BOLD}${BLUE}【步骤 1/4】部署信息${NC}"
echo -e "${CYAN}───────────────────────────────────────────────${NC}"
echo ""

# 显示镜像信息
echo -e "${GREEN}✓${NC} Docker 镜像部署模式"
echo ""
echo -e "  ${CYAN}镜像地址:${NC} ${GREEN}${IMAGE_NAME}${NC}"
echo ""
echo "  本安装向导将使用 Docker 镜像快速部署系统。"
echo "  镜像将从容器仓库自动拉取，无需手动构建。"
echo ""

# 如果有源码，提示是否切换到源码部署
if [ "$HAS_SOURCE_CODE" = true ]; then
  echo -e "${YELLOW}提示${NC}: 检测到当前目录包含源码（deploy.sh）"
  echo ""
  if confirm "是否改用源码部署模式?" "n"; then
    MODE="source"
    # 源码部署需要选择运行方式
    echo ""
    read_choice "请选择运行方式:" "1" RUN_MODE "Docker 模式" "本地模式"
  else
    MODE="docker-image"
  fi
else
  MODE="docker-image"
fi

# 步骤2: 端口配置
echo ""
echo -e "${BOLD}${BLUE}【步骤 2/4】端口配置${NC}"
echo -e "${CYAN}────────────────────────────────────────────────${NC}"
echo ""

read_input "服务端口号" "3000" PORT

# 验证端口
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
  fail "无效的端口号，请输入 1024-65535 之间的数字"
fi

# 步骤3: 安全配置
echo ""
echo -e "${BOLD}${BLUE}【步骤 3/4】安全配置${NC}"
echo -e "${CYAN}────────────────────────────────────────────────${NC}"
echo ""

info "JWT 密钥用于签名用户令牌，请妥善保管"
echo ""

# 生成或输入 JWT 密钥
if confirm "是否自动生成 JWT 密钥?" "y"; then
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -d '/+=' | head -c 64)
  ok "已自动生成安全的 JWT 密钥"
else
  while true; do
    read_input "请输入 JWT 密钥 (至少32字符)" "" JWT_SECRET
    if [ ${#JWT_SECRET} -ge 32 ]; then
      break
    fi
    echo -e "${RED}✗${NC} 密钥长度不足，请至少输入 32 个字符"
  done
fi

# 测试数据
echo ""
if confirm "是否填充测试数据?" "y"; then
  SKIP_SEED=false
else
  SKIP_SEED=true
fi

# 步骤4: 确认并安装
show_summary

if ! confirm "确认开始安装?" "n"; then
  echo ""
  warn "安装已取消"
  exit 0
fi

echo ""
echo -e "${BOLD}${BLUE}═════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  开始安装...${NC}"
echo -e "${BOLD}${BLUE}═════════════════════════════════════════════════════════${NC}"
echo ""

# 执行部署
echo ""
echo -e "${BOLD}${BLUE}═════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  开始安装...${NC}"
echo -e "${BOLD}${BLUE}═════════════════════════════════════════════════════════${NC}"
echo ""

# 判断部署方式
if [ "$MODE" = "docker-image" ]; then
  # Docker 镜像部署模式：直接执行 docker 命令
  deploy_docker_image
elif [ "$MODE" = "source" ]; then
  # 源码部署模式：使用 deploy.sh
  if [ -f "deploy.sh" ]; then
    CMD="./deploy.sh"
  elif [ -f "../deploy.sh" ]; then
    CMD="../deploy.sh"
  else
    fail "未找到 deploy.sh 脚本"
  fi

  # 构建命令参数
  DEPLOY_ARGS="--mode $([ "$RUN_MODE" = "Docker 模式" ] && echo 'docker' || echo 'local')"
  DEPLOY_ARGS="$DEPLOY_ARGS --port $PORT"
  DEPLOY_ARGS="$DEPLOY_ARGS --jwt-secret '$JWT_SECRET'"
  [ "$SKIP_SEED" = true ] && DEPLOY_ARGS="$DEPLOY_ARGS --skip-seed"

  info "执行: $CMD $DEPLOY_ARGS"
  echo ""

  # 执行部署
  eval "$CMD $DEPLOY_ARGS"
fi

# 显示完成信息
echo ""
echo -e "${BOLD}${BLUE}═════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  安装完成！${NC}"
echo -e "${BOLD}${BLUE}═════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}访问地址:${NC}     ${GREEN}http://localhost:$PORT${NC}"
echo -e "  ${CYAN}管理后台:${NC}     ${GREEN}http://localhost:$PORT/admin${NC}"
echo ""
echo -e "${GREEN}首次使用请访问初始化向导:${NC}"
echo -e "  ${YELLOW}http://localhost:$PORT/admin/setup${NC}"
echo ""
echo -e "${YELLOW}⚠ 重要提示:${NC}"
echo -e "  • 首次使用需要完成系统初始化设置"
echo -e "  • 初始化过程中将创建管理员账户"
echo -e "  • JWT 密钥已保存，请妥善保管"
echo -e "  • 建议配置 HTTPS 和防火墙规则"
echo ""
