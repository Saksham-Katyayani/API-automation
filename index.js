const express = require('express');
const { setIntervalAsync } = require('set-interval-async/dynamic');
const { updateAccessToken } = require('./utils/token.js');
const { indiamartToKylas } = require("./utils/indiamartToKylas.js");
const { ZohoBookToCRMInvoice } = require("./utils/bookToCrmInvoice.js");
const { ZohoCRMToKylasChatLeads } = require("./utils/crmToKylasChatLead.js");

require("dotenv").config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

var ZOHO_CRM_ACCESS_TOKEN = '';

// async function startServer() {
//     // indiamartToKylas();
//     // ZohoCRMToKylasChatLeads();
// }

// startServer();

updateAccessToken();

ZohoBookToCRMInvoice();

const accessTokenUpdateInterval = 10 * 60 * 1000;
setIntervalAsync(updateAccessToken, accessTokenUpdateInterval);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});