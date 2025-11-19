import {
  Injectable,
  BadRequestException,
  HttpException,
  Logger,
} from "@nestjs/common";
import axios from "axios";
import * as crypto from "crypto";
import {
  RedsysPaymentLinkBody,
  RedsysMerchantParameters,
  RedsysEncodeResponse,
  RedsysDecodeResponse,
  RedsysPaymentLinkResponse,
  RedsysResponse,
} from "./interfaces/redsys-types.interface";
import { RedsysConfig } from "./interfaces/redsys-config.interface";

@Injectable()
export class RedsysService {
  private readonly logger = new Logger(RedsysService.name);
  private readonly config: RedsysConfig;

  constructor(config: RedsysConfig) {
    this.config = config;
    this.logger.log(
      `RedsysService initialized for bank: ${config.bankName} (${config.configKey})`
    );
  }

  /**
   * Creates a payment link with Paygold
   * Operation type: "F" (two-phase payment)
   */
  async createPaymentLink(body: RedsysPaymentLinkBody) {
    const orderNumber = this.generateOrderNumber();

    const merchantParameters: RedsysMerchantParameters = {
      DS_MERCHANT_ORDER: orderNumber,
      DS_MERCHANT_MERCHANTCODE: this.config.merchantCode,
      DS_MERCHANT_TERMINAL: this.config.terminal,
      DS_MERCHANT_CURRENCY: this.getCurrencyIso4217(body.currencyCode),
      DS_MERCHANT_TRANSACTIONTYPE: "F",
      DS_MERCHANT_AMOUNT: body.amount * 100,
      DS_MERCHANT_MERCHANTURL: this.config.webhookUrl,
      DS_MERCHANT_P2F_XMLDATA: `<nombreComprador>${body.customerFullName}</nombreComprador><subjectMailCliente>${body.title}</subjectMailCliente>`,
      DS_MERCHANT_PRODUCTDESCRIPTION: body.title,
    };

    if (body?.customerEmail) {
      merchantParameters.DS_MERCHANT_CUSTOMER_MAIL = body.customerEmail;
    }

    if (body?.customerPhone) {
      merchantParameters.DS_MERCHANT_CUSTOMER_MOBILE = body.customerPhone;
    }

    const merchantParametersBase64 = Buffer.from(
      JSON.stringify(merchantParameters)
    ).toString("base64");
    const signature = this.generateSignature(
      orderNumber,
      merchantParametersBase64
    );

    try {
      const response = await axios.post<RedsysEncodeResponse>(
        this.config.redsysUrl,
        {
          Ds_SignatureVersion: "HMAC_SHA256_V1",
          Ds_MerchantParameters: merchantParametersBase64,
          Ds_Signature: signature,
        },
        {
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        }
      );

      if (response.status !== 200) {
        throw new BadRequestException(
          `${this.config.bankName} error ${response.status}: ${JSON.stringify(
            response.data
          )}`
        );
      }

      const decodedResponse = this.decodeResponse<RedsysPaymentLinkResponse>(
        response.data
      );

      if (decodedResponse.Ds_MerchantParameters.Ds_Response === "9998") {
        return {
          ...decodedResponse,
          bankName: this.config.bankName,
          bankKey: this.config.configKey,
        };
      } else {
        throw new BadRequestException(
          `Respuesta inesperada de ${this.config.bankName}. Código: ${
            decodedResponse.Ds_MerchantParameters.Ds_Response || "desconocido"
          }, Causa: ${this.getFailureReason(
            decodedResponse.Ds_MerchantParameters.Ds_Response
          )}`
        );
      }
    } catch (error) {
      throw new HttpException(
        `Ocurrió un problema con la API de ${this.config.bankName}: ${
          error?.response?.data?.message || error.message
        }`,
        error.status || 500
      );
    }
  }

  getConfig(): RedsysConfig {
    return this.config;
  }

  verifySignature(response: RedsysEncodeResponse): boolean {
    const decodedResponse = this.decodeResponse<RedsysResponse>(response);
    const calculatedSignature = this.generateSignature(
      decodedResponse.Ds_MerchantParameters.Ds_Order,
      response.Ds_MerchantParameters,
      "base64url"
    );
    return calculatedSignature === response.Ds_Signature;
  }

  /**
   * Converts alphabetic currency code to ISO4217 code
   * @param {string} currencyCode Currency in alphanumeric code
   * @returns {string} Currency in ISO4217 code
   */
  getCurrencyIso4217(currencyCode: string): string {
    const currencyMap: Record<string, string> = {
      EUR: "978",
      USD: "840",
      GBP: "826",
      JPY: "392",
      MXN: "484",
      PEN: "604",
      ARS: "032",
    };
    return currencyMap[currencyCode] || "978";
  }

