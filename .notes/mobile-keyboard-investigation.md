# Investigación: Problema del Teclado Móvil en Chats

## Problema Identificado

Cuando se abre el teclado virtual en dispositivos móviles al enfocar un campo de entrada (input/textarea) en los chats, la página se desplaza hacia arriba de forma no deseada, causando una mala experiencia de usuario.

## Causa Raíz

### Conceptos de Viewport en Móviles

En navegadores móviles existen dos tipos de viewport:

1. **Layout Viewport**: El viewport utilizado para el diseño CSS y el renderizado inicial
2. **Visual Viewport**: El área visible actualmente en pantalla (se reduce cuando aparece el teclado)

El teclado virtual **siempre** reduce el visual viewport, pero su efecto en el layout viewport varía según el navegador y la configuración.

### Estado Actual del Código

✅ **Ya implementado correctamente:**

1. **Meta tag en `index.html` (línea 6)**:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, interactive-widget=resizes-content" />
   ```
   - `interactive-widget=resizes-content`: Hace que Chrome en Android redimensione el layout viewport cuando aparece el teclado (comportamiento similar a Safari en iOS)

2. **Hook `useViewportHeight.js`**:
   - Usa `window.visualViewport` para detectar cambios en el viewport
   - Establece una variable CSS `--app-height` con la altura visible real
   - Escucha eventos de resize, scroll y orientationchange

3. **CSS en `index.css` (línea 100)**:
   ```css
   #root {
     height: var(--app-height, 100dvh);
   }
   ```
   - Usa `--app-height` como altura primaria
   - Fallback a `100dvh` (dynamic viewport height)

❌ **Problema encontrado:**

**El hook `useViewportHeight` NO se está usando en ningún componente.** Los componentes de chat (`TeamChat.jsx` e `Inbox.jsx`) no lo están importando ni ejecutando.

## Soluciones

### Solución 1: Activar el hook existente (RECOMENDADA)

El código ya está preparado, solo falta activar el hook en los componentes relevantes.

**Archivos a modificar:**

1. **`src/pages/dashboard/chat/TeamChat.jsx`**
2. **`src/pages/dashboard/inbox/Inbox.jsx`**
3. **Opcionalmente: `src/App.jsx`** (para aplicarlo globalmente)

**Cambios necesarios:**

```javascript
// Al inicio del archivo, después de otros imports
import useViewportHeight from '@/hooks/useViewportHeight';

// Dentro del componente, al inicio de la función
const TeamChat = () => {
    useViewportHeight(); // Activar el hook
    
    // ... resto del código
}
```

### Solución 2: Usar solo unidades CSS modernas (Alternativa)

Si prefieres una solución más simple sin JavaScript:

1. **Eliminar la variable `--app-height` del CSS**
2. **Usar solo `100dvh`** en `index.css`:
   ```css
   #root {
     height: 100dvh;
   }
   ```

**Ventajas:**
- Más simple, solo CSS
- `100dvh` se ajusta automáticamente al viewport visible
- Bien soportado en navegadores modernos

**Desventajas:**
- Menos control sobre el comportamiento
- Puede tener ligeras diferencias entre navegadores

### Solución 3: Ajustes adicionales específicos para inputs

Para mejorar aún más la experiencia cuando se enfoca un input:

```javascript
// En TeamChat.jsx o Inbox.jsx
const textareaRef = useRef(null);

useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleFocus = () => {
        // Pequeño delay para permitir que el teclado se abra
        setTimeout(() => {
            textarea.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest',
                inline: 'nearest'
            });
        }, 300);
    };

    textarea.addEventListener('focus', handleFocus);
    return () => textarea.removeEventListener('focus', handleFocus);
}, []);

// En el JSX:
<textarea ref={textareaRef} ... />
```

## Recomendación Final

**Implementar Solución 1** porque:

1. Ya tienes todo el código necesario
2. Proporciona máximo control y compatibilidad
3. El hook está bien diseñado y probado
4. Es una modificación mínima (solo 2-3 líneas por componente)

**Pasos inmediatos:**

1. Importar `useViewportHeight` en `TeamChat.jsx` e `Inbox.jsx`
2. Llamar al hook al inicio de cada componente
3. Probar en dispositivos móviles reales (Android Chrome y iOS Safari)

## Pruebas Recomendadas

Después de implementar la solución:

1. **Android Chrome**: Abrir chat, enfocar input, verificar que el mensaje más reciente siga visible
2. **iOS Safari**: Mismo test que Android
3. **Diferentes tamaños de pantalla**: Probar en móviles pequeños y tablets
4. **Rotación**: Verificar comportamiento al rotar el dispositivo
5. **Teclado predictivo**: Probar con teclados de diferentes tamaños (algunos teclados en Android son más grandes)

## Referencias Técnicas

- [Visual Viewport API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API)
- [CSS `dvh` units](https://developer.mozilla.org/en-US/docs/Web/CSS/length#relative_length_units_based_on_viewport)
- [Chrome `interactive-widget` meta tag](https://developer.chrome.com/blog/viewport-resize-behavior/)

---

**Fecha de investigación**: 2026-02-04  
**Estado**: Solución identificada, pendiente de implementación
