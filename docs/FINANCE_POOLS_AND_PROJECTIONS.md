# Pools Financieros y Proyecciones

## Objetivo de este documento

Este documento explica, en términos de negocio y operación, cómo funcionan hoy:

- el `pool admins`
- el `pool workers`
- el `fondo empresa`
- la evolución esperada de cada uno según el nivel de actividad del período

También incluye proyecciones numéricas para ayudar a entender cuánto podría ganar un worker bajo distintos escenarios.

Importante:

- las cifras de ejemplo no son una promesa de pago
- son simulaciones para visualizar la lógica del sistema
- los números reales dependen de la ganancia neta del período, del target de puntos, de la participación relativa de cada worker y del seniority aplicado

---

## 1. Qué pools existen hoy

### Pool admins

Es la parte del neto que se distribuye a administración según la configuración.

Con la configuración recomendada actual:

- Francisco: `40%`
- Federico: `30%`

Entonces:

- `pool_admins = net_profit * 70%`

Este pool no se acumula como fondo. Se devenga como compensación a personas.

---

### Pool workers

Es el techo máximo disponible para workers en ese período.

Con la configuración recomendada actual:

- workers: `15%`

Entonces:

- `workers_pool_cap = net_profit * 15%`

Pero ese monto no se habilita automáticamente completo.

Ahora el sistema funciona así:

- si el período tuvo poco trabajo real registrado, solo se habilita una parte del pool
- si el período llega al target de puntos ponderados, se habilita el `100%` del pool workers
- si supera el target, no crece más allá del cap

---

### Fondo empresa

El porcentaje empresa ya no vive como una distribution pendiente aislada.

Ahora funciona como fondo operativo acumulativo:

- al cerrar un período, la base empresa se acredita al fondo
- además, el remanente no ganado por workers también se acredita al fondo
- los gastos operativos pueden consumir saldo del fondo
- si sobra saldo, se arrastra al siguiente período

Con la configuración recomendada actual:

- empresa: `15%`

Entonces:

- `company_pool_base = net_profit * 15%`
- `company_pool_credit = company_pool_base + workers_pool_unallocated`

Si no hay consumos, el saldo del fondo crece mes a mes.

Además, el sistema ahora puede tener una política opcional de `release`:

- si está activada en configuración
- y el saldo acumulado que entra al período supera el colchón protegido
- el excedente se libera como bonus extraordinario

Ese release:

- sale del saldo acumulado previo, no del neto nuevo
- se registra separado en snapshot, ledger y compensaciones
- se reparte a admins según su split
- y a workers según los `weighted points` del período, cuando hubo actividad worker

---

## 2. Fórmula general del cierre

Cuando un período tiene ganancia positiva:

```txt
net_profit = total_income - total_expenses

admins_pool = net_profit * (pct_francisco + pct_federico)
workers_pool_cap = net_profit * pct_workers
company_pool_base = net_profit * pct_company
```

Luego se calcula la activación real del pool workers:

```txt
effective_target_weighted_points =
    workers_target_weighted_points * max(active_workers, 1) / 4

pool_utilization_ratio = min(total_weighted_points / effective_target_weighted_points, 1)

workers_pool_earned = workers_pool_cap * pool_utilization_ratio
workers_pool_unallocated = workers_pool_cap - workers_pool_earned
```

Donde:

- `workers_target_weighted_points` es el target base configurado
- `active_workers` es la cantidad de workers con work logs aprobados en el período
- el `4` funciona como equipo de referencia para no romper la calibración histórica del target actual

Y el crédito final al fondo empresa:

```txt
company_pool_credit = company_pool_base + workers_pool_unallocated
```

Si la política de release está activa:

```txt
company_fund_release_amount =
    max(company_fund_balance_before - company_fund_reserve_floor, 0)
```

Ese monto no se mezcla con el neto del período. Viaja como distribución extraordinaria separada.

---

## 3. Cómo se calcula lo que gana un worker

Cada worker genera:

```txt
raw_points = suma de tareas aprobadas
weighted_points = raw_points * seniority_multiplier
```

Los `raw_points` salen de:

- tipo de tarea
- cantidad
- criticidad
- override de puntos si corresponde

Los `weighted_points` salen de:

- `raw_points`
- multiplicador de seniority del snapshot del período

El reparto final del pool workers ganado es proporcional:

```txt
worker_share = worker_weighted_points / total_weighted_points_del_periodo

worker_amount = workers_pool_earned * worker_share
```

