// redsys-utils.service.ts
import { Injectable, Inject, Logger } from "@nestjs/common";
import {
  RedsysModuleOptions,
  RedsysConfig,
} from "./interfaces/redsys-config.interface";
import { REDSYS_MODULE_OPTIONS } from "./constants/redsys.constants";

@Injectable()
export class RedsysUtilsService {
  private readonly logger = new Logger(RedsysUtilsService.name);

  constructor(
    @Inject(REDSYS_MODULE_OPTIONS)
    private readonly options: RedsysModuleOptions
  ) {}

  /**
   * Checks if the module is global
   */
  isModuleGlobal(): boolean {
    return this.options.isGlobal || false;
  }

  /**
   * Gets all configured bank keys
   */
  getConfiguredBanks(): string[] {
    return this.options.configs.map((config) =>
      this.isRedsysConfig(config) ? config.configKey : config.configKey
    );
  }

  /**
   * Gets the configuration for a specific bank
   */
  getBankConfig(bankKey: string): RedsysConfig | null {
    const config = this.options.configs.find((c) =>
      this.isRedsysConfig(c) ? c.configKey === bankKey : c.configKey === bankKey
    );

    return this.isRedsysConfig(config) ? config : null;
  }

  /**
   * Validates the module configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.options.configs || this.options.configs.length === 0) {
      errors.push("No hay bancos configurados");
    }

    this.options.configs.forEach((config, index) => {
      if (this.isRedsysConfig(config)) {
        if (!config.configKey)
          errors.push(`Config ${index}: configKey es requerido`);
        if (!config.secretKey)
          errors.push(`Config ${index}: secretKey es requerido`);
        if (!config.merchantCode)
          errors.push(`Config ${index}: merchantCode es requerido`);
        if (!config.terminal)
          errors.push(`Config ${index}: terminal es requerido`);
        if (!config.redsysUrl)
          errors.push(`Config ${index}: redsysUrl es requerido`);
      } else {
        if (!config.configKey)
          errors.push(`AsyncConfig ${index}: key es requerido`);
      }
    });

    const result = {
      isValid: errors.length === 0,
      errors,
    };

    if (!result.isValid) {
      this.logger.warn("Configuración de Redsys inválida:", result.errors);
    }

    return result;
  }

  /**
   * Gets configuration statistics
   */
  getConfigStats() {
    const validation = this.validateConfig();

    return {
      isGlobal: this.isModuleGlobal(),
      totalBanks: this.options.configs.length,
      configuredBanks: this.getConfiguredBanks(),
      isValid: validation.isValid,
      errors: validation.errors,
    };
  }

  /**
   * Checks if a bank is configured
   */
  isBankConfigured(bankKey: string): boolean {
    return this.getConfiguredBanks().includes(bankKey);
  }

  /**
   * Type guard for RedsysConfig
   */
  private isRedsysConfig(config: any): config is RedsysConfig {
    return config && typeof config === "object" && "secretKey" in config;
  }
}
