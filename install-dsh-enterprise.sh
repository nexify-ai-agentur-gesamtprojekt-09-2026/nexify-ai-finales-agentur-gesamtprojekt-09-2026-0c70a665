#!/usr/bin/env bash
# DSH Enterprise installer. The target host needs Bash, Docker Compose and standard Linux tools.
set -Eeuo pipefail
shopt -u patsub_replacement 2>/dev/null || true
export LC_ALL=C
umask 077

BISHENG_TAG=v3.0.0-beta2
BISHENG_COMMIT=9f56c7f20e7707242fe7adca1721bd2d0260293f
BISHENG_SOURCE=https://github.com/dataelement/bisheng.git
BACKEND_IMAGE=dataelement/bisheng-backend:v3.0.0-beta2
FRONTEND_IMAGE=dataelement/bisheng-frontend:v3.0.0-beta2
OLD_GATEWAY_IMAGE=cr.dataelem.com/dataelement/gateway:v1.6.0-dsh-20260921
GATEWAY_IMAGE=cr.dataelem.com/dataelement/gateway:v1.6.0
CR_REGISTRY=cr.dataelem.com
CR_DEFAULT_USERNAME=docker
CR_DEFAULT_PASSWORD=dataelem
PROJECT=dsh-enterprise
BUNDLE_URL=https://dshdesktop.com/assets/enterprise-installer
APP_SHA=c7c9b37afee178f97c5e9e0713b5880e6222a273c281f554b831dbcf794ad678
SQL_SHA=dde44577b6fce7f0cd18112739e68fa4478b7522f732800646416fb3cd4579ca
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
SCRIPT_PATH=$SCRIPT_DIR/$(basename -- "${BASH_SOURCE[0]}")
CR_LOGIN_ATTEMPTED=0
TEMP_PATHS=()

