# NestJS Redsys

A NestJS module for integration with the Redsys payment gateway with support for multiple banks (Santander, BBVA, etc.).

## Features

* ✅ Support for multiple banks simultaneously
* ✅ Synchronous and asynchronous configuration
* ✅ Complete TypeScript typing
* ✅ Environment variables support
* ✅ Optional global module
* ✅ Easy dependency injection
* ✅ Signature validation
* ✅ Support for multiple currencies

## Installation

```
npm install @damuel90/nestjs-redsys
```

## Quick Setup

### 1. Basic Configuration (Synchronous)
```
import { Module } from '@nestjs/common';
import { RedsysModule } from '@damuel90/nestjs-redsys';

@Module({
  imports: [
    RedsysModule.forRoot({
      isGlobal: true,
      configs: [
        {
          configKey: 'santander',
          secretKey: 'Mk9m98IfEblmPfrpsawt7BmxObt98Jev',
          webhookUrl: 'https://midominio.com/santander/webhook-listener',
          merchantCode: '999008881',
          terminal: '1',
          redsysUrl: 'https://sis-t.redsys.es:25443/sis/rest/trataPeticionREST',
          bankName: 'Santander',
        },
        {
          configKey: 'bbva',
          secretKey: 'sq7HjrUOBfKmC576ILgskD5srU870gJ7',
          webhookUrl: 'https://midominio.com/bbva/webhook-listener',
          merchantCode: '999008882',
          terminal: '1',
          redsysUrl: 'https://sis-t.redsys.es:25443/sis/rest/trataPeticionREST',
          bankName: 'BBVA',
        },
      ],
    }),
  ],
})
export class AppModule {}
```
### 2. Environment Variables Configuration (Recommended)
```
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedsysModule } from '@damuel90/nestjs-redsys';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RedsysModule.forRootAsync({
      imports: [ConfigModule],
      configs: [
        {
          configKey: 'santander',
          useFactory: (configService: ConfigService) => ({
            secretKey: configService.get('SANTANDER_SECRET_KEY'),
            webhookUrl: `${configService.get('BASE_URL')}/santander/webhook-listener,
            merchantCode: configService.get('SANTANDER_MERCHANT_CODE'),
            terminal: configService.get('SANTANDER_TERMINAL'),
            redsysUrl: configService.get('SANTANDER_REDSYS_URL'),
            bankName: 'Santander',
          }),
          inject: [ConfigService],
        },
        {
          configKey: 'bbva',
          useFactory: (configService: ConfigService) => ({
            secretKey: configService.get('BBVA_SECRET_KEY'),
            webhookUrl: `${configService.get('BASE_URL')}/bbva/webhook-listener,
            merchantCode: configService.get('BBVA_MERCHANT_CODE'),
            terminal: configService.get('BBVA_TERMINAL'),
            redsysUrl: configService.get('BBVA_REDSYS_URL'),
            bankName: 'BBVA',
          }),
          inject: [ConfigService],
        },
      ],
    }),
  ],
})
export class AppModule {}
```

### 3. Required Environment Variables
```
# URL base de tu aplicación
BASE_URL=https://midominio.com

# Configuración Santander
SANTANDER_SECRET_KEY=Mk9m98IfEblmPfrpsawt7BmxObt98Jev
SANTANDER_MERCHANT_CODE=999008881
SANTANDER_TERMINAL=1
SANTANDER_REDSYS_URL=https://sis-t.redsys.es:25443/sis/rest/trataPeticionREST

# Configuración BBVA
BBVA_SECRET_KEY=sq7HjrUOBfKmC576ILgskD5srU870gJ7
BBVA_MERCHANT_CODE=999008882
BBVA_TERMINAL=1
BBVA_REDSYS_URL=https://sis-t.redsys.es:25443/sis/rest/trataPeticionREST
```

## Usage in Services

### 1. Usage with Specific Decorator (Recommended)
```
import { Injectable } from '@nestjs/common';
import { InjectRedsysService, RedsysService, RedsysPaymentLinkBody } from '@damuel90/nestjs-redsys';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRedsysService('santander') 
    private readonly santanderService: RedsysService,
    
    @InjectRedsysService('bbva') 
    private readonly bbvaService: RedsysService,
  ) {}

  async createSantanderPayment(amount: number, customerEmail: string) {
    const paymentBody: RedsysPaymentLinkBody = {
      amount: amount,
      currencyCode: 'EUR',
      customerFullName: 'Juan Pérez',
      title: 'Pago de servicio',
      customerEmail: customerEmail,
    };

    return this.santanderService.createPaymentLink(paymentBody);
  }

  async createBbvaPayment(amount: number, customerEmail: string) {
    const paymentBody: RedsysPaymentLinkBody = {
      amount: amount,
      currencyCode: 'EUR', 
      customerFullName: 'María García',
      title: 'Compra online',
      customerEmail: customerEmail,
    };

    return this.bbvaService.createPaymentLink(paymentBody);
  }
}
```

### 2. Dynamic Usage with Bank Map
```
import { Injectable, Inject } from '@nestjs/common';
import { RedsysService, RedsysPaymentLinkBody } from '@damuel90/nestjs-redsys';

@Injectable()
export class DynamicPaymentService {
  constructor(
    @Inject('REDSYS_SERVICE_MAP')
    private readonly redsysMap: Record<string, RedsysService>,
  ) {}

  async createPayment(bankKey: string, amount: number, customerName: string) {
    const bankService = this.redsysMap[bankKey];
    
    if (!bankService) {
      throw new Error(`Banco no configurado: ${bankKey}. Bancos disponibles: ${Object.keys(this.redsysMap).join(', ')}`);
    }

    const paymentBody: RedsysPaymentLinkBody = {
      amount: amount,
      currencyCode: 'EUR',
      customerFullName: customerName,
      title: 'Pago con ' + bankService.getConfig().bankName,
    };

    return bankService.createPaymentLink(paymentBody);
  }

  getAvailableBanks() {
    return Object.entries(this.redsysMap).map(([key, service]) => ({
      key,
      name: service.getConfig().bankName,
    }));
  }
}
```