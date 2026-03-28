# Sistema de Compensación Workers - DTE

## 🎯 Concepto Central: "Peso Acumulativo + Valor del Trabajo"

El sistema combina **antigüedad** (puntos ganan peso con el tiempo) + **valor del trabajo** (no todas las tareas valen igual).

---

## 📊 Fórmula de Cálculo

```
Participación Worker = 
    (Puntos Ajustados Worker) / (Total Puntos Ajustados del Período) × Pool Workers

Donde:
    Puntos Ajustados = Σ(Tarea × Factor Antigüedad × Factor Complejidad)
```

---

## 1️⃣ Factor de Antigüedad (Seniority Multiplier)

Cuantos más períodos trabajados, más "pesan" los puntos.

```javascript
const SENIORITY_TIERS = [
    { meses: 0,   multiplicador: 1.0,  nombre: 'Novato' },      // 0-5 meses
    { meses: 6,  multiplicador: 1.2,  nombre: 'Junior' },       // 6-11 meses
    { meses: 12, multiplicador: 1.5,  nombre: 'Semi-Senior' },  // 12-23 meses
    { meses: 24, multiplicador: 2.0,  nombre: 'Senior' },       // 24+ meses
];

function calcularFactorAntiguedad(workerId, periodoActual) {
    // Contar períodos previos donde el worker tuvo contribuciones
    const periodosTrabajados = db.finance_worker_contributions
        .where('worker_id', workerId)
        .where('contribution_weight', '>', 0)
        .distinct('period_id')
        .count();
    
    const mesesTrabajados = periodosTrabajados; // Asumiendo períodos mensuales
    
    const tier = SENIORITY_TIERS
        .reverse()
        .find(t => mesesTrabajados >= t.meses);
    
    return tier?.multiplicador || 1.0;
}
```

### Ejemplo:
- **Worker A**: 3 meses trabajados → Factor 1.0
- **Worker B**: 15 meses trabajados → Factor 1.5

Si ambos hacen una tarea de 10 puntos:
- A aporta: 10 × 1.0 = 10 puntos ajustados
- B aporta: 10 × 1.5 = 15 puntos ajustados

---

## 2️⃣ Factor de Complejidad (Task Weight)

No todas las tareas valen igual.

```javascript
const TASK_COMPLEXITY = {
    // Diseño
    'diseño_logo': { puntos: 3, categoria: 'diseño' },
    'diseño_ui_completo': { puntos: 10, categoria: 'diseño' },
    'diseño_redes_simple': { puntos: 2, categoria: 'diseño' },
    
    // Desarrollo
    'dev_landing_simple': { puntos: 5, categoria: 'dev' },
    'dev_feature_compleja': { puntos: 15, categoria: 'dev' },
    'dev_bugfix': { puntos: 1, categoria: 'dev' },
    'dev_arquitectura': { puntos: 20, categoria: 'dev' },
    
    // Contenido
    'copy_blog': { puntos: 2, categoria: 'contenido' },
    'copy_website': { puntos: 5, categoria: 'contenido' },
    'estrategia_marca': { puntos: 8, categoria: 'contenido' },
    
    // Video/Motion
    'video_edicion_simple': { puntos: 4, categoria: 'video' },
    'motion_complejo': { puntos: 12, categoria: 'video' },
    'animacion_3d': { puntos: 18, categoria: 'video' },
    
    // Gestión
    'project_management': { puntos: 8, categoria: 'gestion' },
    'reunion_cliente': { puntos: 2, categoria: 'gestion' },
    'qa_testing': { puntos: 4, categoria: 'gestion' },
};

// Bonus por criticidad
const CRITICALITY_BONUS = {
    'normal': 1.0,
    'importante': 1.3,    // Tarea que bloquea otras
    'critica': 1.8,       // Tarea de lanzamiento/core
    'emergencia': 2.5,    // Hotfix, incendio
};
```

---