say() { printf '%s\n' "$*"; }
fail() { printf '\n安装停止：%s\n' "$*" >&2; exit 1; }
cleanup() {
  local path
  set +u
  for path in "${TEMP_PATHS[@]}"; do
    [[ ! -e $path ]] || rm -rf -- "$path"
  done
}
trap cleanup EXIT
trap 'printf "\n安装已中断；已创建的文件和容器保留供排查。\n" >&2; exit 130' INT TERM
stage() { printf '\n[%s/7] %s\n' "$1" "$2"; }
require_command() { command -v "$1" >/dev/null 2>&1 || fail "$2"; }
confirm() {
  local answer
  while true; do
    read -r -p "$1 [Y/n]：" answer || fail '未收到确认输入'
    case ${answer,,} in ''|y|yes) return 0;; n|no) return 1;; esac
    say '请输入 y 或 n；直接按回车表示同意。'
  done
}
sha_file() { sha256sum -- "$1" | cut -d' ' -f1; }
verify_sha() {
  local actual
  actual=$(sha_file "$1")
  [[ $actual == "$2" ]] || fail "文件校验失败：$1（SHA-256 不匹配）"
}
canonical_path() {
  local value=$1 parent
  [[ $value == /* ]] || value=$PWD/$value
  parent=$(cd -- "$(dirname -- "$value")" && pwd -P) || fail "目录的上级目录不存在：$value"
  printf '%s/%s\n' "$parent" "$(basename -- "$value")"
}
linux_platform() {
  case $(uname -m) in
    x86_64|amd64) printf 'linux/amd64\n';;
    aarch64|arm64) printf 'linux/arm64\n';;
    *) fail "不支持的 CPU 架构：$(uname -m)";;
  esac
}
preflight() {
  [[ $(uname -s) == Linux && -t 0 ]] || fail '请在 Linux 交互式终端运行'
  ((BASH_VERSINFO[0] >= 4)) || fail '需要 Bash 4 或更新版本'
  require_command docker '请先安装 Docker Engine 和 Compose 插件'
  require_command sha256sum '缺少 sha256sum（coreutils）'
  require_command tar '缺少 tar'
  require_command openssl '缺少 openssl'
  require_command awk '缺少 awk'
  require_command sed '缺少 sed'
  require_command curl '缺少 curl（用于服务健康检查）'
  if [[ -z $OFFLINE_BUNDLE ]]; then
    require_command git '联网模式需要 Git'
  fi
  docker compose version >/dev/null 2>&1 || fail 'Docker Compose v2 不可用；请检查 docker compose version'
  docker info >/dev/null 2>&1 || fail '无法连接 Docker；请检查 docker info'
}
compose() {
  local docker_dir=$1; shift
  (cd -- "$docker_dir" && docker compose --project-name "$PROJECT" -f docker-compose.yml "$@")
}
compose_gateway() {
  local docker_dir=$1; shift
  (cd -- "$docker_dir" && docker compose --project-name "$PROJECT" -f docker-compose.yml -f docker-compose.gateway.yml "$@")
}
cr_image() {
  case $1 in
    "$CR_REGISTRY"/*) printf '%s\n' "$1";;
    docker.io/*) printf '%s/%s\n' "$CR_REGISTRY" "${1#docker.io/}";;
    *) printf '%s/%s\n' "$CR_REGISTRY" "$1";;
  esac
}
run_cr() {
  local username password
  if "$@"; then return 0; fi
  [[ $CR_LOGIN_ATTEMPTED == 0 ]] || fail "CR 命令失败：$*"
  CR_LOGIN_ATTEMPTED=1
  say '尝试使用预置 CR 账号登录。'
  if printf '%s\n' "$CR_DEFAULT_PASSWORD" | docker login --username "$CR_DEFAULT_USERNAME" --password-stdin "$CR_REGISTRY" >/dev/null; then
    if "$@"; then return 0; fi
  fi
  [[ -t 0 ]] || fail "CR 命令失败：$*"
  say '预置 CR 账号无法访问。请输入有镜像下载权限的账号。'
  read -r -p 'CR 用户名：' username
  read -r -s -p 'CR 密码：' password; printf '\n'
  [[ -n $username && -n $password ]] || fail 'CR 用户名和密码不能为空'
  printf '%s\n' "$password" | docker login --username "$username" --password-stdin "$CR_REGISTRY" >/dev/null || fail 'CR 登录失败'
  unset password
  "$@" || fail "CR 登录后仍无法访问：$*"
}
pull_from_cr() {
  local image=$1 platform=${2:-} source
  source=$(cr_image "$image")
  say "下载镜像：$source"
  if [[ -n $platform ]]; then run_cr docker pull --platform "$platform" "$source"
  else run_cr docker pull "$source"; fi
  [[ $source == "$image" ]] || docker tag "$source" "$image" || fail "标记镜像失败：$image"
}
check_cr_images() {
  local image source missing=()
  for image in "${SERVICE_IMAGES[@]}"; do
    source=$(cr_image "$image")
    say "检查 CR 镜像：$source"
    if ! run_cr docker manifest inspect "$source" >/dev/null; then missing+=("$source"); fi
  done
  ((${#missing[@]} == 0)) || fail "CR 镜像不可用：${missing[*]}"
}
load_bundle() {
  local name expected path temporary
  if [[ -n $OFFLINE_BUNDLE ]]; then BUNDLE_DIR=$OFFLINE_BUNDLE
  elif [[ -n $BUNDLE_DIR ]]; then :
  elif [[ -d $SCRIPT_DIR/enterprise-installer ]]; then BUNDLE_DIR=$SCRIPT_DIR/enterprise-installer
  else
    temporary=$(mktemp -d)
    TEMP_PATHS+=("$temporary")
    BUNDLE_DIR=$temporary
  fi
  for name in gateway-application.yml gateway-init.sql; do
    case $name in gateway-application.yml) expected=$APP_SHA;; *) expected=$SQL_SHA;; esac
    path=$BUNDLE_DIR/$name
    if [[ ! -f $path ]]; then
      [[ -z $OFFLINE_BUNDLE ]] || fail "离线包缺少 $name"
      say "下载配套文件：$name"
      curl -fL --retry 2 --progress-bar -o "$path" "$BUNDLE_URL/$name" || fail "下载失败：$name"
    fi
    verify_sha "$path" "$expected"
  done
}
service_images() {
  SERVICE_IMAGES=(
    mysql:8.0 openfga/openfga:v1.15.1 redis:7.0.4 "$BACKEND_IMAGE" "$FRONTEND_IMAGE"
    docker.io/bitnamilegacy/elasticsearch:8.12.0 quay.io/coreos/etcd:v3.5.5
    minio/minio:RELEASE.2023-03-20T20-16-18Z milvusdb/milvus:v2.5.10 "$GATEWAY_IMAGE"
  )
}

prepare_offline() {
  local output source package work image actual id image_platform names
  [[ $TARGET_PLATFORM == linux/amd64 || $TARGET_PLATFORM == linux/arm64 ]] || fail '请用 --platform linux/amd64 或 linux/arm64 指定目标架构'
  [[ -z $OFFLINE_BUNDLE ]] || fail '制作离线包时不能指定 --offline-bundle'
  preflight
  load_bundle
  output=$(canonical_path "$OUTPUT_DIR")
  [[ ! -e $output ]] || fail "输出目录已存在：$output"
  work=$(mktemp -d "$(dirname -- "$output")/.dsh-offline.XXXXXX")
  TEMP_PATHS+=("$work")
  source=$work/source
  package=$work/package
  mkdir -m 700 "$package"
  printf '\n[1/4] 下载并核对固定版本 BISHENG 源码\n'
  git clone --depth 1 --branch "$BISHENG_TAG" --progress "$BISHENG_SOURCE" "$source" || fail '下载 BISHENG 源码失败'
  actual=$(cd "$source" && git rev-parse HEAD)
  [[ $actual == "$BISHENG_COMMIT" ]] || fail "BISHENG 标签提交已变化：$actual"
  tar -C "$source" -czf "$package/bisheng-docker.tar.gz" docker
  cp -- "$SCRIPT_PATH" "$package/install-dsh-enterprise.sh"
  cp -- "$BUNDLE_DIR/gateway-application.yml" "$BUNDLE_DIR/gateway-init.sql" "$package/"
  say '[2/4] 确认需要的镜像'
  compose "$source/docker" config --images | { cat; printf '%s\n' "$GATEWAY_IMAGE"; } | sort -u > "$package/images.list"
  grep -Fxq "$BACKEND_IMAGE" "$package/images.list" || fail 'Compose 缺少固定版本 BISHENG 后端镜像'
  grep -Fxq "$FRONTEND_IMAGE" "$package/images.list" || fail 'Compose 缺少固定版本 BISHENG 前端镜像'
  say "[3/4] 从 CR 下载 $TARGET_PLATFORM 镜像（显示 Docker 下载进度）"
  : > "$package/images.tsv"
  while IFS= read -r image; do
    say "  $image"
    pull_from_cr "$image" "$TARGET_PLATFORM"
    image_platform=$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "$image")
    [[ $image_platform == "$TARGET_PLATFORM" ]] || fail "镜像架构不匹配：$image"
    id=$(docker image inspect --format '{{.Id}}' "$image")
    [[ $id =~ ^sha256:[0-9a-f]{64}$ ]] || fail "镜像 ID 无效：$image"
    printf '%s\t%s\n' "$image" "$id" >> "$package/images.tsv"
  done < "$package/images.list"
  rm -- "$package/images.list"
  say '[4/4] 导出镜像并生成校验清单'
  names=()
  while IFS= read -r image; do names+=("$image"); done < <(cut -f1 "$package/images.tsv")
  docker save -o "$package/images.tar" "${names[@]}" &
  local save_pid=$!
  while kill -0 "$save_pid" 2>/dev/null; do
    printf '\r  已写入 %s 字节镜像包' "$(stat -c %s "$package/images.tar" 2>/dev/null || printf 0)"
    sleep 1
  done
  wait "$save_pid" || fail '导出镜像失败'
  printf '\n'
  printf 'format=2\nbisheng_commit=%s\ngateway_image=%s\nplatform=%s\n' \
    "$BISHENG_COMMIT" "$GATEWAY_IMAGE" "$TARGET_PLATFORM" > "$package/metadata.txt"
  (cd "$package" && sha256sum -- bisheng-docker.tar.gz images.tar install-dsh-enterprise.sh \
    gateway-application.yml gateway-init.sql images.tsv metadata.txt > files.sha256)
  mv -- "$package" "$output"
  printf '\n✓ 离线包已准备好：%s\n' "$output"
  say "将整个目录上传到内网服务器，然后运行：bash $output/install-dsh-enterprise.sh --offline-bundle $output"
}

verify_offline_bundle() {
  local dir=$OFFLINE_BUNDLE name expected actual count image id platform
  [[ -d $dir ]] || fail "离线包目录不存在：$dir"
  grep -Fxq 'format=2' "$dir/metadata.txt" || fail '离线包格式不受支持'
  grep -Fxq "bisheng_commit=$BISHENG_COMMIT" "$dir/metadata.txt" || fail '离线包的 BISHENG 版本不匹配'
  grep -Fxq "gateway_image=$GATEWAY_IMAGE" "$dir/metadata.txt" || fail '离线包的 Gateway 版本不匹配'
  platform=$(linux_platform)
  grep -Fxq "platform=$platform" "$dir/metadata.txt" || fail "离线包架构与当前服务器不一致：需要 $platform"
  count=$(wc -l < "$dir/files.sha256")
  ((count == 7)) || fail '离线包校验清单文件数量不正确'
  for name in bisheng-docker.tar.gz images.tar install-dsh-enterprise.sh gateway-application.yml gateway-init.sql images.tsv metadata.txt; do
    [[ -f $dir/$name && ! -L $dir/$name ]] || fail "离线包缺少文件：$name"
    expected=$(awk -v name="$name" '$2 == name {print $1}' "$dir/files.sha256")
    [[ $expected =~ ^[0-9a-f]{64}$ ]] || fail "离线包清单缺少：$name"
    say "校验离线文件：$name"
    verify_sha "$dir/$name" "$expected"
  done
  verify_sha "$SCRIPT_PATH" "$(sha_file "$dir/install-dsh-enterprise.sh")"
  verify_sha "$dir/gateway-application.yml" "$APP_SHA"
  verify_sha "$dir/gateway-init.sql" "$SQL_SHA"
  grep -Fq "$BACKEND_IMAGE" "$dir/images.tsv" || fail '离线包缺少 BISHENG 后端镜像'
  grep -Fq "$GATEWAY_IMAGE" "$dir/images.tsv" || fail '离线包缺少 Gateway 镜像'
  while IFS=$'\t' read -r image id; do
    [[ -n $image && $id =~ ^sha256:[0-9a-f]{64}$ ]] || fail '离线包镜像清单无效'
  done < "$dir/images.tsv"
}

load_offline_images() {
  local work fifo log total sent chunk load_pid image id actual platform
  say '导入离线镜像（显示已传输字节）'
  work=$(mktemp -d); TEMP_PATHS+=("$work")
  fifo=$work/images.pipe
  log=$work/load.log
  mkfifo "$fifo"
  total=$(stat -c %s "$OFFLINE_BUNDLE/images.tar")
  docker load < "$fifo" > "$log" 2>&1 & load_pid=$!
  exec 3> "$fifo"
  chunk=0
  sent=0
  while ((sent < total)); do
    if ! dd if="$OFFLINE_BUNDLE/images.tar" bs=16M skip="$chunk" count=1 2>/dev/null >&3; then
      exec 3>&-
      wait "$load_pid" || true
      fail "读取镜像包失败：$(tail -5 "$log")"
    fi
    ((chunk+=1))
    sent=$((chunk * 16777216))
    ((sent <= total)) || sent=$total
    printf '\r  已传入 Docker %s/%s MiB' "$((sent / 1048576))" "$((total / 1048576))"
  done
  exec 3>&-
  printf '\n  等待 Docker 完成镜像导入…\n'
  wait "$load_pid" || fail "Docker 导入失败：$(tail -5 "$log")"
  tail -3 "$log"
  platform=$(linux_platform)
  while IFS=$'\t' read -r image id; do
    actual=$(docker image inspect --format '{{.Id}}' "$image") || fail "镜像缺失：$image"
    [[ $actual == "$id" ]] || fail "导入镜像 ID 与离线包不一致：$image"
    actual=$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "$image")
    [[ $actual == "$platform" ]] || fail "导入镜像架构不匹配：$image"
  done < "$OFFLINE_BUNDLE/images.tsv"
}

extract_offline_source() {
  local dir=$1 install_dir=$2 list member type
  list=$(mktemp)
  TEMP_PATHS+=("$list")
  tar -tzf "$dir/bisheng-docker.tar.gz" > "$list" || fail '离线源码包无法读取'
  while IFS= read -r member; do
    [[ $member == docker || $member == docker/* ]] || fail "离线源码包包含非 Docker 路径：$member"
    [[ $member != /* && $member != *'/../'* && $member != '../'* && $member != *'/..' ]] || fail "离线源码包包含不安全路径：$member"
  done < "$list"
  if tar -tvzf "$dir/bisheng-docker.tar.gz" | awk 'substr($1,1,1) !~ /[-d]/ {bad=1} END {exit !bad}'; then
    fail '离线源码包包含链接或特殊文件'
  fi
  mkdir -m 700 "$install_dir"
  tar -xzf "$dir/bisheng-docker.tar.gz" -C "$install_dir" --no-same-owner --no-same-permissions || fail '解压离线源码失败'
  [[ -f $install_dir/docker/docker-compose.yml ]] || fail '离线源码缺少 Compose 配置'
}

clone_deployment_docker() {
  local install_dir=$1 work source actual
  work=$(mktemp -d "$(dirname -- "$install_dir")/.dsh-source.XXXXXX")
  TEMP_PATHS+=("$work")
  source=$work/bisheng
  git clone --depth 1 --branch "$BISHENG_TAG" --progress "$BISHENG_SOURCE" "$source" || fail '下载 BISHENG 源码失败'
  actual=$(cd "$source" && git rev-parse HEAD)
  [[ $actual == "$BISHENG_COMMIT" ]] || fail "发行标签提交已变化：$actual"
  [[ -f $source/docker/docker-compose.yml ]] || fail '固定版本源码缺少 Compose 配置'
  mkdir -m 700 "$install_dir"
  cp -a -- "$source/docker" "$install_dir/docker"
}

# Replace a fixed release marker only when its count matches the reviewed source.
replace_exact() {
  local old=$1 new=$2 expected=$3 label=$4 rest=$TEXT count=0
  [[ -n $old ]] || fail "空替换标记：$label"
  while [[ $rest == *"$old"* ]]; do rest=${rest#*"$old"}; ((count+=1)); done
  [[ $count == "$expected" ]] || fail "$label 与固定发行版不匹配（需要 $expected 处，发现 $count 处）"
  TEXT=${TEXT//"$old"/$new}
}
json_quote() {
  local value=$1
  value=${value//\\/\\\\}
  value=${value//\"/\\\"}
  value=${value//$'\n'/\\n}
  value=${value//$'\r'/\\r}
  value=${value//$'\t'/\\t}
  printf '"%s"' "$value"
}
read_text() { TEXT=$(cat -- "$1"); TEXT+=$'\n'; }
save_text() { printf '%s' "$TEXT" > "$1"; }
random_hex() { openssl rand -hex "$1"; }
choose_mysql_password() {
  local first second
  say 'MySQL root 密码：默认生成随机强密码，并写入安装目录的受限凭据文件。'
  say '默认不会使用 BISHENG 源码中的示例密码 1234。'
  if confirm '使用自动生成的 MySQL root 强密码？'; then
    ROOT_PASSWORD=$(random_hex 24)
  else
    read -r -s -p '输入 MySQL root 密码：' first; printf '\n'
    [[ -n $first ]] || fail 'MySQL root 密码不能为空'
    read -r -s -p '再次输入 MySQL root 密码：' second; printf '\n'
    [[ $first == "$second" ]] || fail '两次输入的 MySQL 密码不一致'
    ROOT_PASSWORD=$first
  fi
}
encrypt_database_password() {
  local program token
  program='import sys; from cryptography.fernet import Fernet; key="TI31VYJ-ldAq-FXo5QNPKV_lqGTFfp-MIdbK2Hm5F1E="; print(Fernet(key).encrypt(sys.stdin.buffer.read()).decode())'
  token=$(printf '%s' "$ROOT_PASSWORD" | docker run --pull=never --rm -i --entrypoint python "$BACKEND_IMAGE" -c "$program") || fail 'BISHENG 数据库密码加密失败'
  [[ $token =~ ^[A-Za-z0-9_-]+=*$ ]] || fail 'BISHENG 数据库密码加密结果无效'
  ENCRYPTED_PASSWORD=$token
}
prepare_base() {
  local docker_dir=$1 port=$2 url=$3 path compose_password dsn block item old count
  path=$docker_dir/docker-compose.yml
  read_text "$path"
  compose_password=${ROOT_PASSWORD//\$/\$\$}
  replace_exact 'MYSQL_ROOT_PASSWORD: "1234"' "MYSQL_ROOT_PASSWORD: $(json_quote "$compose_password")" 1 'MySQL 密码'
  dsn=$(json_quote "root:$compose_password@tcp(mysql:3306)/openfga")
  dsn=${dsn:1:${#dsn}-2}
  replace_exact 'root:1234@tcp(mysql:3306)/openfga' "$dsn" 2 'OpenFGA 数据库密码'
  replace_exact "BS_MINIO_ACCESS_KEY: 'minioadmin'" "BS_MINIO_ACCESS_KEY: '$MINIO_ACCESS'" 2 'MinIO 访问账号'
  replace_exact "BS_MINIO_SECRET_KEY: 'minioadmin'" "BS_MINIO_SECRET_KEY: '$MINIO_SECRET'" 2 'MinIO 访问密码'
  replace_exact 'MINIO_ACCESS_KEY: minioadmin' "MINIO_ACCESS_KEY: $MINIO_ACCESS" 1 'MinIO 账号'
  replace_exact 'MINIO_SECRET_KEY: minioadmin' "MINIO_SECRET_KEY: $MINIO_SECRET" 1 'MinIO 密码'
  replace_exact $'      MINIO_ADDRESS: minio:9000\n' \
    "      MINIO_ADDRESS: minio:9000
      MINIO_ACCESS_KEY_ID: $MINIO_ACCESS
      MINIO_SECRET_ACCESS_KEY: $MINIO_SECRET
" 1 'Milvus 对象存储凭据'
  for block in \
    $'    ports:\n      - "3306:3306"\n' \
    $'    ports:\n      - "8080:8080"\n      - "8081:8081"\n      - "2112:2112"\n' \
    $'    ports:\n      - "6379:6379"\n' \
    $'    ports:\n      - "7860:7860"\n' \
    $'    ports:\n      - "9200:9200"\n      - "9300:9300"\n' \
    $'    ports:\n      - "9100:9000"\n      - "9101:9001"\n' \
    $'    ports:\n      - "19530:19530"\n      - "9091:9091"\n'; do
    replace_exact "$block" '' 1 '内部服务端口'
  done
  replace_exact '      - "3001:3001"' "      - \"$port:3001\"" 1 '前端访问端口'
  count=$(printf '%s' "$TEXT" | grep -Ec '^    container_name: bisheng-' || true)
  [[ $count == 11 ]] || fail "固定容器名与发行版不匹配（发现 $count 处）"
  TEXT=$(printf '%s' "$TEXT" | sed '/^    container_name: bisheng-/d'); TEXT+=$'\n'
  chmod 600 "$path"; save_text "$path"

  path=$docker_dir/bisheng/config/config.yaml
  read_text "$path"
  if [[ $TEXT =~ root:[^@\"]+@mysql:3306/bisheng ]]; then
    old=${BASH_REMATCH[0]}
  else fail 'BISHENG 加密数据库连接未找到'; fi
  replace_exact "$old" "root:$ENCRYPTED_PASSWORD@mysql:3306/bisheng" 1 'BISHENG 加密数据库连接'
  old=$(printf '%s' "$TEXT" | grep -E '^  gateway_hmac_secret: "[^"]+"$' || true)
  [[ -n $old ]] || fail 'BISHENG HMAC 配置未找到'
  replace_exact "$old" '  gateway_hmac_secret: !env BS_SSO_SYNC__GATEWAY_HMAC_SECRET' 1 'BISHENG HMAC 配置'
  [[ $TEXT != *$'\ndsh:'* ]] || fail '固定发行版已有 DSH 配置，需要审阅安装脚本'
  TEXT+="
# DSH Enterprise access
dsh:
  enabled: true
  platform_public_url: $(json_quote "$url")
  gateway_internal_url: \"http://gateway:8080\"
"
  chmod 600 "$path"; save_text "$path"; chmod 644 "$path"
  chmod 755 "$docker_dir/bisheng/entrypoint.sh" "$docker_dir/nginx/conf.d"
  chmod 644 "$docker_dir/redis/redis.conf" "$docker_dir/mysql/conf/my.cnf" "$docker_dir/nginx/nginx.conf"
  for item in "$docker_dir"/nginx/conf.d/*.conf; do [[ ! -f $item ]] || chmod 644 "$item"; done
}

prepare_gateway() {
  local docker_dir=$1 url=$2 path count
  mkdir -m 700 "$docker_dir/gateway"
  read_text "$BUNDLE_DIR/gateway-application.yml"
  replace_exact '__DSH_GATEWAY_DB_PASSWORD__' "$DB_PASSWORD" 1 'Gateway 数据库密码占位符'
  replace_exact '__DSH_GATEWAY_HMAC_SECRET__' "$HMAC_SECRET" 1 'Gateway HMAC 占位符'
  replace_exact '__DSH_PUBLIC_URL__' "$url" 2 'Gateway 公开地址占位符'
  count=$(printf '%s' "$TEXT" | grep -c '^  wxoauth:' || true)
  [[ $count == 1 ]] || fail 'Gateway 可选企微配置与固定发行版不匹配'
  TEXT=$(printf '%s' "$TEXT" | awk '/^  wxoauth:/ {skip=1; next} /^  # LDAP 登录配置/ {skip=0} !skip {print}')
  TEXT+=$'\n'
  path=$docker_dir/gateway/application.yml
  save_text "$path"; chmod 644 "$path"
  cp -- "$BUNDLE_DIR/gateway-init.sql" "$docker_dir/gateway/init.sql"; chmod 600 "$docker_dir/gateway/init.sql"
  cat > "$docker_dir/docker-compose.gateway.yml" <<EOF
services:
  gateway:
    image: $GATEWAY_IMAGE
    restart: unless-stopped
    environment:
      TZ: Asia/Shanghai
      JAVA_OPTS: -Xms256m -Xmx768m -Dserver.port=8080 -Dspring.config.location=/config/application.yml
    volumes:
      - type: bind
        source: ./gateway/application.yml
        target: /config/application.yml
        read_only: true
        bind:
          create_host_path: false
    expose:
      - "8080"
    depends_on:
      - mysql
      - redis
      - backend
  backend:
    environment:
      BS_SSO_SYNC__GATEWAY_HMAC_SECRET: "$HMAC_SECRET"
  backend_worker:
    environment:
      BS_SSO_SYNC__GATEWAY_HMAC_SECRET: "$HMAC_SECRET"
EOF
  chmod 600 "$docker_dir/docker-compose.gateway.yml"
}

prepare_nginx_route() {
  local docker_dir=$1 url=$2 path marker route
  path=$docker_dir/nginx/conf.d/default.conf
  read_text "$path"
  marker=$(printf '%s' "$TEXT" | grep -E '^[[:space:]]*location ~ \^\(/workspace\)\?/api\(/\|\$\) \{' || true)
  [[ -n $marker ]] || fail 'Nginx 通用 API 路由未找到'
  route=$(cat <<'EOF'
location ~ ^/api/dsh/(authorizations|token|logout|jwks)$ {
    proxy_pass http://gateway:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Connection "";
    proxy_read_timeout 30s;
}
EOF
)
  if [[ $url == https://* ]]; then route=${route//'X-Forwarded-Proto $scheme'/'X-Forwarded-Proto https'}; fi
  replace_exact "$marker" "$route

	location ~ ^(/workspace)?/api(/|$) {" 1 'Nginx 通用 API 路由'
  save_text "$path"
}

mysql_input() {
  local docker_dir=$1 sql_path=$2 database=${3:-} option target escaped
  option=$(mktemp)
  chmod 600 "$option"
  target=/tmp/dsh-installer-mysql-$$.cnf
  escaped=${ROOT_PASSWORD//\\/\\\\}
  escaped=${escaped//\"/\\\"}
  printf '[client]\nuser=root\npassword="%s"\n' "$escaped" > "$option"
  if ! compose "$docker_dir" cp "$option" "mysql:$target"; then rm -f "$option"; fail 'MySQL 凭据文件传输失败'; fi
  rm -f "$option"
  if [[ -n $database ]]; then
    if ! compose "$docker_dir" exec -T mysql mysql "--defaults-extra-file=$target" "$database" < "$sql_path"; then
      compose "$docker_dir" exec -T mysql rm -f "$target" || true
      fail '数据库初始化 SQL 执行失败'
    fi
  else
    if ! compose "$docker_dir" exec -T mysql mysql "--defaults-extra-file=$target" < "$sql_path"; then
      compose "$docker_dir" exec -T mysql rm -f "$target" || true
      fail '数据库初始化 SQL 执行失败'
    fi
  fi
  compose "$docker_dir" exec -T mysql rm -f "$target" || fail 'MySQL 临时凭据清理失败'
}

wait_for_jwks() {
  local port=$1 response attempt
  for ((attempt=1; attempt<=30; attempt++)); do
    if response=$(curl -fsS --max-time 5 "http://127.0.0.1:$port/api/dsh/jwks" 2>/dev/null); then
      [[ $response == *'"keys"'* ]] && return 0
    fi
    if ((attempt % 5 == 0)); then say "  等待 Gateway 就绪（已检查 $attempt 次）…"; fi
    sleep 3
  done
  fail '公开 JWKS 路由尚不可达；检查 Gateway 和 Nginx 日志'
}

inspect_projects() {
  local id record name service image i found
  PROJECT_NAMES=(); PROJECT_BACKENDS=(); PROJECT_GATEWAYS=()
  while IFS= read -r id; do
    [[ -n $id ]] || continue
    record=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}|{{index .Config.Labels "com.docker.compose.service"}}|{{.Config.Image}}' "$id") || fail '读取 Compose 容器信息失败'
    IFS='|' read -r name service image <<< "$record"
    [[ -n $name && -n $service ]] || continue
    found=0
    for i in "${!PROJECT_NAMES[@]}"; do
      if [[ ${PROJECT_NAMES[i]} == "$name" ]]; then found=1; break; fi
    done
    if ((found == 0)); then
      PROJECT_NAMES+=("$name"); PROJECT_BACKENDS+=(''); PROJECT_GATEWAYS+=('')
      i=$((${#PROJECT_NAMES[@]}-1))
    fi
    case $service in backend) PROJECT_BACKENDS[i]=$image;; gateway) PROJECT_GATEWAYS[i]=$image;; esac
  done < <(docker ps -a -q --filter label=com.docker.compose.project)
  # Ignore unrelated Compose projects without a BISHENG backend.
  for i in "${!PROJECT_NAMES[@]}"; do
    if [[ ${PROJECT_BACKENDS[i]} != *bisheng-backend:* ]]; then
      PROJECT_NAMES[i]=''; PROJECT_GATEWAYS[i]=''
    fi
  done
}

select_existing_project() {
  local i choice count=0 only=-1
  for i in "${!PROJECT_NAMES[@]}"; do
    [[ -n ${PROJECT_NAMES[i]} ]] || continue
    ((count+=1)); only=$i
  done
  SELECTED_INDEX=-1
  if ((count == 0)); then say '未发现已有 BISHENG Compose 部署。'; return; fi
  printf '\n发现已有 BISHENG 部署：\n'
  for i in "${!PROJECT_NAMES[@]}"; do
    [[ -n ${PROJECT_NAMES[i]} ]] || continue
    say "  项目 ${PROJECT_NAMES[i]}：BISHENG ${PROJECT_BACKENDS[i]}"
    say "    Gateway：${PROJECT_GATEWAYS[i]:-未安装}"
  done
  while true; do
    read -r -p '选择部署方式：回车升级现有部署；输入 NEW 新建独立部署：' choice || fail '未收到部署选择'
    if [[ -z $choice && $count == 1 ]]; then SELECTED_INDEX=$only; return; fi
    if [[ ${choice^^} == NEW ]]; then return; fi
    for i in "${!PROJECT_NAMES[@]}"; do
      if [[ -n ${PROJECT_NAMES[i]} && $choice == "${PROJECT_NAMES[i]}" ]]; then SELECTED_INDEX=$i; return; fi
    done
    say '请选择已显示的项目名，或输入 NEW。'
  done
}

choose_new_project() {
  local candidate suffix i occupied
  suffix=1
  while true; do
    if ((suffix == 1)); then candidate=dsh-enterprise
    else candidate=dsh-enterprise-$suffix; fi
    occupied=0
    for i in "${!PROJECT_NAMES[@]}"; do
      if [[ ${PROJECT_NAMES[i]} == "$candidate" ]]; then occupied=1; break; fi
    done
    if ((occupied == 0)); then PROJECT=$candidate; return; fi
    ((suffix+=1))
  done
}

choose_public_port() {
  local port=$PUBLIC_PORT start=$PUBLIC_PORT
  require_command ss '缺少 ss（iproute2），无法检查访问端口'
  while ((port <= 65535)); do
    if ! ss -Hln "( sport = :$port )" | grep -q .; then break; fi
    ((port+=1))
  done
  ((port <= 65535)) || fail '没有可用的服务访问端口'
  if ((port != start)); then
    say "访问端口 $start 已被占用，建议使用 $port；现有服务不会受影响。"
    confirm "使用端口 $port？" || fail '已取消端口调整'
  fi
  PUBLIC_PORT=$port
}
detect_server_ip() {
  local address
  if command -v ip >/dev/null 2>&1; then
    address=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") {print $(i+1); exit}}')
    if [[ $address =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then printf '%s\n' "$address"; return; fi
  fi
  if [[ -n ${SSH_CONNECTION:-} ]]; then
    read -r _ _ address _ <<< "$SSH_CONNECTION"
    if [[ $address =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then printf '%s\n' "$address"; return; fi
  fi
  if command -v ip >/dev/null 2>&1; then
    address=$(ip -o -4 addr show scope global | awk '$2 !~ /^(docker|br-|veth|virbr|podman|tun|tailscale)/ {split($4,a,"/"); print a[1]; exit}')
    if [[ $address =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then printf '%s\n' "$address"; return; fi
  fi
  fail '无法自动识别服务器 IPv4 地址；请用 --public-url 指定访问地址'
}
validate_url() {
  local url=$1
  [[ $url =~ ^https?://[^/?#]+/?$ && $url != *@* ]] || fail '访问地址须为不含账号、路径或参数的完整 http(s) 地址'
  printf '%s\n' "${url%/}"
}
show_resources() {
  local parent=$1 cpu disk total available
  cpu=$(nproc 2>/dev/null || printf '?')
  disk=$(df -BG --output=avail "$parent" | tail -1 | tr -d ' G')
  total=$(awk '/^MemTotal:/ {printf "%.1f", $2/1048576}' /proc/meminfo)
  available=$(awk '/^MemAvailable:/ {printf "%.1f", $2/1048576}' /proc/meminfo)
  say "服务器资源：$cpu 核 CPU、内存总计 $total GiB、当前可用 $available GiB、安装盘剩余约 $disk GiB。"
  if [[ $cpu =~ ^[0-9]+$ ]] && ((cpu < 8)); then say '注意：CPU 少于建议的 8 核。'; fi
  if awk "BEGIN {exit !($total < 32 || $available < 8)}"; then say '注意：内存低于建议值，请评估实际负载。'; fi
}
check_install_target() {
  local install_dir=$1 i
  [[ ! -e $install_dir ]] || fail "安装目录已存在：$install_dir；请选择原部署升级或新目录"
  [[ -d $(dirname -- "$install_dir") ]] || fail '安装目录的上级目录不存在'
  for i in "${!PROJECT_NAMES[@]}"; do
    [[ ${PROJECT_NAMES[i]} != "$PROJECT" ]] || fail "已有 $PROJECT Compose 项目；请选择升级"
  done
}

upgrade_existing() {
  local index=$1 install_dir docker_dir overlay secrets app config_files current backend port backup original
  [[ ${PROJECT_NAMES[index]} =~ ^dsh-enterprise(-[0-9]+)?$ ]] || fail '只支持升级本向导创建的 dsh-enterprise 项目'
  PROJECT=${PROJECT_NAMES[index]}
  backend=${PROJECT_BACKENDS[index]}
  [[ $backend == "$BACKEND_IMAGE" || $backend == "$(cr_image "$BACKEND_IMAGE")" ]] || fail '已有 BISHENG 后端版本与向导不一致'
  current=${PROJECT_GATEWAYS[index]}
  [[ $current == "$OLD_GATEWAY_IMAGE" || $current == "$GATEWAY_IMAGE" ]] || fail "Gateway 镜像不在支持的升级范围：$current"
  if [[ -z $INSTALL_DIR ]]; then
    INSTALL_DIR=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$PROJECT-gateway-1") || fail '无法识别现有安装目录'
    INSTALL_DIR=$(dirname -- "$INSTALL_DIR")
  fi
  install_dir=$(canonical_path "$INSTALL_DIR")
  docker_dir=$install_dir/docker
  overlay=$docker_dir/docker-compose.gateway.yml
  secrets=$install_dir/installation-secrets.txt
  app=$docker_dir/gateway/application.yml
  [[ -f $docker_dir/docker-compose.yml && -f $overlay && -f $secrets && -f $app ]] || fail '现有部署缺少脚本管理的配置文件'
  config_files=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$PROJECT-gateway-1") || fail '无法核对已有 Compose 配置文件'
  [[ $config_files == "$docker_dir/docker-compose.yml,$overlay" ]] || fail '现有 Compose 配置路径与安装目录不一致'
  grep -Fxq "BISHENG_TAG=$BISHENG_TAG" "$secrets" || fail '现有 BISHENG 版本记录与升级目标不一致'
  grep -Fxq "    image: $current" "$overlay" || fail 'Gateway Compose 镜像与运行容器不一致'
  port=$(compose "$docker_dir" port frontend 3001 | tail -1)
  port=${port##*:}
  [[ $port =~ ^[0-9]+$ ]] || fail '无法确认现有前端访问端口'
  if [[ $current == "$GATEWAY_IMAGE" ]]; then
    wait_for_jwks "$port"
    say 'Gateway 已是 v1.6.0，服务入口正常；无需重复升级。'
    return
  fi
  if [[ -n $OFFLINE_BUNDLE ]]; then
    verify_offline_bundle
  else
    run_cr docker manifest inspect "$GATEWAY_IMAGE" >/dev/null
  fi
  backup=$(canonical_path "$(dirname -- "$install_dir")/$(basename -- "$install_dir")-upgrade-backup-$(date -u +%Y%m%dT%H%M%SZ)")
  printf '\n[升级计划] %s：Gateway %s → %s\n' "$PROJECT" "$current" "$GATEWAY_IMAGE"
  say "沿用目录和数据：$install_dir；保留 BISHENG 和其他服务，只重建 Gateway 容器。"
  say '本次只升级镜像，不检查或修改已有数据库；请确认数据库已按目标版本准备好。'
  say "升级前备份 Gateway 配置：$backup"
  confirm '确认按以上计划升级？' || fail '已取消'
  if [[ -n $OFFLINE_BUNDLE ]]; then load_offline_images; else pull_from_cr "$GATEWAY_IMAGE"; fi
  mkdir -m 700 "$backup"
  cp -- "$docker_dir/docker-compose.yml" "$backup/docker-compose.yml"
  cp -- "$overlay" "$backup/docker-compose.gateway.yml"
  cp -- "$app" "$backup/gateway-application.yml"
  cp -- "$secrets" "$backup/installation-secrets.txt"
  chmod 600 "$backup"/*
  read_text "$overlay"
  original=$TEXT
  replace_exact "    image: $OLD_GATEWAY_IMAGE" "    image: $GATEWAY_IMAGE" 1 'Gateway 镜像'
  save_text "$overlay"; chmod 600 "$overlay"
  if ! compose_gateway "$docker_dir" config --quiet ||
     ! compose_gateway "$docker_dir" up -d --no-deps --pull never gateway ||
     [[ $(docker inspect --format '{{.Config.Image}}' "$PROJECT-gateway-1") != "$GATEWAY_IMAGE" ]] ||
     ! (wait_for_jwks "$port"); then
    printf '%s' "$original" > "$overlay"
    chmod 600 "$overlay"
    compose_gateway "$docker_dir" up -d --no-deps --pull never gateway || fail "Gateway 升级失败且回退失败；配置备份：$backup"
    wait_for_jwks "$port"
    fail "Gateway 升级失败，已恢复旧镜像；配置备份：$backup"
  fi
  say "✓ Gateway 已升级到 v1.6.0；配置备份：$backup"
}

install_new() {
  local install_dir docker_dir url address_port image images_output images=() secrets_path sql_file db_escaped table_output
  choose_public_port
  if [[ -z $PUBLIC_URL ]]; then PUBLIC_URL="http://$(detect_server_ip):$PUBLIC_PORT"; fi
  url=$(validate_url "$PUBLIC_URL")
  say "自动生成访问地址：$url"
  address_port=${url##*:}
  if [[ $address_port =~ ^[0-9]+$ && $address_port != "$PUBLIC_PORT" ]]; then
    say "企业地址使用端口 $address_port，但本机前端将监听 $PUBLIC_PORT。"
    confirm '已配置反向代理转发到本机端口，确认继续？' || fail '访问地址与前端端口不一致'
  fi
  if [[ -z $INSTALL_DIR ]]; then
    say "安装目录用于保存服务配置和数据；默认在安装脚本旁新建 prod：$SCRIPT_DIR/prod"
    read -r -p "安装目录 [$SCRIPT_DIR/prod]：" INSTALL_DIR || fail '未收到安装目录'
    INSTALL_DIR=${INSTALL_DIR:-$SCRIPT_DIR/prod}
  fi
  install_dir=$(canonical_path "$INSTALL_DIR")
  check_install_target "$install_dir"
  show_resources "$(dirname -- "$install_dir")"
  if [[ -n $OFFLINE_BUNDLE ]]; then verify_offline_bundle; fi
  load_bundle
  if [[ -z $OFFLINE_BUNDLE ]]; then check_cr_images; fi
  printf '\n[安装计划] BISHENG %s + Gateway v1.6.0\n' "$BISHENG_TAG"
  say "项目：$PROJECT"
  say "目录：$install_dir"
  say "访问地址：$url"
  say "宿主机访问端口：$PUBLIC_PORT；其他服务只在同一 Compose 网络内访问。"
  say '将启动的服务与镜像：'
  for image in "${SERVICE_IMAGES[@]}"; do say "  $image"; done
  [[ -z $OFFLINE_BUNDLE ]] || say "离线包：$OFFLINE_BUNDLE"
  say '脚本会生成数据库和对象存储凭据（MySQL 密码可自定义）、启动 Docker 服务，并保留安装记录。'
  confirm '确认按以上计划开始安装？' || fail '已取消'

  choose_mysql_password
  MINIO_ACCESS=dsh$(random_hex 10)
  MINIO_SECRET=$(random_hex 24)
  DB_PASSWORD=$(random_hex 24)
  HMAC_SECRET=$(random_hex 32)
  if [[ -n $OFFLINE_BUNDLE ]]; then
    stage 1 '导入离线镜像'
    load_offline_images
  else
    stage 1 '检查 CR 仓库权限并下载关键镜像'
    pull_from_cr "$GATEWAY_IMAGE"
    pull_from_cr "$BACKEND_IMAGE"
  fi
  stage 2 '使用固定版本 BISHENG 源码并生成配置'
  if [[ -n $OFFLINE_BUNDLE ]]; then extract_offline_source "$OFFLINE_BUNDLE" "$install_dir"
  else clone_deployment_docker "$install_dir"; fi
  docker_dir=$install_dir/docker
  chmod 700 "$install_dir"
  secrets_path=$install_dir/installation-secrets.txt
  ( set -C; cat > "$secrets_path" <<EOF
BISHENG_TAG=$BISHENG_TAG
BISHENG_COMMIT=$BISHENG_COMMIT
MYSQL_ROOT_PASSWORD=$ROOT_PASSWORD
MINIO_ACCESS_KEY=$MINIO_ACCESS
MINIO_SECRET_KEY=$MINIO_SECRET
GATEWAY_DB_PASSWORD=$DB_PASSWORD
GATEWAY_HMAC_SECRET=$HMAC_SECRET
EOF
  ) || fail '无法安全写入安装凭据文件'
  chmod 600 "$secrets_path"
  encrypt_database_password
  prepare_base "$docker_dir" "$PUBLIC_PORT" "$url"
  images_output=$(compose "$docker_dir" config --images) || fail '基础 Compose 配置无效'
  grep -Fq "bisheng-backend:$BISHENG_TAG" <<< "$images_output" || fail '基础 Compose 缺少固定后端镜像'
  grep -Fq "bisheng-frontend:$BISHENG_TAG" <<< "$images_output" || fail '基础 Compose 缺少固定前端镜像'
  while IFS= read -r image; do images+=("$image"); done < <(printf '%s\n' "$images_output" | sort -u)
  stage 3 '确认基础镜像已就绪'
  compose "$docker_dir" config --quiet || fail '基础 Compose 配置无效'
  if [[ -n $OFFLINE_BUNDLE ]]; then
    diff -u <(printf '%s\n' "${images[@]}" "$GATEWAY_IMAGE" | sort -u) \
      <(cut -f1 "$OFFLINE_BUNDLE/images.tsv" | sort -u) >/dev/null || fail '离线镜像清单与部署配置不一致'
  else
    for image in "${images[@]}"; do
      [[ $image == "$BACKEND_IMAGE" ]] || pull_from_cr "$image"
    done
  fi
  stage 4 '启动 BISHENG'
  compose "$docker_dir" up -d --pull never --wait --wait-timeout 300 || fail 'BISHENG 启动失败'
  stage 5 '配置 Gateway'
  prepare_gateway "$docker_dir" "$url"
  compose_gateway "$docker_dir" config --quiet || fail 'Gateway Compose 配置无效'
  stage 6 '初始化数据库并启动 Gateway'
  sql_file=$(mktemp); TEMP_PATHS+=("$sql_file")
  db_escaped=${DB_PASSWORD//\'/\'\'}
  printf "CREATE DATABASE bisheng_gateway CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;\nCREATE USER 'dsh_gateway'@'%%' IDENTIFIED BY '%s';\nGRANT SELECT, INSERT, UPDATE, DELETE ON bisheng_gateway.* TO 'dsh_gateway'@'%%';\n" "$db_escaped" > "$sql_file"
  mysql_input "$docker_dir" "$sql_file"
  mysql_input "$docker_dir" "$BUNDLE_DIR/gateway-init.sql" bisheng_gateway
  printf 'SHOW TABLES;\n' > "$sql_file"
  table_output=$(mysql_input "$docker_dir" "$sql_file" bisheng_gateway) || fail '无法检查 Gateway 数据表'
  for image in gt_dsh_seat gt_dsh_session gt_dsh_refresh_token gt_dsh_operation gt_dsh_seat_batch; do
    grep -Fqx "$image" <<< "$table_output" || fail "Gateway DSH 表不完整：$image"
  done
  compose_gateway "$docker_dir" up -d --pull never --force-recreate backend backend_worker gateway || fail 'Gateway 启动失败'
  stage 7 '检查公开访问入口'
  prepare_nginx_route "$docker_dir" "$url"
  compose_gateway "$docker_dir" exec -T frontend nginx -t || fail 'Nginx 配置检查失败'
  compose_gateway "$docker_dir" exec -T frontend nginx -s reload || fail 'Nginx 重载失败'
  compose_gateway "$docker_dir" ps -a
  wait_for_jwks "$PUBLIC_PORT"
  printf '\n✓ 服务端安装完成\n'
  say "  后台地址：$url"
  say "  凭据文件：$secrets_path（仅当前用户可读，请安全备份）"
  say '接下来：用浏览器打开后台 → 开启 DSH Desktop 接入 → 添加模型并授权成员 → 用 Desktop 登录并发送消息。'
}

usage() {
  cat <<'EOF'
用法：
  bash install-dsh-enterprise.sh [--install-dir PATH] [--public-port PORT]
      [--public-url URL] [--bundle-dir PATH] [--offline-bundle PATH]
  bash install-dsh-enterprise.sh prepare-offline --platform linux/amd64|linux/arm64
      [--output PATH] [--bundle-dir PATH]
EOF
}
main() {
  local mode=install
  OFFLINE_BUNDLE='' BUNDLE_DIR='' INSTALL_DIR='' PUBLIC_URL='' PUBLIC_PORT=3001
  TARGET_PLATFORM='' OUTPUT_DIR=dsh-enterprise-offline
  if [[ ${1:-} == prepare-offline ]]; then mode=prepare-offline; shift; fi
  while (($#)); do
    case $1 in
      --offline-bundle|--bundle-dir|--install-dir|--public-url|--public-port|--platform|--output)
        (($# >= 2)) || fail "$1 缺少参数"
        case $1 in
          --offline-bundle) OFFLINE_BUNDLE=$2;; --bundle-dir) BUNDLE_DIR=$2;;
          --install-dir) INSTALL_DIR=$2;; --public-url) PUBLIC_URL=$2;;
          --public-port) PUBLIC_PORT=$2;; --platform) TARGET_PLATFORM=$2;;
          --output) OUTPUT_DIR=$2;;
        esac
        shift 2;;
      -h|--help) usage; return 0;;
      *) usage >&2; fail "未知参数：$1";;
    esac
  done
  [[ $PUBLIC_PORT =~ ^[0-9]+$ ]] && ((PUBLIC_PORT >= 1 && PUBLIC_PORT <= 65535)) || fail '访问端口须为 1–65535'
  service_images
  if [[ -n $OFFLINE_BUNDLE ]]; then OFFLINE_BUNDLE=$(canonical_path "$OFFLINE_BUNDLE"); fi
  if [[ -n $BUNDLE_DIR ]]; then BUNDLE_DIR=$(canonical_path "$BUNDLE_DIR"); fi
  if [[ $mode == prepare-offline ]]; then prepare_offline; return; fi
  printf 'DSH Enterprise · 安装与升级向导\n'
  if [[ -n $OFFLINE_BUNDLE ]]; then say '离线包校验 → 导入镜像 → 配置服务 → 启动并验证。'
  else say '检查环境 → 下载 BISHENG → 配置服务 → 启动并验证。'; fi
  printf '\n[安装前检查] 检查 Linux、Docker 和 Compose…\n'
  preflight
  inspect_projects
  select_existing_project
  if ((SELECTED_INDEX >= 0)); then upgrade_existing "$SELECTED_INDEX"
  else choose_new_project; install_new; fi
}
if [[ ${BASH_SOURCE[0]} == "$0" ]]; then main "$@"; fi
