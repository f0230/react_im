export default async function handler(req, res) {
    const { name, email, message } = req.body;

    const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;

    if (!HUBSPOT_TOKEN) {
        return res.status(500).json({ error: 'Falta el token de HubSpot' });
    }

    try {
        const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${HUBSPOT_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                properties: {
                    email,
                    firstname: name,
                    message,
                },
            }),
        });

        if (!response.ok) throw new Error(await response.text());

        res.status(200).json({ message: 'Lead enviado a HubSpot' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error enviando a HubSpot' });
    }
}
  