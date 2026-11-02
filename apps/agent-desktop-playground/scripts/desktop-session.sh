#!/usr/bin/env bash
# Adapted from vercel-labs/agent-desktop scripts/private-session.sh (Apache-2.0).
# Run a command inside a private desktop session: its own 0700 runtime dir, session bus,
# Xvfb display and (with --wm) openbox. Nothing here touches the owner's desktop or the live
# AT-SPI bus.
# Usage: scripts/desktop-session.sh [--wm] [--screen WxHxD] -- command [args...]
set -euo pipefail
umask 077

wm=0
screen=1280x800x24
while [ $# -gt 0 ]; do
  case "$1" in
    --wm) wm=1; shift ;;
    --screen) screen=${2:?--screen needs WxHxD}; shift 2 ;;
    --) shift; break ;;
    *) break ;;
  esac
done
if [ $# -eq 0 ]; then
  echo "usage: desktop-session.sh [--wm] [--screen WxHxD] -- command [args...]" >&2
  exit 2
fi

base=${AGENT_DESKTOP_SESSION_BASE:-${XDG_RUNTIME_DIR:+$XDG_RUNTIME_DIR/agent-desktop-sessions}}
base=${base:-/tmp/agent-desktop-sessions-$(id -u)}
export AGENT_DESKTOP_SESSION_BASE=$base
mkdir -p "$base"
rt=$(mktemp -d "$base/rt.XXXXXX")
chmod 700 "$rt"
mkdir -p "$rt/cfg/glib-2.0/settings" "$rt/data" "$rt/cache" "$rt/ad-home" "$rt/tmp"
printf '[org/gnome/desktop/interface]\ntoolkit-accessibility=true\nenable-animations=false\n' > "$rt/cfg/glib-2.0/settings/keyfile"

pids=()
# shellcheck disable=SC2317
process_start() {
  local stat fields
  stat=$(cat "${2:-/proc}/$1/stat" 2>/dev/null) || return 1
  stat=${stat##*) }
  read -r -a fields <<< "$stat"
  [ -n "${fields[19]:-}" ] || return 1
  printf '%s\n' "${fields[19]}"
}
# shellcheck disable=SC2317
session_members() {
  local root=/proc environ pid start
  for environ in "$root"/[0-9]*/environ; do
    pid=${environ%/environ}
    pid=${pid##*/}
    [ "$pid" != "$$" ] || continue
    start=$(process_start "$pid" "$root") || continue
    if grep -qzxF "XDG_RUNTIME_DIR=$rt" "$environ" 2>/dev/null &&
      [ "$(process_start "$pid" "$root")" = "$start" ]; then
      echo "$pid $start"
    fi
  done
}
# shellcheck disable=SC2317
session_signal() {
  local pid=$1 start=$2 sig=$3 root=${4:-/proc}
  [ "$(process_start "$pid" "$root")" = "$start" ] || return 0
  grep -qzxF "XDG_RUNTIME_DIR=$rt" "$root/$pid/environ" 2>/dev/null || return 0
  [ "$(process_start "$pid" "$root")" = "$start" ] || return 0
  kill "-$sig" "$pid" 2>/dev/null || true
}
# shellcheck disable=SC2317
cleanup() {
  local pid start mount
  trap '' INT TERM HUP
  for pid in "${pids[@]}"; do
    session_signal "$pid" "$(process_start "$pid")" TERM
  done
  while read -r pid start; do session_signal "$pid" "$start" TERM; done < <(session_members)
  sleep 1
  while read -r pid start; do session_signal "$pid" "$start" KILL; done < <(session_members)
  for _ in $(seq 1 50); do
    [ -z "$(session_members)" ] && break
    sleep 0.1
  done
  for mount in "$rt/doc" "$rt/gvfs"; do
    fusermount -u "$mount" 2>/dev/null || true
  done
  case "$rt" in
    "$base"/rt.?*)
      [ ! -d "$rt" ] || rm -rf -- "$rt" ;;
  esac
}
trap cleanup EXIT

unset DISPLAY WAYLAND_DISPLAY XAUTHORITY DBUS_SESSION_BUS_ADDRESS AT_SPI_BUS_ADDRESS NO_AT_BRIDGE GTK_A11Y
export XDG_RUNTIME_DIR=$rt
export XDG_CONFIG_HOME=$rt/cfg
export XDG_DATA_HOME=$rt/data
export XDG_CACHE_HOME=$rt/cache
export TMPDIR=$rt/tmp
export GSETTINGS_BACKEND=keyfile
export XDG_CURRENT_DESKTOP=GNOME
export AGENT_DESKTOP_PRIVATE_SESSION=$rt
export AGENT_DESKTOP_HOME=$rt/ad-home

bus_address="unix:path=$rt/bus"
dbus-daemon --session --nofork --address="$bus_address" 2> "$rt/bus.log" &
pids+=("$!")
export DBUS_SESSION_BUS_ADDRESS=$bus_address
for _ in $(seq 1 100); do
  [ -S "$rt/bus" ] && break
  sleep 0.1
done
[ -S "$rt/bus" ] || { echo "desktop-session: the session bus did not start" >&2; cat "$rt/bus.log" >&2 || true; exit 1; }

display_number=
exec 9> "$base/display.lock"
flock 9
for candidate in $(seq 100 149); do
  [ -e "/tmp/.X11-unix/X$candidate" ] || [ -e "/tmp/.X$candidate-lock" ] && continue
  Xvfb ":$candidate" -screen 0 "$screen" -nolisten tcp -ac 9>&- 2> "$rt/xvfb.log" &
  xvfb_pid=$!
  for _ in $(seq 1 50); do
    [ -S "/tmp/.X11-unix/X$candidate" ] && break
    kill -0 "$xvfb_pid" 2>/dev/null || break
    sleep 0.1
  done
  if [ -S "/tmp/.X11-unix/X$candidate" ] && kill -0 "$xvfb_pid" 2>/dev/null; then
    pids+=("$xvfb_pid")
    display_number=$candidate
    echo "$candidate" > "$rt/displayfd"
    break
  fi
  kill "$xvfb_pid" 2>/dev/null || true
done
flock -u 9
exec 9>&-
[ -n "$display_number" ] || { echo "desktop-session: Xvfb did not start" >&2; cat "$rt/xvfb.log" >&2 || true; exit 1; }
export DISPLAY=":$display_number"

dbus-update-activation-environment DISPLAY XDG_RUNTIME_DIR XDG_CONFIG_HOME XDG_DATA_HOME \
  XDG_CACHE_HOME TMPDIR GSETTINGS_BACKEND XDG_CURRENT_DESKTOP AGENT_DESKTOP_PRIVATE_SESSION AGENT_DESKTOP_HOME

if [ "$wm" = 1 ]; then
  command -v openbox >/dev/null || { echo "desktop-session: --wm needs openbox" >&2; exit 1; }
  openbox > "$rt/openbox.log" 2>&1 &
  wm_pid=$!
  pids+=("$wm_pid")
  wm_ready=0
  for _ in $(seq 1 100); do
    kill -0 "$wm_pid" 2>/dev/null || break
    if xprop -root _NET_SUPPORTING_WM_CHECK 2>/dev/null | grep -q 'window id'; then
      wm_ready=1
      break
    fi
    sleep 0.1
  done
  if [ "$wm_ready" != 1 ]; then
    echo "desktop-session: openbox did not become ready; its log follows" >&2
    cat "$rt/openbox.log" >&2 || true
    exit 1
  fi
fi

grace_s=${AGENT_DESKTOP_SESSION_GRACE_S:-3}
status=0
setsid -- "$@" &
payload_pid=$!

# shellcheck disable=SC2317
signal_payload() {
  local sig="$1"
  trap '' INT TERM HUP
  kill -"$sig" -- "-$payload_pid" 2>/dev/null || true
  local deadline=$((SECONDS + grace_s))
  while kill -0 -- "-$payload_pid" 2>/dev/null && [ "$SECONDS" -lt "$deadline" ]; do
    sleep 0.1
  done
  kill -KILL -- "-$payload_pid" 2>/dev/null || true
  wait "$payload_pid" 2>/dev/null || true
  case "$sig" in
    INT) exit 130 ;;
    HUP) exit 129 ;;
    *) exit 143 ;;
  esac
}
trap 'signal_payload INT' INT
trap 'signal_payload TERM' TERM
trap 'signal_payload HUP' HUP
wait "$payload_pid" || status=$?
exit "$status"
