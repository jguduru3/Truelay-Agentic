import { PRODUCT_NAME } from "@/lib/brand";
export function runCancellationLabel(input: { grokWork?: boolean; isFailed: boolean; isPending: boolean }): string {
  if (input.grokWork) return input.isPending ? `Stopping ${PRODUCT_NAME} work…` : `Stop ${PRODUCT_NAME} work`;
  if (input.isFailed) return input.isPending ? "Stopping…" : "Stop";
  return input.isPending ? "Cancelling…" : "Cancel";
}
