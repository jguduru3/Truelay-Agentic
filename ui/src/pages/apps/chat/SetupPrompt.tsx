import { PRODUCT_NAME } from "@/lib/brand";
export { AgentSetupPrompt as SetupPrompt } from "@/components/AgentSetupPrompt";

export function buildSetupPrompt(instanceUrl: string, instructions: string) {
  let instanceOrigin: string | null = null;
  try {
    const url = new URL(instanceUrl);
    if (url.protocol === "http:" || url.protocol === "https:") instanceOrigin = url.origin;
  } catch {
    // A preview can have no configured instance. Do not substitute its own URL.
  }
  const context = instanceOrigin
    ? `${PRODUCT_NAME} instance URL: ${instanceOrigin}\nUse this instance for setup. Do not ask me for its URL again unless it is unavailable or I ask to use a different instance.`
    : `${PRODUCT_NAME} instance URL is unavailable. Ask me for it before starting setup.`;
  return `${context}\n\n${instructions}`;
}
