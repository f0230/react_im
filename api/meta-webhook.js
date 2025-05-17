export default function handler(req, res) {
    // Tu token de verificación (el mismo que pusiste en Meta)
    const VERIFY_TOKEN = 'grupoDTE123';

    // 👉 Validación (GET): cuando Meta prueba el endpoint
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ Verificación exitosa de Webhook');
            res.status(200).send(challenge);
        } else {
            console.warn('❌ Verificación fallida');
            res.status(403).send('Forbidden');
        }
    }

    // 👉 Recepción de datos (POST): cuando Meta envía leads
    else if (req.method === 'POST') {
        const body = req.body;

        if (body.object === 'page') {
            body.entry.forEach(entry => {
                const leadData = entry.changes[0].value;

                // Aquí podés guardar los datos, enviarlos a tu CRM, etc.
                console.log('📩 Nuevo lead recibido:', leadData);
            });

            res.status(200).send('EVENT_RECEIVED');
        } else {
            res.status(404).send('Not Found');
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
}
  