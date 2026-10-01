import { toast as notify } from "sonner";

export const toast = (options) => typeof options === "string" ? notify(options) : notify(options?.title || options?.description || "");
export const useToast = () => ({ toast, dismiss: () => {} });