Consecuencia importante:

- un worker puede tener `100%` del share relativo del período
- pero igual no se lleva todo el cap si el período no llegó al target

Ese punto corrige el problema anterior donde una sola persona podía absorber demasiado monto con poca actividad real.

---

## 4. Ejemplo base simple

Supongamos:

- ganancia neta del período: `US$ 1.000`
- split recomendado: `70% admins / 15% workers / 15% empresa`
- target base workers: `100 puntos ponderados`
- workers activos: `4`

Entonces:

- `pool admins = US$ 700`
- `workers_pool_cap = US$ 150`
- `base empresa = US$ 150`
- `target efectivo = 100`

Ahora veamos cómo cambia según el trabajo real del período:

| Weighted points del período | Utilización | Pool workers ganado | Remanente workers | Crédito fondo empresa |
| --- | ---: | ---: | ---: | ---: |
| 0 | 0% | US$ 0 | US$ 150 | US$ 300 |
| 20 | 20% | US$ 30 | US$ 120 | US$ 270 |
| 50 | 50% | US$ 75 | US$ 75 | US$ 225 |
| 80 | 80% | US$ 120 | US$ 30 | US$ 180 |
| 100 | 100% | US$ 150 | US$ 0 | US$ 150 |
| 130 | 100% | US$ 150 | US$ 0 | US$ 150 |

Lectura rápida:

- cuanto más trabajo ponderado real hubo, más se activa el pool workers
- cuanto menos se activa workers, más crece el fondo empresa

---

## 5. Qué pasa si hay un solo worker

Este era el caso crítico que queríamos corregir.

Supongamos de nuevo:

- neto: `US$ 1.000`
- cap workers: `US$ 150`
- target base: `100 pts`
- solo hay un worker activo
- target efectivo: `25 pts`

### Caso A: ese worker produjo 20 puntos ponderados

- utilización: `80%`
- pool workers ganado: `US$ 120`
- share del worker: `100%`
- cobro del worker: `US$ 120`

No cobra `US$ 150`, porque el período todavía no llegó al target efectivo de ese escenario.

### Caso B: ese worker produjo 100 puntos ponderados

- utilización: `100%`
- pool workers ganado: `US$ 150`
- share del worker: `100%`
- cobro del worker: `US$ 150`

Acá sí se lleva todo el pool workers, porque el volumen ponderado del período superó el target efectivo.

---

## 6. Proyección de cuánto podría ganar un worker

### Escenario 1: mes moderado

Supongamos:

- neto del período: `US$ 1.500`
- workers cap: `US$ 225`
- weighted points del período: `80`
- target: `100`

Entonces:

- utilización: `80%`
- workers pool ganado: `US$ 180`

Ahora según participación:

| Share del worker | Ganancia estimada |
| --- | ---: |
| 20% | US$ 36 |
| 35% | US$ 63 |
| 50% | US$ 90 |
| 70% | US$ 126 |
| 100% | US$ 180 |

---

### Escenario 2: dos workers con seniority distinto

Supongamos:

- pool workers ganado: `US$ 120`
- Worker A hizo `40 raw points`, seniority `1.0`
- Worker B hizo `30 raw points`, seniority `1.5`

Entonces:

- A: `40 * 1.0 = 40 weighted points`
- B: `30 * 1.5 = 45 weighted points`
- total: `85 weighted points`

Reparto:

- A: `40 / 85 = 47,06%`
- B: `45 / 85 = 52,94%`

Ganancia:

- A: `US$ 56,47`
- B: `US$ 63,53`

Esto muestra que no gana solo quien hace más volumen bruto: también importa el peso acumulado del seniority.

---

### Escenario 3: worker consolidado en un período fuerte

Supongamos:

- neto: `US$ 2.200`
- cap workers: `US$ 330`
- target alcanzado: `100%`
- el worker concentra `35%` del weighted total del período

Entonces:

- pool workers ganado: `US$ 330`
- worker amount: `US$ 115,50`

Si ese mismo worker tuviera `60%` del peso del período:

- worker amount: `US$ 198`

---

## 7. Proyección de evolución del fondo empresa

Supongamos 6 períodos seguidos, sin consumir todavía fondo empresa y con split recomendado.

