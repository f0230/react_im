# Mejoras del Módulo Financiero - DTE

## Resumen de Cambios

Este documento describe las mejoras implementadas al módulo financiero del DTE Platform.

## Nuevas Funcionalidades

### 1. Cash Flow y Proyecciones (`/dashboard/finances/cashflow`)

**Archivo:** `src/pages/dashboard/finances/FinancesCashflow.jsx`

**Características:**
- Visualización de caja actual (ingresos - gastos realizados)
- Listado de facturas pendientes de cobro con fechas de vencimiento
- Timeline de caja proyectado para los próximos 90 días
- Gráfico de área mostrando la evolución del saldo proyectado
- KPIs:
  - Caja actual
  - Por cobrar (facturas pending/overdue)
  - Por pagar (gastos sin paid_at)
  - Proyección a 30/60/90 días

**Uso:**
1. Navegar a Finanzas → Cash Flow desde el menú lateral
2. Visualizar el gráfico de proyección
3. Revisar las facturas pendientes en el panel derecho
4. Consultar el timeline detallado de los próximos 30 días

---

### 2. Rentabilidad por Proyecto (`/dashboard/finances/projects`)

**Archivo:** `src/pages/dashboard/finances/FinancesProjectProfitability.jsx`

**Características:**
- Listado de todos los proyectos con métricas de rentabilidad
- Por cada proyecto:
  - Ingresos (suma de facturas paid)
  - Gastos (transacciones tipo expense)
  - Ganancia neta
  - Margen de rentabilidad (%)
  - ROI (si hay presupuesto definido)
- Filtros:
  - Por período (select de períodos existentes)
  - Por estado del proyecto (active, completed, on_hold, cancelled)
  - Búsqueda por nombre o cliente
- Modal de detalle con:
  - Transacciones vinculadas
  - Facturas pagadas
  - Desglose de workers y costos

**Uso:**
1. Navegar a Finanzas → Proyectos
2. Usar los filtros para encontrar proyectos específicos
3. Click en "Ver detalle" para ver el desglose completo
4. Exportar datos si es necesario

---

### 3. Pre-visualización de Cierre de Período

**Archivo modificado:** `src/pages/dashboard/finances/FinancesPeriod.jsx`

**Características:**
- Botón "Pre-visualizar cierre" antes de cerrar un período
- Modal con resumen detallado:
  - Totales de ingresos, gastos y ganancia neta
  - Desglose de distribuciones propuestas:
    - Francisco (40%)
    - Federico (30%)
    - Workers pool (15%) con desglose por weight
    - Empresa (15%)
- Validaciones antes de permitir cerrar:
  - Alerta si hay facturas paid sin sincronizar
  - Alerta si no hay weights asignados y el pool es > 0
- Botón para descargar resumen de cierre (JSON) post-cierre

**Uso:**
1. Ir a un período abierto
2. Click en "Pre-visualizar cierre"
3. Revisar las distribuciones propuestas
4. Verificar que no haya alertas de validación
5. Confirmar el cierre

---

### 4. Reportes Anuales y Comparativos (`/dashboard/finances/reports`)

**Archivo:** `src/pages/dashboard/finances/FinancesReports.jsx`

**Características:**
- Selector de año con navegación (prev/next)
- Vista anual con:
  - Gráfico de barras comparando ingresos vs gastos por mes
  - Tabla acumulativa por período
  - Totales del año
- KPIs anuales:
  - Total facturado
  - Total gastado
  - Margen anual promedio
  - Mejor mes / Peor mes
- Comparativa con año anterior:
  - Crecimiento de ingresos (%)
  - Crecimiento de ganancia neta (%)
- Exportación a CSV

**Uso:**
1. Navegar a Finanzas → Reportes
2. Seleccionar el año a consultar
3. Analizar el gráfico de barras mensual
4. Revisar la tabla de períodos
5. Exportar a CSV si se necesita análisis externo

---

### 5. Mejoras al Worker Earnings Widget

**Archivo modificado:** `src/components/finances/WorkerEarningsWidget.jsx`

**Características nuevas:**
- Selector de año para filtrar distribuciones
- Gráfico de evolución (últimos 6 períodos)
- Listado histórico completo con opción "Ver todas"
- Para admins: selector de worker para ver earnings de cualquier persona
- Stats filtradas por el período seleccionado

**Uso:**
1. El widget aparece en el dashboard para workers y admins
2. Usar el selector de año para ver datos históricos
3. Admins pueden cambiar el worker para revisar sus ganancias
4. Click en "Ver todas" para expandir el historial completo

---

## Menú de Navegación Actualizado

El menú de Finanzas ahora tiene submenú expandible con:
- **Resumen** → `/dashboard/finances`
- **Cash Flow** → `/dashboard/finances/cashflow`
- **Proyectos** → `/dashboard/finances/projects`
- **Ledger** → `/dashboard/finances/ledger`
- **Reportes** → `/dashboard/finances/reports`
- **Configuración** → `/dashboard/finances/settings`

Archivos modificados:
- `src/layouts/Sidebar.jsx`
- `src/layouts/DashboardMenu.jsx`

---

## Rutas Agregadas

Actualizaciones en `src/App.jsx` y `src/router/routePrefetch.js`:

```jsx
// Nuevas rutas
<Route path="finances/cashflow" element={<FinancesCashflow />} />
<Route path="finances/projects" element={<FinancesProjectProfitability />} />
<Route path="finances/reports" element={<FinancesReports />} />
```

---

## Notas Técnicas

### Compatibilidad
- No se modificó la lógica de `close_period()` en SQL
- No se cambió la estructura de tablas existente
- Se mantiene la distribución 40/30/15/15

### Estilos
- Se utilizan los componentes existentes (`FinanceKpiCard`, etc.)
- Colores consistentes: emerald (ingresos), rose (gastos), skyblue (acento)
- Animaciones con framer-motion
- Diseño responsive

### Datos de Prueba
El sistema asume que existen:
- Períodos: "Enero 2026", "Febrero 2026", "Marzo 2026"
- Transacciones con diferentes proyectos
- Facturas en estados: pending, paid, overdue
- Workers con contribuciones en diferentes períodos

---

## Próximos Pasos Sugeridos

1. **Optimización de queries**: Para grandes volúmenes de datos, considerar implementar paginación server-side
2. **Caché de reportes**: Cachear datos anuales para mejorar performance
3. **Notificaciones**: Alertar cuando el cash flow proyectado sea negativo
4. **Integración**: Conectar con sistemas bancarios para conciliación automática
