import { generateHelpers } from "skybridge/web";
import type { AppType } from "../../server/src/index.js";

export const { useToolInfo } = generateHelpers<AppType>();
export {
  useSendFollowUpMessage,
  useWidgetState,
  useLayout,
  DataLLM,
} from "skybridge/web";
