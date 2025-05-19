// hubspot.js
export const createHubspotLead = async ({ name, email, phone, message }) => {
    await fetch("/api/hubspot-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name,
            email,
            phone,
            message,
        }),
    });
};
