export const createHubspotLead = async ({ name, email, phone, message }) => {
    await fetch("/api/hubspot-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            properties: {
                email,
                firstname: name,
                phone,
                message, // puedes mapearlo a un campo personalizado de HubSpot si lo tenés
            },
        }),
    });
};
  