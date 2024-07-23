const axios = require('axios');
const generateAuthToken = async () => {
    try {
        const response = await axios.post(
            "https://accounts.zoho.in/oauth/v2/token?grant_type=refresh_token&client_id=1000.NQHQ4NOSN8HLU681LPNBIA9G9QPACW&client_secret=d744ee4dff6bd91c7b2d80a6c5501dd969a17ef40a&redirect_uri=https://www.google.com/&refresh_token=1000.66e4bf53ecef2649afaa56ecb0d27517.be62c43137365f065ad32399c9f6bce8",
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Error generating auth token:", error.message);
        // throw error;
    }
};
async function getAccessToken() {
    const accessTokenUrl =
      "https://script.googleusercontent.com/macros/echo?user_content_key=lXdz4SBFzPaol3YcnAraVhiZdqboH1sHnTLzGxwhxdv3HHO2Kd8MAX5pRWZPZu6Q9fH1XV03NtB_sExkjD2oABwU-73905SMm5_BxDlH2jW0nuo2oDemN9CCS2h10ox_1xSncGQajx_ryfhECjZEnP-u-p9iTG4jdgmUvWl3RYGEI1cvNowZuDl8EcfID0pm0Kc1gdImgzUha5MgDMQrEwZvnmwH8tzlu022UqIZfQsauDmOpfYrHNz9Jw9Md8uu&lib=MPo20bEL0RwzBzCUXHRmQVrtrsWyMfJRS";
    try {
      const response = await axios.get(accessTokenUrl);
      const accessToken = response.data;
      return accessToken;
    } catch (error) {
      console.log("Error fetching access token: " + error.message);
      return null;
    }
  }
const fetchInvoicesData = async (authToken) => {
    const organizationId = "60019077540";
    try {
        const currentTime = new Date();
        const oneHourAgo = new Date(currentTime - 28 * 24 * 60 * 60 * 1000);
        const response = await axios.get(
            `https://www.zohoapis.in/books/v3/invoices?organization_id=${organizationId}`,
            {
                headers: {
                    Authorization: `Zoho-oauthtoken ${authToken}`,
                },
            }
        );
        const invoicesData = response.data.invoices.filter((invoice) => {
            return new Date(invoice.created_time) > oneHourAgo;
        });
        return invoicesData;
    } catch (error) {
        console.error("Error fetching invoices data:", error.message);
        throw error;
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
        throw error;
    }
};
const postInvoice = async (invoiceData) => {
    const CRM_ACCESS_TOKEN = await getAccessToken();
    console.log("Zoho crm", CRM_ACCESS_TOKEN);
    const config = {
        method: 'post',
        url: 'https://www.zohoapis.in/crm/v2/Invoices',
        headers: {
            'Authorization': `Zoho-oauthtoken ${CRM_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(invoiceData)
    };
    try {
        return await axios(config);
    } catch (error) {
        console.log('Error posting invoice to Zoho CRM:', error);
        throw error;
    }
};
const postInvoiceToCRM = async (invoice) => {
    try {
        const productDetailsPromises = invoice.invoice.line_items.map(async (itemDetails) => {
            const lineItem = itemDetails;
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
            return productDetail;
        });
        const productDetails = await Promise.all(productDetailsPromises);
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
        throw error;
    }
};
const searchProductBySKU = async (sku) => {
    const CRM_ACCESS_TOKEN = await getAccessToken();
    console.log("Zoho crm", CRM_ACCESS_TOKEN);
    const config = {
        method: 'get',
        url: `https://www.zohoapis.in/crm/v2/Products/search?criteria=(Product_Code:equals:${encodeURIComponent(sku)})`,
        headers: {
            'Authorization': `Zoho-oauthtoken ${CRM_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };
    try {
        const response = await axios(config);
        return response.data.data[0];
    } catch (error) {
        console.log('Error searching product by SKU:', error);
        throw error;
    }
};
const searchContactByPhone = async (phoneNumber) => {
        const CRM_ACCESS_TOKEN = await getAccessToken();
        console.log("Zoho crm", CRM_ACCESS_TOKEN);
    const config = {
        method: 'get',
        url: `https://www.zohoapis.in/crm/v2/Contacts/search?phone=${phoneNumber}`,
        headers: {
            'Authorization': `Zoho-oauthtoken ${CRM_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };
    try {
        const response = await axios(config);
        return response.data.data[0];
    } catch (error) {
        console.log('Error searching contact by phone number:', error);
        throw error;
    }
};
const ZohoBookToCRMInvoice = async () => {
    try {
        const ZOHO_BOOK_ACCESS_TOKEN = await generateAuthToken();
        console.log("Zoho book", ZOHO_BOOK_ACCESS_TOKEN);
        const invoicesData = await fetchInvoicesData(ZOHO_BOOK_ACCESS_TOKEN);
        console.log("invoice list", invoicesData);
        for (const invoice of invoicesData) {
            try {
                const invoiceId = invoice.invoice_id;
                const invoiceData = await fetchInvoiceById(invoiceId, ZOHO_BOOK_ACCESS_TOKEN);
                console.log("invoicedata", invoiceData);
                await postInvoiceToCRM({ invoice: invoiceData });
            } catch (error) {
                console.error(`Error processing invoice ${invoice.invoice_id}:`, error.message);
            }
        }
    } catch (error) {
        console.error("Error executing hourly task of invoice:", error.message);
    }
};
module.exports = {
    ZohoBookToCRMInvoice
}
