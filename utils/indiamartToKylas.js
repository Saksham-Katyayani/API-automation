const axios = require('axios');
const async = require('async');

function mapLeadToKylasFormat(lead) {
    return {
        "lastName": `${lead.SENDER_NAME}`,
        "city": `${lead.SENDER_CITY}`,
        "phoneNumbers": [
            {
                "type": "MOBILE",
                "code": `${lead.SENDER_COUNTRY_ISO}`,
                "value": lead.SENDER_MOBILE,
                "primary": true
            }
        ],
        "state": `${lead.SENDER_STATE}`,
        "country": `${lead.SENDER_COUNTRY_ISO}`,
        "source": 80347,
        "companyName": `${lead.SENDER_COMPANY}`,
        "requirementName": `${lead.SUBJECT}`,
        "subSource": "Katyayani"
    };
}

async function postLeadToKylas(lead) {
    try {
        const postData = mapLeadToKylasFormat(lead);
        const response = await axios.post('https://api.kylas.io/v1/leads', postData, {
            headers: {
                'api-key': '1e8d51e4-de78-4394-b5a9-e9d10b1e72d2'
            }
        });
        console.log('IndiaMart Lead posted to Kylas:', response.data);
    } catch (error) {
        console.error('Error posting lead to Kylas:', error);
    }
}

async function fetchLeads() {
    try {
        const currentTime = new Date();
        const endTime = formatDateTime(currentTime);
        const startTime = formatDateTime(new Date(currentTime - 10 * 60 * 1000));
        const apiUrl = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=mRyyE71u4H/AS/eq4XCO7l2Ko1rNlDRk&start_time=${startTime}&end_time=${endTime}`;
        console.log(apiUrl);
        const response = await axios.get(apiUrl);
        if (response.status === 200 && response.data.STATUS === 'SUCCESS') {
            const leads = response.data.RESPONSE;
            console.log('Received leads:', leads);
            await async.eachSeries(leads, async (lead) => {
                await postLeadToKylas(lead);
            });
        } else {
            console.error('Error: Unable to fetch leads. Status:', response.data);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

function formatDateTime(date) {
    const ISTOffset = 5.5 * 60;
    const ISTTime = date.getTime() + (ISTOffset * 60000);
    return new Date(ISTTime).toISOString().slice(0, 19).replace('T', ' ');
}

function indiamartToKylas() {
    console.log(ZOHO_CRM_ACCESS_TOKEN)
    fetchLeads();
    setInterval(fetchLeads, 10 * 60 * 1000);
}

module.exports = {
    indiamartToKylas
};