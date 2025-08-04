# Configuración de n8n para Cloe Chat

Este documento explica cómo configurar n8n para gestionar las conversaciones de Cloe, el asistente virtual de Grupo DTE.

## Arquitectura

```
Usuario → CleoChat (React) → n8n Webhook → [IA/Database/CRM] → Respuesta → Usuario
                           ↓ (fallback)
                        OpenAI API
```

## Configuración de n8n

### 1. Crear Webhook

1. En n8n, crea un nuevo workflow
2. Agrega un nodo **Webhook** como trigger
3. Configura la URL del webhook: `/webhook/cloe-chat`
4. Método: `POST`
5. Responder con: `Immediately`

### 2. Estructura del Payload

El webhook recibirá este JSON:

```json
{
  "conversationId": "conv_1704636789000_abc123def",
  "message": "Hola, necesito información sobre sus servicios",
  "context": {
    "page": "/development",
    "timestamp": "2024-01-07T10:53:09.000Z",
    "previousMessages": [
      {
        "role": "assistant",
        "content": "¡Hola! Soy Cloe..."
      }
    ]
  }
}
```

### 3. Workflow Sugerido

```
Webhook → Procesar Mensaje → Clasificar Intención → [Múltiples ramas]
                                                   ├── Información Servicios → Respuesta Automática
                                                   ├── Solicitud Contacto → Crear Lead en CRM
                                                   ├── Consulta Técnica → Notificar Equipo
                                                   └── General → OpenAI/Claude → Respuesta
```

### 4. Nodos Recomendados

#### A. Procesar Mensaje
```javascript
// Código para el nodo Function
const { conversationId, message, context } = $input.all()[0].json;

// Limpiar y procesar el mensaje
const processedMessage = message.trim().toLowerCase();

// Detectar intención básica
let intention = 'general';
if (processedMessage.includes('servicio') || processedMessage.includes('precio')) {
  intention = 'services';
} else if (processedMessage.includes('contacto') || processedMessage.includes('reunión')) {
  intention = 'contact';
} else if (processedMessage.includes('desarrollo') || processedMessage.includes('web')) {
  intention = 'development';
}

return {
  conversationId,
  message,
  processedMessage,
  intention,
  context,
  timestamp: new Date().toISOString()
};
```

#### B. Guardar Conversación (opcional)
- Usar nodo **PostgreSQL** o **MongoDB**
- Guardar: conversationId, mensaje, respuesta, timestamp, página

#### C. Respuesta según Intención

**Para Servicios:**
```javascript
const responses = {
  services: "Ofrecemos desarrollo web, automatización de marketing y diseño personalizado. ¿Te interesa algún servicio en particular?",
  contact: "¡Perfecto! Me alegra que quieras contactarnos. ¿Prefieres que te llame alguien del equipo o querés agendar una reunión?",
  development: "Nuestro equipo de desarrollo trabaja con tecnologías modernas como React, Node.js y más. ¿Tenés algún proyecto en mente?"
};

return {
  reply: responses[$('Procesar Mensaje').item.json.intention] || "¿Podés contarme más sobre lo que necesitás?"
};
```

#### D. Integración con CRM (opcional)
- Nodo **HubSpot/Salesforce/Pipedrive**
- Crear leads automáticamente cuando se detecte intención de contacto

### 5. Variables de Entorno

En tu archivo `.env`:

```env
REACT_APP_N8N_WEBHOOK_URL=https://tu-n8n-instance.com/webhook/cloe-chat
```

### 6. Respuesta del Webhook

n8n debe responder con este formato:

```json
{
  "reply": "Tu mensaje de respuesta aquí",
  "conversationId": "conv_1704636789000_abc123def",
  "timestamp": "2024-01-07T10:53:09.000Z"
}
```

## Ventajas de usar n8n

1. **Gestión Centralizada**: Todas las conversaciones pasan por n8n
2. **Integraciones**: Conectar con CRM, email, Slack, etc.
3. **Análisis**: Trackear métricas de conversaciones
4. **Escalabilidad**: Distribuir carga entre diferentes IA
5. **Personalización**: Respuestas específicas por página/contexto
6. **Fallback**: Si n8n falla, usa OpenAI directamente

## Testing

Para probar el webhook:

```bash
curl -X POST https://tu-n8n-instance.com/webhook/cloe-chat \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test123",
    "message": "Hola, necesito información",
    "context": {
      "page": "/test",
      "timestamp": "2024-01-07T10:53:09.000Z"
    }
  }'
```

## Monitoreo

1. Logs de n8n para debug
2. Analytics de conversaciones
3. Métricas de respuesta (tiempo, éxito/fallo)
4. Dashboard de intenciones detectadas

## Próximos Pasos

1. Implementar el workflow básico
2. Configurar integraciones con CRM
3. Añadir métricas y analytics
4. Crear respuestas personalizadas por contexto
5. Implementar escalado a humanos para casos complejos
