import {
  DynamicModule,
  Module,
  Provider,
  ModuleMetadata,
} from "@nestjs/common";
import { RedsysService } from "./redsys.service";
import {
  RedsysConfig,
  RedsysAsyncConfig,
  RedsysModuleOptions,
} from "./interfaces/redsys-config.interface";
import { REDSYS_MODULE_OPTIONS, REDSYS_TOKEN_PREFIX } from "./constants/redsys.constants";
import { RedsysUtilsService } from "./redsys-utils.service";

@Module({})
export class RedsysModule {
  static forRoot(options: RedsysModuleOptions): DynamicModule {
    const { configs, isGlobal = false } = options;

    const moduleDefinition: DynamicModule = {
      module: RedsysModule,
      providers: [
        {
          provide: REDSYS_MODULE_OPTIONS,
          useValue: options,
        },
        RedsysUtilsService,
        ...this.createProviders(configs as RedsysConfig[]),
        this.createMapProvider(configs as RedsysConfig[]),
      ],
      exports: [
        REDSYS_MODULE_OPTIONS,
        RedsysUtilsService,
        ...(configs as RedsysConfig[]).map(
          (config) => `${REDSYS_TOKEN_PREFIX}${config.configKey}`
        ),
        "REDSYS_SERVICE_MAP",
      ],
    };

    if (isGlobal) {
      (moduleDefinition as any).global = true;
    }

    return moduleDefinition;
  }

  static forRootAsync(
    options: RedsysModuleOptions & Pick<ModuleMetadata, "imports">
  ): DynamicModule {
    const { configs, isGlobal = false, imports = [] } = options;

    const configImports = (configs as RedsysAsyncConfig[]).flatMap(
      (config) => config.imports || []
    );

    const moduleDefinition: DynamicModule = {
      module: RedsysModule,
      imports: [...imports, ...configImports],
      providers: [
        {
          provide: REDSYS_MODULE_OPTIONS,
          useFactory: () => options,
        },
        RedsysUtilsService,
        ...this.createAsyncProviders(configs as RedsysAsyncConfig[]),
        this.createAsyncBankMapProvider(configs as RedsysAsyncConfig[]),
      ],
      exports: [
        REDSYS_MODULE_OPTIONS,
        RedsysUtilsService,
        ...(configs as RedsysAsyncConfig[]).map(
          (config) => `${REDSYS_TOKEN_PREFIX}${config.configKey}`
        ),
        "REDSYS_SERVICE_MAP",
      ],
    };

    if (isGlobal) {
      (moduleDefinition as any).global = true;
    }

    return moduleDefinition;
  }

  private static createProviders(configs: RedsysConfig[]): Provider[] {
    return configs.map((config) => ({
      provide: `${REDSYS_TOKEN_PREFIX}${config.configKey}`,
      useValue: new RedsysService(config),
    }));
  }

  private static createAsyncProviders(
    configs: RedsysAsyncConfig[]
  ): Provider[] {
    return configs.map((config) => ({
      provide: `${REDSYS_TOKEN_PREFIX}${config.configKey}`,
      useFactory: async (...args: any[]) => {
        const redsysConfig = await config.useFactory(...args);
        return new RedsysService({
          configKey: config.configKey,
          ...redsysConfig,
        });
      },
      inject: config.inject || [],
    }));
  }

  private static createMapProvider(configs: RedsysConfig[]): Provider {
    return {
      provide: "REDSYS_SERVICE_MAP",
      useFactory: (...redsysServices: RedsysService[]) => {
        const redsysMap: Record<string, RedsysService> = {};
        configs.forEach((config, index) => {
          redsysMap[config.configKey] = redsysServices[index];
        });
        return redsysMap;
      },
      inject: configs.map(
        (config) => `${REDSYS_TOKEN_PREFIX}${config.configKey}`
      ),
    };
  }

  private static createAsyncBankMapProvider(
    configs: RedsysAsyncConfig[]
  ): Provider {
    return {
      provide: "REDSYS_SERVICE_MAP",
      useFactory: (...redsysServices: RedsysService[]) => {
        const redsysMap: Record<string, RedsysService> = {};
        configs.forEach((config, index) => {
          redsysMap[config.configKey] = redsysServices[index];
        });
        return redsysMap;
      },
      inject: configs.map(
        (config) => `${REDSYS_TOKEN_PREFIX}${config.configKey}`
      ),
    };
  }
}
