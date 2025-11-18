export interface RedsysPaymentLinkBody {
  amount: number;
  currencyCode: string;
  customerFullName: string;
  title: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface RedsysMerchantParameters {
  DS_MERCHANT_ORDER: string;
  DS_MERCHANT_MERCHANTCODE: string;
  DS_MERCHANT_TERMINAL: string;
  DS_MERCHANT_CURRENCY: string;
  DS_MERCHANT_TRANSACTIONTYPE: string;
  DS_MERCHANT_AMOUNT: number;
  DS_MERCHANT_MERCHANTURL: string;
  DS_MERCHANT_P2F_XMLDATA?: string;
  DS_MERCHANT_CUSTOMER_MAIL?: string;
  DS_MERCHANT_CUSTOMER_MOBILE?: string;
}

export interface RedsysEncodeResponse {
  Ds_SignatureVersion: string;
  Ds_MerchantParameters: string;
  Ds_Signature: string;
}

export interface RedsysDecodeResponse<T> {
  Ds_SignatureVersion: string;
  Ds_MerchantParameters: T;
  Ds_Signature: string;
}

export interface RedsysResponse {
  Ds_Amount: string;
  Ds_Currency: string;
  Ds_Order: string;
  Ds_MerchantCode: string;
  Ds_Terminal: string;
  Ds_Response: string;
  Ds_AuthorisationCode: string;
  Ds_TransactionType: string;
  Ds_SecurePayment: string;
  Ds_MerchantData: string;
}

export interface RedsysPaymentLinkResponse extends RedsysResponse {
  Ds_Language: string;
  Ds_UrlPago2Fases: string;
}

export interface RedsysWebhookResponse extends RedsysResponse {
  Ds_Date: string;
  Ds_Hour: string;
  Ds_Card_Country: string;
  Ds_ConsumerLanguage: string;
  Ds_Card_Brand: string;
  Ds_Card_Typology: string;
  Ds_ProcessedPayMethod: string;
  Ds_Titular: string;
}
