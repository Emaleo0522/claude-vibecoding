#!/bin/bash
# pre-return-audit.sh: envoltorio de compatibilidad.
# Desde 2026-11-03 las reglas R1-R5 viven en pre-return-audit.js (port a node con las mismas
# reglas y mensajes; ver su cabecera). Este archivo queda para quien lo invoque como antes:
#   bash pre-return-audit.sh --files="file1.css file2.html"   (CLI / Modo Modificacion)
#   o como hook con el JSON por stdin (lo pasa tal cual a node).
exec node "$(dirname "$0")/pre-return-audit.js" "$@"
