const axios = require('axios');

const generateAuthToken = async () => {
    try {
        const response = await axios.post(
            "https://accounts.zoho.in/oauth/v2/token?refresh_token=1000.73c649ffc57208adbb3d98c93d5fb695.2743446b34d737820919b76f80736cde&client_id=1000.M5D17N2P0XNFGB8T3B2WL8UCXDBOBV&client_secret=4c2bc771c7540978217ae92902c4d504de64bc3f96&redirect_uri=http://google.com/oauth2callback&grant_type=refresh_token",
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Error generating auth token:", error.message);
        // throw error;
    }
};

const fetchInvoicesData = async (authToken) => {
    const organizationId = "60019077540";

    try {
        const currentTime = new Date();
        const oneHourAgo = new Date(currentTime - 60 * 60 * 1000);
        const formattedOneHourAgo = oneHourAgo.toISOString();

        const response = await axios.get(
            `https://www.zohoapis.in/books/v3/invoices?organization_id=${organizationId}`,
            {
                headers: {
                    Authorization: `Zoho-oauthtoken ${authToken}`,
                },
            },
        );

        const invoicesData = response.data.invoices.filter((invoice) => {
            return new Date(invoice.created_time) > oneHourAgo;
        });

        return invoicesData;
    } catch (error) {
        console.error("Error fetching invoices data:", error.message);
        // throw error;
    }
};

const fetchInvoiceById = async (invoiceId, authToken) => {
    const config = {
        method: 'get',
        url: `https://www.zohoapis.in/books/v3/invoices/${invoiceId}?organization_id=60019077540`,
        headers: {
            'Authorization': `Zoho-oauthtoken ${authToken}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await axios(config);
        return response.data.invoice;
    } catch (error) {
        console.log('Error fetching invoice by ID:', error);
        // throw error;
    }
};

const postInvoice = async (invoiceData) => {
    const config = {
        method: 'post',
        url: 'https://www.zohoapis.in/crm/v2/Invoices',
        headers: {
            'Authorization': `Zoho-oauthtoken ${ZOHO_CRM_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(invoiceData)
    };

    try {
        return await axios(config);
    } catch (error) {
        console.log('Error posting invoice to Zoho CRM:', error);
        // throw error;
    }
};

const postInvoiceToCRM = async (invoice) => {

    try {
        const productDetails = [];

        for (let i = 0; i < invoice.invoice.line_items.length; i++) {
            const lineItem = invoice.invoice.line_items[i];
            const product = await searchProductBySKU(lineItem.sku);

            const productDetail = {
                "product": {
                    "id": product.id
                },
                "quantity": lineItem.quantity,
                "Discount": lineItem.discount,
                "total_after_discount": lineItem.total - lineItem.discount,
                "net_total": lineItem.total,
                "Tax": lineItem.tax_total,
                "list_price": lineItem.rate,
                "unit_price": lineItem.rate,
                "quantity_in_stock": lineItem.quantity,
                "total": lineItem.total,
                "product_description": lineItem.description || null,
                "line_tax": []
            };

            productDetails.push(productDetail);
        }

        const contact = await searchContactByPhone(invoice.invoice.billing_address.phone);
        const salesPerson = invoice.invoice.salesperson_name.toLowerCase().replace(/\s/g, '');

        const invoiceData = {
            data: [
                {
                    "Payment_Type": invoice.invoice.custom_field_hash.cf_terms_of_payment == "Cash on Delivery" ? "COD" : invoice.invoice.custom_field_hash.cf_terms_of_payment || "",
                    "Currency": invoice.invoice.currency_code || "",
                    "Invoice_Date": invoice.invoice.date || "",
                    "Grand_Total": invoice.invoice.total || "",
                    "Sales_person": salesPerson || "",
                    "Contact_Name": {
                        "id": contact.id || "",
                    },
                    "Status": invoice.invoice.status || "",
                    "Shipping_State": invoice.invoice.shipping_address.state || "",
                    "Subject": invoice.invoice.invoice_number || "",
                    "Product_Details": productDetails || "",
                    "Book_Id": invoice.invoice.invoice_id,
                    "Billing_Phone": invoice.invoice.customer_default_billing_address.phone || "",
                    "Billing_City": invoice.invoice.customer_default_billing_address.city || "",
                    "Billing_Street": invoice.invoice.customer_default_billing_address.street2 || "",
                    "Billing_Country": invoice.invoice.customer_default_billing_address.country || "",
                    "Billing_Code": invoice.invoice.customer_default_billing_address.zip || "",
                    "Billing_Address": invoice.invoice.customer_default_billing_address.address || "",
                    "Billing_State": invoice.invoice.customer_default_billing_address.state || ""
                },
            ],
        };

        console.log("invoiceData");
        console.log(invoiceData);

        const response = await postInvoice(invoiceData);
        console.log('Invoice posted to Zoho CRM successfully:', response.data);
    } catch (error) {
        console.log('Error posting invoice to Zoho CRM:', error.response ? error.response.data : error);
    }
};

const searchProductBySKU = async (sku) => {
    const config = {
        method: 'get',
        url: `https://www.zohoapis.in/crm/v2/Products/search?criteria=(Product_Code:equals:${encodeURIComponent(sku)})`,
        headers: {
            'Authorization': `Zoho-oauthtoken ${ZOHO_CRM_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await axios(config);
        return response.data.data[0];
    } catch (error) {
        console.log('Error searching product by SKU:', error);
        // throw error;
    }
};

const searchContactByPhone = async (phoneNumber) => {
    const config = {
        method: 'get',
        url: `https://www.zohoapis.in/crm/v2/Contacts/search?phone=${phoneNumber}`,
        headers: {
            'Authorization': `Zoho-oauthtoken ${ZOHO_CRM_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await axios(config);
        return response.data.data[0];
    } catch (error) {
        console.log('Error searching contact by phone number:', error);
        // throw error;
    }
};

const executeHourlyTask = async () => {
    const ZOHO_BOOK_ACCESS_TOKEN = await generateAuthToken();

    try {
        const invoicesData = await fetchInvoicesData(ZOHO_BOOK_ACCESS_TOKEN);

        for (const invoice of invoicesData) {
            const invoiceId = invoice.invoice_id;
            const invoiceData = await fetchInvoiceById(invoiceId, ZOHO_BOOK_ACCESS_TOKEN);
            console.log(invoiceData);

            await postInvoiceToCRM({ invoice: invoiceData });
        }
    } catch (error) {
        console.error("Error executing hourly task:", error.message);
    }
};


function ZohoBookToCRMInvoice() {
    executeHourlyTask();
    setInterval(executeHourlyTask, 3600000);
}

module.exports = {
    ZohoBookToCRMInvoice
}