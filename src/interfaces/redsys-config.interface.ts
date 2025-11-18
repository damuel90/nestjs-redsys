import { ModuleMetadata } from "@nestjs/common";

export interface RedsysConfig {
  configKey: string;
  secretKey: string;
  webhookUrl: string;
  merchantCode: string;
  terminal: string;
  redsysUrl: string;
  bankName: string;
}

export interface RedsysAsyncConfig extends Pick<ModuleMetadata, "imports"> {
  configKey: string;
  useFactory: (
    ...args: any[]
  ) => Promise<Omit<RedsysConfig, "configKey">> | Omit<RedsysConfig, "configKey">;
  inject?: any[];
}

export interface RedsysModuleOptions {
  isGlobal?: boolean;
  configs: RedsysConfig[] | RedsysAsyncConfig[];
}
