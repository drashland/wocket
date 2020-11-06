import { BumperService } from "https://raw.githubusercontent.com/drashland/services/master/ci/bumper_service.ts";
import {
  denoVersionFiles,
  moduleVersionFiles,
} from "./bumper_ci_service_files.ts";

const b = new BumperService("sockets", Deno.args);

if (b.isForPreRelease()) {
  b.bump(moduleVersionFiles);
} else {
  b.bump(denoVersionFiles);
}