  /**
   * Converts currency code from numeric ISO 4217 to alphabetic code
   * @param {string} currencyIso4217 Currency in ISO4217 code
   * @returns {string} Currency in alphanumeric code
   */
  getCurrencyCode(currencyIso4217: string): string {
    const currencyMap: Record<string, string> = {
      "978": "EUR",
      "840": "USD",
      "826": "GBP",
      "392": "JPY",
      "484": "MXN",
      "604": "PEN",
      "032": "ARS",
    };
    return currencyMap[currencyIso4217] || "EUR";
  }

  /**
   * Verifies if the payment was authorized
   * Codes 0000-0099 = Authorized
   * Code 900 = Authorized (refunds/confirmations)
   * @param {string} responseCode Response code for the payment
   * @returns {boolean} Payment authorized
   */
  isPaymentAuthorized(responseCode: string): boolean {
    const code = parseInt(responseCode, 10);
    return (code >= 0 && code <= 99) || code === 900 || code === 400;
  }

  /**
   * Decodes a complete Redsys response
   * @param {RedsysEncodeResponse} response JSON response from Redsys
   * @returns {RedsysDecodeResponse} Object with the decoded data
   */
  decodeResponse<T>(
    response: RedsysEncodeResponse
  ): RedsysDecodeResponse<T> {
    const merchantParamsJSON = Buffer.from(
      response.Ds_MerchantParameters,
      "base64"
    ).toString("utf8");
    const merchantParams: T = JSON.parse(merchantParamsJSON);

    return {
      ...response,
      Ds_MerchantParameters: merchantParams,
    } as RedsysDecodeResponse<T>;
  }

  /**
   * Generates an order number
   * @returns {string} Order number
   */
  private generateOrderNumber(): string {
    const orderNumber = Date.now().toString().slice(-10);
    return orderNumber;
  }

  /**
   * Generates a derived key by encrypting the order number with 3DES-CBC
   * @param {string} orderNumber Order number
   * @returns {string} Operation key
   */
  private generateOperationKey(orderNumber: string): Buffer {
    const merchantKey = Buffer.from(this.config.secretKey, "base64");
    const orderBuffer = Buffer.alloc(16, 0);
    Buffer.from(orderNumber).copy(
      orderBuffer,
      0,
      0,
      Math.min(orderNumber.length, 16)
    );

    const iv = Buffer.alloc(8, 0);
    const cipher = crypto.createCipheriv("des-ede3-cbc", merchantKey, iv);
    cipher.setAutoPadding(false);

    let operationKey = cipher.update(orderBuffer);
    operationKey = Buffer.concat([operationKey, cipher.final()]);

    return operationKey;
  }

  /**
   * Calculates the standard base64 HMAC SHA-256
   * @param {Buffer} operationKey Operation key
   * @param {string} merchantParametersBase64 Parameters in base64
   * @returns {string} HMAC SHA-256 signature in standard base64
   */
  private generateHmacSignature(
    merchantParametersBase64: string,
    operationKey: Buffer,
    encoding: "base64" | "base64url" = "base64"
  ): string {
    const parametersBuffer = Buffer.from(merchantParametersBase64, "binary");
    const hmac = crypto.createHmac("sha256", operationKey);
    hmac.update(parametersBuffer);
    const hmacResult = hmac.digest();

    let hmacSignature = hmacResult.toString(encoding);
    while (hmacSignature.length % 4) hmacSignature += "=";
    return hmacSignature;
  }

  /**
   * Calculates the signature for each created link
   * For Paygold link creation (REST requests to Santander)
   * @param {string} orderNumber Order number
   * @param {string} merchantParametersBase64 Parameters in base64
   * @returns {string} Signature
   */
  private generateSignature(
    orderNumber: string,
    merchantParametersBase64: string,
    encoding: "base64" | "base64url" = "base64"
  ): string {
    const derivedKey = this.generateOperationKey(orderNumber);
    return this.generateHmacSignature(
      merchantParametersBase64,
      derivedKey,
      encoding
    );
  }

  /**
   * Gets a description of the failure reason based on the response code
   * @param {string} responseCode Response code
   * @returns {string} Description
   */
  private getFailureReason(responseCode: string): string {
    const errorCodes: Record<string, string> = {
      "0180": "Tarjeta no válida",
      "0184": "Error en autenticación",
      "9064": "Número de posiciones de tarjeta incorrecto",
      "9078": "Tipo de operación no permitido",
      "9093": "Tarjeta no existe",
      "9104": "Comercio no registrado",
      "9915": "Transacción duplicada",
      "9999": "Error genérico",
    };
    return errorCodes[responseCode] || "desconocido";
  }
}
