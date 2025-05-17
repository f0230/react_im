import axios from "axios";

export const createHubspotLead = async (formData) => {
    return axios.post("/api/hubspot-lead", formData);
};
