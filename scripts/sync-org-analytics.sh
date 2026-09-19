#!/bin/sh
# La lógica de analíticas del organizador vive en la web (fuente de verdad) y se
# copia tal cual a la app móvil: Metro no puede importar fuera de apps/mobile.
# Ejecuta esto después de tocar apps/web/src/lib/org/analytics.ts.
set -e
cd "$(dirname "$0")/.."
SRC=apps/web/src/lib/org
DST=apps/mobile/src/core
HEADER="// COPIA GENERADA por scripts/sync-org-analytics.sh desde $SRC. No editar aquí."
{ echo "$HEADER"; cat "$SRC/analytics.ts"; } > "$DST/orgAnalytics.ts"
{ echo "$HEADER"; sed 's#"./analytics.ts"#"./orgAnalytics.ts"#g' "$SRC/analytics.test.ts"; } > "$DST/orgAnalytics.test.ts"
echo "Sincronizado: $DST/orgAnalytics.ts"
# El glosario del signo ⓘ también vive en la web y se copia a la app.
{ echo "$HEADER" | sed "s#$SRC#apps/web/src/lib/help.ts#"; cat apps/web/src/lib/help.ts; } > apps/mobile/src/core/help.ts
echo "Sincronizado: apps/mobile/src/core/help.ts"
