# Finance Transition Notes

## Documento complementario

- Ver [FINANCE_POOLS_AND_PROJECTIONS.md](./FINANCE_POOLS_AND_PROJECTIONS.md) para una explicación de negocio del pool admins, pool workers, fondo empresa y ejemplos de proyección.

## Qué cambia desde ahora

- `finance_period_snapshots` pasa a ser la foto explícita del cierre.
- `finance_company_fund_movements` pasa a ser la fuente de verdad del fondo empresa.
- `worker_work_logs` + `worker_task_types` + `worker_seniority_snapshots` + `finance_worker_period_compensations` pasan a ser la base del cálculo worker.
- `finance_distributions` queda acotada a compensaciones/pagos a personas y filas legacy de empresa.

## Reglas operativas nuevas

- Un período cerrado no acepta nuevos movimientos ni mutaciones sobre movimientos ya posteados.
- Si entra un cobro o gasto con fecha de un período ya cerrado, se crea un período de ajuste explícito.
- La sincronización automática de facturas usa `paid_at` como fecha contable principal.
- Si una factura ya impactó un período cerrado, los cambios financieros sobre esa factura se bloquean y deben resolverse con ajuste explícito en finanzas.
- El fondo empresa puede tener una política opcional de `release` automático del excedente por encima de un colchón protegido.
  - Esa liberación se registra separada del pool ordinario del período.
- Un gasto puede consumir fondo empresa solo si:
  - es `expense`
  - usa la moneda `default_currency`
  - hay saldo suficiente

## Compatibilidad / legado

- `finance_worker_contributions` no se usa más para cierres nuevos.
  - Se mantiene solo como insumo legacy para calcular seniority histórico.
- Las filas `recipient_type = 'company'` en `finance_distributions` no se destruyen.
  - Se backfillean al ledger del fondo y se siguen mostrando como legacy.
- Los períodos cerrados previos reciben snapshot backfilled.
  - Los balances `before/after` del fondo en esos snapshots pueden ser aproximados.

## Limitaciones transicionales

- El consumo del fondo empresa hoy es por gasto completo, no parcial.
- La política de `release` del fondo empresa queda desactivada por defecto para no alterar automáticamente cierres futuros sin confirmación operativa.
- El fondo empresa se valida contra la `default_currency`.
  - Si más adelante se quiere fondo multi-moneda real, conviene separar balances por moneda o agregar conversión explícita.
- El catálogo de `worker_task_types` ya cubre bastante mejor la oferta de DTE, pero sigue siendo evolutivo.
  - Ya incluye tareas de social/community, programación de contenido Meta, DMs, comentarios, Meta Ads, newsletters, automatizaciones y seguimiento comercial.
  - Un mismo `worker_work_log` ahora puede agrupar varios tipos de tarea; el puntaje base sale de la suma de esos tipos antes de aplicar criticidad, quantity y override.
  - Cuando aparezca un trabajo no catalogado todavía, se puede usar `Trabajo especializado / custom` junto con `points_override` y luego formalizar ese tipo en una migración futura.
