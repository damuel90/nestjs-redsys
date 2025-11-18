import { Inject } from "@nestjs/common";
import { REDSYS_TOKEN_PREFIX } from "./constants/redsys.constants";

export function InjectRedsysService(configKey: string) {
  return Inject(`${REDSYS_TOKEN_PREFIX}${configKey}`);
}
