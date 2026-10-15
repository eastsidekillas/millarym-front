#!/bin/bash
# Развернуть или обновить CRM на сервере (Ubuntu/Debian, root).
#   curl -fsSL https://raw.githubusercontent.com/eastsidekillas/millarym-front/main/deploy/server-setup.sh | bash -s -- test.chillgate.cc
# Повторный запуск обновляет код и перезапускает: bash /opt/millarym/millarym-front/deploy/server-setup.sh test.chillgate.cc
set -uo pipefail

DOMAIN="${1:-}"
ROOT=/opt/millarym
BACK=$ROOT/millarym-back
FRONT=$ROOT/millarym-front
KEY=/root/.ssh/millarym_deploy
LOG=$ROOT/deploy.log
DC="docker compose -f docker-compose.yml -f deploy/compose.server.yml"

mkdir -p $ROOT
exec > >(tee -a "$LOG") 2>&1
step() { echo; echo "== $(date '+%d.%m.%y %H:%M:%S') $*"; }
die() { echo "СТОП: $*"; exit 1; }

[ "$(id -u)" = 0 ] || die "запустите от root"
[ -n "$DOMAIN" ] || die "укажите домен: bash server-setup.sh test.chillgate.cc"
. /etc/os-release && echo "Система: $PRETTY_NAME, домен: $DOMAIN"

step "пакеты"
command -v git >/dev/null && command -v curl >/dev/null || { apt-get update -q && apt-get install -y -q git curl ca-certificates; }
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh || die "не удалось поставить Docker"
fi
docker --version && docker compose version || die "нет docker compose"

step "DNS"
IP=$(curl -fsS --max-time 10 https://api.ipify.org || true)
DNS=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}')
echo "IP сервера: ${IP:-?}, $DOMAIN указывает на: ${DNS:-не найден}"
[ -n "$DNS" ] && [ "$DNS" = "$IP" ] || echo "ВНИМАНИЕ: домен не указывает на этот сервер — сертификат не выдадут, пока DNS не обновится."

step "код"
mkdir -p /root/.ssh && chmod 700 /root/.ssh
[ -f $KEY ] || ssh-keygen -q -t ed25519 -N "" -C "millarym-deploy@$(hostname)" -f $KEY
grep -q "github.com" /root/.ssh/known_hosts 2>/dev/null || ssh-keyscan -t ed25519 github.com >> /root/.ssh/known_hosts 2>/dev/null
export GIT_SSH_COMMAND="ssh -i $KEY -o IdentitiesOnly=yes"
if [ -d $BACK/.git ]; then
  git -C $BACK pull --ff-only || die "git pull millarym-back"
elif ! git clone -q git@github.com:eastsidekillas/millarym-back.git $BACK; then
  echo
  echo "Репозиторий millarym-back приватный. Добавьте ключ сервера только на чтение:"
  echo "GitHub → eastsidekillas/millarym-back → Settings → Deploy keys → Add deploy key, вставить строку:"
  echo
  cat $KEY.pub
  echo
  die "после добавления ключа запустите скрипт ещё раз"
fi
if [ -d $FRONT/.git ]; then
  git -C $FRONT pull --ff-only || die "git pull millarym-front"
else
  git clone -q https://github.com/eastsidekillas/millarym-front.git $FRONT || die "git clone millarym-front"
fi
echo "back: $(git -C $BACK log --oneline -1)"
echo "front: $(git -C $FRONT log --oneline -1)"

step "настройки"
cd $BACK
if [ ! -f .env ]; then
  rand() { tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$1"; }
  cat > .env <<ENV
DOMAIN=$DOMAIN
DJANGO_ENV=prod
DJANGO_SECRET_KEY=$(rand 60)
DEBUG=False
ALLOWED_HOSTS=$DOMAIN
CORS_ALLOWED_ORIGINS=https://$DOMAIN
CSRF_TRUSTED_ORIGINS=https://$DOMAIN
POSTGRES_PASSWORD=$(rand 32)
SITE_URL=https://$DOMAIN
ACCESS_TOKEN_LIFETIME=8
REFRESH_TOKEN_LIFETIME=14
COOKIE_SECURE=True
AXES_ENABLED=True
AXES_FAILURE_LIMIT=5
AXES_COOLOFF_MINUTES=15
ENV
  chmod 600 .env
  echo ".env создан (секретный ключ и пароль базы — случайные)"
  FIRST=1
else
  echo ".env уже есть, не меняю"
  FIRST=0
fi

step "сборка и запуск (первый раз — несколько минут)"
$DC up -d --build --remove-orphans || die "docker compose up"
for i in $(seq 90); do
  st=$($DC ps -a --format '{{.Service}} {{.State}} {{.ExitCode}}' | awk '$1=="migration"{print $2" "$3}')
  case "$st" in "exited 0") break;; exited*) break;; esac
  sleep 2
done
[ "$st" = "exited 0" ] && echo "миграции применены" || { $DC logs --tail 60 migration; die "миграции: $st"; }

step "справочники"
$DC run --rm -T -v "$BACK/data:/data:ro" app django-admin import_models /data/models-2026-10-15.csv --create-categories | tail -3

if [ "$FIRST" = 1 ]; then
  step "сотрудники"
  umask 077
  $DC run --rm -T app django-admin create_users > /root/millarym-passwords.txt 2>&1
  echo "Логины и пароли сотрудников — в /root/millarym-passwords.txt (виден только root, в лог не пишется)."
  echo "Посмотреть: cat /root/millarym-passwords.txt — раздать лично и удалить файл."
fi

step "проверка"
sleep 5
$DC ps
for path in / /api/v1/users/me/; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://$DOMAIN$path")
  echo "https://$DOMAIN$path → $code"
done
echo "(ожидается: / → 200, /api/v1/users/me/ → 401 без входа)"
$DC logs --tail 15 caddy app frontend scheduler 2>&1 | tail -60

step "готово: https://$DOMAIN"
echo "Лог: $LOG"
