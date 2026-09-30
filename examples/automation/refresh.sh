#!/bin/sh
# Call from cron/launchd/systemd using absolute paths and a controlled PATH for Node/Git.
# Usage: refresh.sh /absolute/path/to/branchquilt /absolute/path/to/repo
set -eu
if [ "$#" -ne 2 ]; then
  echo 'Usage: refresh.sh /absolute/path/to/branchquilt /absolute/path/to/repo' >&2
  exit 2
fi
case "$1:$2" in /*:/*) ;; *) echo 'Both paths must be absolute' >&2; exit 2 ;; esac
exec "$1" refresh "$2" --recover-lock --timeout 600 --json
