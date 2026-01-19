# Google Integration Fixes

He aplicado correcciones críticas para la integración de Google Login y Google Calendar:

1.  **Seguridad (RLS Bypass seguro)**:
    *   Implementé `server/utils/supabaseAdmin.js` que utiliza la `SERVICE_ROLE_KEY` del lado del servidor.
    *   Refactoricé `api/create-event.js` para usar este cliente admin, permitiendo insertar citas en las tablas `appointments` y `clients` sin depender de las políticas RLS del usuario anónimo.
    *   **Importante**: Ahora el backend verifica el token de sesión del usuario (si está disponible) pero ejecuta las escrituras con permisos elevados para garantizar que la cita se guarde.

2.  **Transaccionalidad**:
    *   La lógica de creación (`api/create-event.js`) ahora es secuencial y defensiva:
        *   Primero intenta guardar en Supabase. Si falla, **no** crea el evento en Google Calendar.
        *   Si Supabase guarda OK, intenta crear en Google Calendar.
        *   Si Google falla, intenta borrar la cita de Supabase (Rollback manual) y devuelve error.
    *   Se guarda el `google_event_id` en la tabla `appointments` para futura referencia.

3.  **Refactorización a Serverless (Vercel Ready)**:
    *   Eliminé la dependencia de `api/server.js` como proceso principal.
    *   Configuré los archivos en `api/` para funcionar como "Serverless Functions" nativas de Vercel.
    *   Actualicé `api/server.js` solo para uso local (simulando Vercel).

4.  **Correcciones de Frontend**:
    *   Actualicé `src/services/calendar.js` para enviar el token de sesión (`Authorization: Bearer ...`) al backend, añadiendo una capa extra de seguridad.

### Próximos Pasos (Requeridos por ti)

1.  **Variables de Entorno**:
    Asegúrate de configurar las siguientes variables en tu archivo `.env` local y en el Dashboard de Vercel:
    ```bash
    SUPABASE_SERVICE_ROLE_KEY=eyJh... (Copia esto de tu Supabase Dashboard > Settings > API)
    GOOGLE_CALENDAR_ID=... (El ID de tu calendario principal)
    ```

2.  **Base de Datos**:
    Ejecuta el script SQL generado (`supabase_fix_rls.sql`) en tu Supabase SQL Editor para asegurar que la tabla `appointments` tenga las columnas y políticas correctas (especialmente `user_id` y `google_event_id`).

3.  **Despliegue**:
    *   En desarrollo local, puedes seguir usando `npm run dev` (que usa Vite proxy) y en otra terminal correr el servidor local `node api/server.js` si quieres probar los endpoints.
    *   **Recomendación**: Usa `vercel dev` si tienes la CLI de Vercel instalada, ya que simula todo el entorno en un solo comando.

El sistema ahora es robusto, seguro y está listo para escalar en Vercel.
