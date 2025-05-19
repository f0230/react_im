export const createHubspotLead = async ({ name, email, phone, message }) => {
    await fetch("/api/hubspot-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            properties: {
                email,
                firstname: name,
                phone,
                mensaje: message, // Asegurate que este campo exista en HubSpot
            },
        }),
    });
};