## 3️⃣ Esquema SQL Propuesto

```sql
-- Catálogo de tipos de tarea con sus valores
CREATE TABLE worker_task_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,           -- 'diseño_ui', 'dev_backend', etc.
    name TEXT NOT NULL,                   -- 'Diseño UI/UX'
    category TEXT NOT NULL,               -- 'diseño', 'dev', 'contenido', 'video', 'gestion'
    base_points NUMERIC(5,2) NOT NULL DEFAULT 5,
    description TEXT,
    requires_approval BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Log de trabajo realizado (la base del cálculo)
CREATE TABLE worker_work_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES profiles(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    period_id UUID REFERENCES finance_periods(id),
    
    -- Qué se hizo
    task_type_id UUID REFERENCES worker_task_types(id),
    task_description TEXT NOT NULL,
    
    -- Cuánto se trabajó
    hours_spent NUMERIC(5,2),             -- Opcional: horas reales
    quantity INTEGER DEFAULT 1,           -- Cantidad de unidades (ej: 3 logos)
    
    -- Ajustes
    complexity_override NUMERIC(3,2),     -- Si el admin quiere ajustar puntos
    criticality_level TEXT DEFAULT 'normal' CHECK (criticality_level IN ('normal', 'importante', 'critica', 'emergencia')),
    
    -- Estado
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMP,
    
    -- Metadata
    worked_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Para cálculo automático
    calculated_points NUMERIC(8,2) GENERATED ALWAYS AS (
        COALESCE(complexity_override, 
            (SELECT base_points FROM worker_task_types WHERE id = task_type_id)
        ) * 
        CASE criticality_level
            WHEN 'normal' THEN 1.0
            WHEN 'importante' THEN 1.3
            WHEN 'critica' THEN 1.8
            WHEN 'emergencia' THEN 2.5
        END * 
        quantity
    ) STORED
);

-- Tabla de antigüedad (histórico por período)
CREATE TABLE worker_seniority_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES profiles(id),
    period_id UUID NOT NULL REFERENCES finance_periods(id),
    months_worked INTEGER NOT NULL,       -- Meses acumulados hasta este período
    seniority_tier TEXT NOT NULL,         -- 'novato', 'junior', 'semi-senior', 'senior'
    multiplier_applied NUMERIC(3,2) NOT NULL,
    UNIQUE(worker_id, period_id)
);

-- Vista materializada para cálculo rápido
CREATE MATERIALIZED VIEW worker_contribution_calculations AS
WITH seniority AS (
    SELECT 
        worker_id,
        period_id,
        months_worked,
        multiplier_applied
    FROM worker_seniority_snapshots
),
work_summary AS (
    SELECT 
        wwl.worker_id,
        wwl.period_id,
        wwl.project_id,
        SUM(wwl.calculated_points) as raw_points,
        SUM(wwl.hours_spent) as total_hours,
        COUNT(*) as task_count
    FROM worker_work_logs wwl
    WHERE wwl.status = 'approved'
    GROUP BY wwl.worker_id, wwl.period_id, wwl.project_id
)
SELECT 
    ws.worker_id,
    ws.period_id,
    ws.project_id,
    ws.raw_points,
    ws.total_hours,
    ws.task_count,
    s.months_worked,
    s.seniority_tier,
    s.multiplier_applied,
    (ws.raw_points * s.multiplier_applied) as weighted_points,
    -- Ranking dentro del período
    RANK() OVER (PARTITION BY ws.period_id ORDER BY (ws.raw_points * s.multiplier_applied) DESC) as rank_in_period
FROM work_summary ws
JOIN seniority s ON ws.worker_id = s.worker_id AND ws.period_id = s.period_id;
```

---

## 4️⃣ Función de Cálculo Automático