| Período | Neto | Weighted pts | Utilización | Pool workers ganado | Remanente workers | Crédito fondo empresa | Saldo acumulado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mes 1 | US$ 800 | 25 | 25% | US$ 30 | US$ 90 | US$ 210 | US$ 210 |
| Mes 2 | US$ 1.200 | 50 | 50% | US$ 90 | US$ 90 | US$ 270 | US$ 480 |
| Mes 3 | US$ 1.500 | 80 | 80% | US$ 180 | US$ 45 | US$ 270 | US$ 750 |
| Mes 4 | US$ 1.800 | 100 | 100% | US$ 270 | US$ 0 | US$ 270 | US$ 1.020 |
| Mes 5 | US$ 1.800 | 120 | 100% | US$ 270 | US$ 0 | US$ 270 | US$ 1.290 |
| Mes 6 | US$ 2.200 | 110 | 100% | US$ 330 | US$ 0 | US$ 330 | US$ 1.620 |

Qué muestra esta simulación:

- en etapas iniciales, el fondo empresa puede crecer rápido porque workers todavía no activan todo su cap
- a medida que el sistema madura y el equipo registra suficiente trabajo, el fondo sigue creciendo, pero más cerca de la base empresa pura
- si además el fondo financia gastos operativos, el saldo real crecerá menos que en esta tabla

---

## 7.1 Qué cambia si el release está activo

Supongamos:

- saldo acumulado al entrar al período: `US$ 1.200`
- colchón protegido: `US$ 800`
- release automático: `activo`

Entonces:

- excedente liberable: `US$ 400`

Ese `US$ 400` puede repartirse como bonus extraordinario del período:

- admins según el split vigente
- workers según el peso ponderado del período

Y el fondo sigue así:

```txt
saldo_despues_release = 1.200 - 400 = 800
saldo_final = saldo_despues_release + credito_nuevo_del_periodo
```

Con split recomendado `40 / 30 / 15 / 15`, si hubo actividad worker en el período:

- Francisco extra: `US$ 188,24`
- Federico extra: `US$ 141,18`
- Workers bonus pool: `US$ 70,58`

Eso sale de normalizar `40 + 30 + 15 = 85`.

Si no hubo actividad worker en el período, la parte extraordinaria se libera solo entre admins.

---

## 8. Proyección de evolución para un worker estable

Usando la misma simulación de 6 meses, veamos cuánto ganaría un worker que mantiene `35%` del peso ponderado del período:

| Período | Pool workers ganado | Share worker | Ganancia estimada |
| --- | ---: | ---: | ---: |
| Mes 1 | US$ 30 | 35% | US$ 10,50 |
| Mes 2 | US$ 90 | 35% | US$ 31,50 |
| Mes 3 | US$ 180 | 35% | US$ 63 |
| Mes 4 | US$ 270 | 35% | US$ 94,50 |
| Mes 5 | US$ 270 | 35% | US$ 94,50 |
| Mes 6 | US$ 330 | 35% | US$ 115,50 |

Total estimado acumulado en 6 períodos:

- `US$ 409,50`

Si ese mismo worker evolucionara a `50%` del peso del período:

- total estimado acumulado: `US$ 585`

---

## 9. Cómo leer estas proyecciones correctamente

Las proyecciones mejoran cuando se estabilizan tres cosas:

- la rentabilidad del negocio
- el hábito de registrar work logs correctamente
- la calibración del catálogo de task types

En otras palabras:

- al principio conviene leer estos números como una guía operativa
- después de varios cierres reales ya se pueden usar como una referencia más confiable

---

## 10. Regla práctica para explicar el sistema en una frase

Hoy el sistema funciona así:

> admins cobran su porcentaje del neto, workers compiten por un pool que se habilita según trabajo real, el resto fortalece el fondo empresa acumulado y, si está activa la política de release, el excedente del fondo por encima del colchón puede volver como bonus extraordinario.

---

## 11. FAQ rápida

### ¿El fondo empresa acumulado del período 1 entra en el reparto del período 2?

No entra automáticamente al `neto` del período 2.

Lo que sí puede pasar ahora es esto:

- el fondo acumulado previo queda como saldo operativo
- si ese saldo supera el colchón configurado
- el excedente puede liberarse en el cierre del período 2 como bonus extraordinario separado

Esto mantiene la trazabilidad:

- `resultado ordinario del período`
- `crédito al fondo empresa`
- `release extraordinario desde saldo acumulado`

---

## 12. Referencias

- [WORKER_COMPENSATION_SYSTEM.md](./WORKER_COMPENSATION_SYSTEM.md)
- [FINANCE_TRANSITION_NOTES.md](./FINANCE_TRANSITION_NOTES.md)
