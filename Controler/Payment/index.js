const axios = require("axios");
const crypto = require("crypto");
let sdkClient = null;
try {
    const { StandardCheckoutClient, Env } = require('pg-sdk-node');
    const clientId = process.env.PHONEPE_CLIENT_ID || "";
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET || "";
    const clientVersion = Number(process.env.PHONEPE_CLIENT_VERSION || 1);
    const env = (process.env.PHONEPE_ENV || 'SANDBOX').toUpperCase() === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX;
    if (clientId && clientSecret) {
        sdkClient = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
    }
} catch (e) {
    // SDK not installed or failed to init; will use REST fallback
}

// Support REST (MerchantId + SaltKey) and SDK (ClientId + ClientSecret)
const MERCHANT_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";
const MERCHANT_STATUS_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status";
const PHONEPE_MERCHANT_ID = 'TEST-M23AFF5FJ6HVV_25082';
const PHONEPE_SALT_KEY = 'NzQwN2IyNzItNWI3MC00ZGQwLWFmY2YtYjc4NzJmOWQyYmE1';
const PHONEPE_SALT_INDEX = "1";

function generateSha256Hash(input) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

function buildInitiateHeaders(base64Payload) {
    const apiPath = "/pg/v1/pay";
    const xVerify = `${generateSha256Hash(base64Payload + apiPath + PHONEPE_SALT_KEY)}###${PHONEPE_SALT_INDEX}`;
    return {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
    };
}

function buildStatusHeaders(merchantTransactionId) {
    const apiPath = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}`;
    const xVerify = `${generateSha256Hash(apiPath + PHONEPE_SALT_KEY)}###${PHONEPE_SALT_INDEX}`;
    return {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
    };
}

exports.initiatePayment = async (req, res) => {
    try {
        const {
            amount, // amount in INR; will be converted to paisa
            merchantTransactionId,
            merchantUserId,
            redirectUrl,
            callbackUrl,
            mobileNumber,
            message,
        } = req.body || {};

        // Prefer REST if merchant credentials present; else SDK
        const canUseRest = Boolean(PHONEPE_MERCHANT_ID && PHONEPE_SALT_KEY);
        const useSdk = !canUseRest && Boolean(sdkClient);

        if (!amount || !merchantTransactionId || !merchantUserId) {
            return res.status(400).json({ message: "amount, merchantTransactionId and merchantUserId are required" });
        }

        const amountInPaisa = Math.round(Number(amount) * 100);

        if (useSdk) {
            const { StandardCheckoutPayRequest, MetaInfo } = require('pg-sdk-node');
            const metaInfo = MetaInfo.builder().udf1(message || 'order').build();
            const request = StandardCheckoutPayRequest.builder()
                .merchantOrderId(merchantTransactionId)
                .amount(amountInPaisa)
                .redirectUrl(redirectUrl || `${req.protocol}://${req.get("host")}/payment/success`)
                .callbackUrl(callbackUrl || `${req.protocol}://${req.get("host")}/payment/callback`)
                .mobileNumber(mobileNumber)
                .merchantUserId(merchantUserId)
                .metaInfo(metaInfo)
                .build();
            const sdkResp = await sdkClient.pay(request);
            return res.status(200).json({ success: true, data: sdkResp });
        } else if (canUseRest) {
            const payload = {
                merchantId: PHONEPE_MERCHANT_ID,
                merchantTransactionId,
                merchantUserId,
                amount: amountInPaisa,
                redirectUrl: redirectUrl || `${req.protocol}://${req.get("host")}/payment/success` ,
                redirectMode: "REDIRECT",
                callbackUrl: callbackUrl || `${req.protocol}://${req.get("host")}/payment/callback` ,
                mobileNumber,
                message,
                paymentInstrument: { type: "PAY_PAGE" },
            };

            const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
            const headers = buildInitiateHeaders(base64Payload);
            const response = await axios.post(MERCHANT_BASE_URL, { request: base64Payload }, { headers });
            return res.status(200).json(response.data);
        }
    } catch (error) {
        const status = error.response?.status || 500;
        const data = error.response?.data || { message: error.message };
        console.error("[PhonePe] initiate error:", {
            status,
            code: data?.code,
            message: data?.message || error.message,
        });
        return res.status(status).json(data);
    }
};

exports.getPaymentStatus = async (req, res) => {
    try {
        const { merchantTransactionId } = req.params;

        if (!merchantTransactionId) {
            return res.status(400).json({ message: "merchantTransactionId is required" });
        }

        const canUseRest = Boolean(PHONEPE_MERCHANT_ID && PHONEPE_SALT_KEY);
        // Use SDK status when SDK is configured and REST not available
        if (!canUseRest && sdkClient) {
            try {
                const sdkStatus = await sdkClient.getOrderStatus(merchantTransactionId);
                return res.status(200).json({ success: true, data: sdkStatus });
            } catch (sdkErr) {
                // fall through to REST if available
            }
        }
        if (canUseRest) {
            const headers = buildStatusHeaders(merchantTransactionId);
            const url = `${MERCHANT_STATUS_URL}/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}`;
            const response = await axios.get(url, { headers });
            return res.status(200).json(response.data);
        }
        return res.status(500).json({ message: "PhonePe not configured. Provide either SDK or REST credentials." });
    } catch (error) {
        const status = error.response?.status || 500;
        const data = error.response?.data || { message: error.message };
        console.error("[PhonePe] status error:", {
            status,
            code: data?.code,
            message: data?.message || error.message,
        });
        return res.status(status).json(data);
    }
};

exports.callbackHandler = async (req, res) => {
    // PhonePe sends callback to the configured callbackUrl; you can verify signature if provided
    try {
        // Process order state from req.body per PhonePe docs
        // Update your order in DB here
        return res.status(200).json({ received: true });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