```sql
CREATE OR REPLACE FUNCTION calculate_period_worker_weights(
    p_period_id UUID
) RETURNS TABLE (
    worker_id UUID,
    project_id UUID,
    raw_points NUMERIC,
    weighted_points NUMERIC,
    share_percentage NUMERIC,
    calculation_breakdown JSONB
) AS $$
DECLARE
    v_total_weighted NUMERIC;
BEGIN
    -- Calcular total ponderado del período
    SELECT COALESCE(SUM(weighted_points), 0)
    INTO v_total_weighted
    FROM worker_contribution_calculations
    WHERE period_id = p_period_id;
    
    IF v_total_weighted = 0 THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        c.worker_id,
        c.project_id,
        c.raw_points,
        c.weighted_points,
        ROUND((c.weighted_points / v_total_weighted * 100), 2),
        jsonb_build_object(
            'months_seniority', c.months_worked,
            'tier', c.seniority_tier,
            'multiplier', c.multiplier_applied,
            'hours_worked', c.total_hours,
            'tasks_completed', c.task_count,
            'rank_in_period', c.rank_in_period,
            'raw_points', c.raw_points,
            'formula', format('%s pts × %s seniority = %s pts ajustados', 
                c.raw_points, c.multiplier_applied, c.weighted_points)
        )
    FROM worker_contribution_calculations c
    WHERE c.period_id = p_period_id
    ORDER BY c.weighted_points DESC;
END;
$$ LANGUAGE plpgsql;
```

---

## 5️⃣ Lógica de "Worker Inactivo" (Cuando dejan de trabajar)

### El Problema:
Si un worker trabajó 6 meses, acumuló seniority, y se va... ¿qué pasa?

### Solución: Sistema de Vesting (Derechos Adquiridos)

```javascript
const VESTING_RULES = {
    // Si un worker deja de trabajar, su "multiplicador" se congela
    // pero solo gana proporcional al tiempo trabajado en el período
    
    // Ejemplo:
    // Worker B es Senior (2x) pero dejó de trabajar a mitad del mes
    // Período: Enero 2026 (31 días)
    // B trabajó: 15 días
    // Factor aplicado: 2.0 × (15/31) = 0.97
    
    active_worker: {
        full_multiplier: true,
        prorated_by_days: false
    },
    
    inactive_worker: {
        // Si dejó de trabajar antes del cierre
        full_multiplier: false,
        prorated_by_days: true,  // Proporcional a días trabajados
        seniority_frozen: true,   // Mantiene tier alcanzado
        // Pero NO acumula más meses de seniority
    }
};
```

### Implementación SQL:

```sql
-- Tabla para trackear estado de workers por período
CREATE TABLE worker_period_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES profiles(id),
    period_id UUID NOT NULL REFERENCES finance_periods(id),
    
    -- Estado
    status TEXT NOT NULL CHECK (status IN ('active', 'partial', 'inactive')),
    days_worked INTEGER,           -- Días efectivos trabajados
    total_days_period INTEGER,     -- Días totales del período
    
    -- Congelamiento
    frozen_multiplier NUMERIC(3,2), -- Multiplicador al momento de salir
    
    UNIQUE(worker_id, period_id)
);

-- Ajuste en el cálculo para workers parciales
CREATE OR REPLACE FUNCTION get_effective_multiplier(
    p_worker_id UUID,
    p_period_id UUID
) RETURNS NUMERIC AS $$
DECLARE
    v_base_multiplier NUMERIC;
    v_status TEXT;
    v_days_worked INTEGER;
    v_total_days INTEGER;
BEGIN
    -- Verificar estado
    SELECT status, days_worked, total_days_period
    INTO v_status, v_days_worked, v_total_days
    FROM worker_period_status
    WHERE worker_id = p_worker_id AND period_id = p_period_id;
    
    -- Obtener multiplicador base de seniority
    SELECT multiplier_applied INTO v_base_multiplier
    FROM worker_seniority_snapshots
    WHERE worker_id = p_worker_id AND period_id = p_period_id;
    
    IF v_status = 'partial' AND v_days_worked IS NOT NULL THEN
        -- Worker trabajó parcial: prorratear
        RETURN v_base_multiplier * (v_days_worked::NUMERIC / v_total_days);
    END IF;
    
    RETURN v_base_multiplier;
END;
$$ LANGUAGE plpgsql;
```

