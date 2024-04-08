const axios = require('axios');

async function fetchAccessToken() {
    const accessTokenUrl = process.env.ACCESS_TOKEN_URL;

    try {
        const response = await axios.get(accessTokenUrl);
        return response.data.trim();
    } catch (error) {
        console.log("Error fetching access token:", error);
        throw error;
    }
}

async function updateAccessToken() {

    try {
        const accessTokens = await fetchAccessToken();
        ZOHO_CRM_ACCESS_TOKEN = accessTokens;
        console.log("Zoho CRM access token updated:", ZOHO_CRM_ACCESS_TOKEN);
        return ZOHO_CRM_ACCESS_TOKEN;
    } catch (error) {
        console.log("Error updating access token:", error);
        return null;
    }
}

module.exports = {
    updateAccessToken
}
