import { json, readJson, env } from "./_shared.mjs";

export default async (event) => {
if (event.httpMethod !== "POST") {
return json(405, { message: "Use POST." });
}

const input = readJson(event);
const callback = input?.Body?.stkCallback;

if (!callback) {
return json(400, {
ResultCode: 1,
ResultDesc: "Invalid callback payload."
});
}

const checkoutRequestID = String(
callback.CheckoutRequestID || ""
).trim();

const merchantRequestID = String(
callback.MerchantRequestID || ""
).trim();

const resultCode = Number(callback.ResultCode);
const resultDesc = String(callback.ResultDesc || "");

if (!checkoutRequestID || !Number.isFinite(resultCode)) {
return json(400, {
ResultCode: 1,
ResultDesc: "Missing payment information."
});
}

/*

* IMPORTANT:
* This endpoint receives Safaricom callbacks, but it does not
* independently authenticate that a callback genuinely came
* from Safaricom.
* 
* Do not grant song downloads based on this callback alone.
* A production implementation must persist the transaction
* and verify payment status through a trusted payment record
* and the appropriate Daraja verification flow.
  */

const result = {
checkoutRequestID,
merchantRequestID,
resultCode,
resultDesc,
successful: resultCode === 0,
amount: null,
mpesaReceiptNumber: null,
transactionDate: null,
phoneNumber: null
};

if (resultCode === 0) {
const items = callback.CallbackMetadata?.Item || [];

for (const item of items) {
  switch (item.Name) {
    case "Amount":
      result.amount = Number(item.Value);
      break;

    case "MpesaReceiptNumber":
      result.mpesaReceiptNumber = String(item.Value || "");
      break;

    case "TransactionDate":
      result.transactionDate = String(item.Value || "");
      break;

    case "PhoneNumber":
      result.phoneNumber = String(item.Value || "");
      break;
  }
}

}

/*

* Until persistent storage and trusted payment verification
* are connected, this function intentionally does not unlock
* downloads or claim that a purchase has been recorded.
  */

return json(200, {
ResultCode: 0,
ResultDesc: "Callback received.",
received: true,
payment: {
checkoutRequestID: result.checkoutRequestID,
resultCode: result.resultCode,
successful: result.successful
}
});
};