---

## 6️⃣ ¿Es Justo Dividir Igual si Hacen Cosas Diferentes?

**Respuesta corta: NO.** Por eso el sistema pondera por:

| Factor | Por qué importa |
|--------|-----------------|
| **Complejidad** | Un arquitecto de sistema aporta más valor que quien edita texto |
| **Antigüedad** | El senior sabe evitar errores costosos, vale más |
| **Horas** | Más tiempo invertido = más producción (generalmente) |
| **Criticidad** | Resolver un bug crítico salva el proyecto |

### Ejemplo Comparativo:

**Proyecto X - Ganancia Neta: $10,000**
Pool Workers (15%): $1,500

| Worker | Tareas | Horas | Antigüedad | Puntos Base | Multiplicador | Puntos Ajustados | Participación |
|--------|--------|-------|------------|-------------|---------------|------------------|---------------|
| **A** | 3 logos, 2 UI | 40hs | 18 meses (1.5x) | 35 pts | 1.5 | 52.5 | **60%** → $900 |
| **B** | 5 post redes | 20hs | 3 meses (1.0x) | 10 pts | 1.0 | 10 | **11%** → $165 |
| **C** | Arquitectura DB | 15hs | 6 meses (1.2x) | 20 pts | 1.2 | 24 | **27%** → $405 |
| **D** | Bugfix crítico | 5hs | 12 meses (1.5x) | 15 pts (×1.8 crítico) = 27 | 1.5 | 40.5 | **46%** → Wait... esto da más de 100% |

### Corrección:
El sistema debe NORMALIZAR al final:
```
Total Puntos Ajustados: 52.5 + 10 + 24 + 40.5 = 127

A: 52.5 / 127 = 41% → $615
B: 10 / 127 = 8% → $120
C: 24 / 127 = 19% → $285
D: 40.5 / 127 = 32% → $480
```

**Resultado:** Aunque B trabajó más horas que C, C ganó más porque su trabajo fue más complejo y valioso.

---

## 7️⃣ Flujo de Trabajo del Sistema

```
1. Durante el período:
   └─ Workers loguean tareas en el sistema (o se importan automáticamente)
   └─ Admin aprueba/rechaza logs (con feedback)

2. Antes de cerrar período:
   └─ Sistema calcula automáticamente:
      ├─ Puntos por tarea
      ├─ Factor de antigüedad (actualizado)
      └─ Peso final
   └─ Admin REVISA el desglose propuesto
   └─ Opción: Ajustar manualmente casos excepcionales

3. Cierre:
   └─ Sistema distribuye proporcionalmente
   └─ Cada worker ve su desglose completo:
      "Ganaste $X porque:
       - Completaste 5 tareas (25 pts base)
       - Multiplicador Senior 1.5x (18 meses)
       - Horas totales: 45
       - Participación: 23% del pool"
```

---

## 8️⃣ Ventajas de este Sistema

1. **Transparencia total**: Cada worker ve exactamente por qué ganó lo que ganó
2. **Incentivo correcto**: Se premia combinación de cantidad + calidad + lealtad
3. **Flexibilidad**: Admin puede hacer ajustes manuales cuando la fórmula falla
4. **Histórico**: Se conserva el historial de cómo se calculó cada cierre
5. **Justo para inactivos**: Si alguien se va, gana proporcional al tiempo real trabajado

---

## ¿Te gusta esta dirección? 

Puedo implementar:
1. Las tablas SQL
2. La función de cálculo automático
3. La UI para loguear tareas
4. El panel de revisión para el admin

¿Qué parte querés que empiece primero?
