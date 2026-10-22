#!/bin/bash
# Развернуть или обновить CRM на сервере (Ubuntu/Debian, root).
#   curl -fsSL https://raw.githubusercontent.com/eastsidekillas/millarym-front/main/deploy/server-setup.sh | bash -s -- test.chillgate.cc
# Повторный запуск обновляет код и перезапускает: bash /opt/millarym/millarym-front/deploy/server-setup.sh test.chillgate.cc
# Внутри сети завода, без домена: вместо домена — IP сервера (bash server-setup.sh 192.168.1.50), откроется http://IP.
# Сменился IP или домен (переезд) — тот же запуск с новым адресом, настройки поправятся сами.
# Есть папка /srv/backups (диск под копии) — ночные копии пишутся туда.
set -uo pipefail

DOMAIN="${1:-}"
ROOT=/opt/millarym
BACK=$ROOT/millarym-back
FRONT=$ROOT/millarym-front
KEY=/root/.ssh/millarym_deploy
LOG=$ROOT/deploy.log

mkdir -p $ROOT
exec > >(tee -a "$LOG") 2>&1
step() { echo; echo "== $(date '+%d.%m.%y %H:%M:%S') $*"; }
die() { echo "СТОП: $*"; exit 1; }

[ "$(id -u)" = 0 ] || die "запустите от root"
[ -n "$DOMAIN" ] || die "укажите домен (bash server-setup.sh test.chillgate.cc) или IP сервера в сети завода"
if [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  LAN=1; SCHEME=http
  DC="docker compose -f docker-compose.yml -f deploy/compose.lan.yml"
  ip -4 addr | grep -q "inet $DOMAIN/" || echo "ВНИМАНИЕ: у этого сервера нет адреса $DOMAIN — проверьте IP (ip -4 addr)."
else
  LAN=0; SCHEME=https
  DC="docker compose -f docker-compose.yml -f deploy/compose.server.yml"
fi
URL="$SCHEME://$DOMAIN"
. /etc/os-release && echo "Система: $PRETTY_NAME, адрес: $URL"

step "пакеты"
command -v git >/dev/null && command -v curl >/dev/null || { apt-get update -q && apt-get install -y -q git curl ca-certificates; }
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh || die "не удалось поставить Docker"
fi
docker --version && docker compose version || die "нет docker compose"

if [ "$LAN" = 0 ]; then
step "DNS"
IP=$(curl -fsS --max-time 10 https://api.ipify.org || true)
DNS=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}')
echo "IP сервера: ${IP:-?}, $DOMAIN указывает на: ${DNS:-не найден}"
[ -n "$DNS" ] && [ "$DNS" = "$IP" ] || echo "ВНИМАНИЕ: домен не указывает на этот сервер — сертификат не выдадут, пока DNS не обновится."
fi

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
  # по http (сеть завода) браузер не отдаёт cookie с флагом Secure — вход бы не работал
  SECURE=$([ "$LAN" = 1 ] && echo False || echo True)
  cat > .env <<ENV
DOMAIN=$DOMAIN
DJANGO_ENV=prod
DJANGO_SECRET_KEY=$(rand 60)
DEBUG=False
ALLOWED_HOSTS=$DOMAIN
CORS_ALLOWED_ORIGINS=$URL
CSRF_TRUSTED_ORIGINS=$URL
POSTGRES_PASSWORD=$(rand 32)
SITE_URL=$URL
ACCESS_TOKEN_LIFETIME=8
REFRESH_TOKEN_LIFETIME=14
COOKIE_SECURE=$SECURE
AXES_ENABLED=True
AXES_FAILURE_LIMIT=5
AXES_COOLOFF_MINUTES=15
ENV
  chmod 600 .env
  echo ".env создан (секретный ключ и пароль базы — случайные)"
  FIRST=1
else
  FIRST=0
  OLD=$(sed -n 's/^DOMAIN=//p' .env)
  if [ -n "$OLD" ] && [ "$OLD" != "$DOMAIN" ]; then
    # переезд: сервер получил другой IP (сеть завода) или домен — адрес программы меняется везде
    SECURE=$([ "$LAN" = 1 ] && echo False || echo True)
    cp .env ".env.before-$(date +%Y%m%d-%H%M%S)"
    sed -i -e "s|^DOMAIN=.*|DOMAIN=$DOMAIN|" -e "s|^ALLOWED_HOSTS=.*|ALLOWED_HOSTS=$DOMAIN|" \
      -e "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=$URL|" -e "s|^CSRF_TRUSTED_ORIGINS=.*|CSRF_TRUSTED_ORIGINS=$URL|" \
      -e "s|^SITE_URL=.*|SITE_URL=$URL|" -e "s|^COOKIE_SECURE=.*|COOKIE_SECURE=$SECURE|" .env
    echo "адрес программы: $OLD → $DOMAIN (старые настройки сохранены в .env.before-…)"
  else
    echo ".env уже есть, не меняю"
  fi
fi
if [ -d /srv/backups ] && ! grep -q '^BACKUP_DIR=' .env; then
  echo "BACKUP_DIR=/srv/backups" >> .env
  echo "ночные копии — в /srv/backups ($(df -h --output=size /srv/backups | tail -1 | tr -d ' '))"
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
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$URL$path")
  echo "$URL$path → $code"
done
echo "(ожидается: / → 200, /api/v1/users/me/ → 401 без входа)"
$DC exec -T app sh -c 'touch /app/media/.write-test && rm /app/media/.write-test' && echo "папка фото доступна приложению на запись" || echo "ОШИБКА: приложение не может писать в папку фото"
$DC logs --tail 15 app frontend scheduler backup $([ "$LAN" = 0 ] && echo caddy) 2>&1 | tail -60

step "готово: $URL"
echo "Лог: $LOG"
