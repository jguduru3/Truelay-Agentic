import type { Meta, StoryObj } from "@storybook/react-vite";
import { ManagedOAuthHandoffState } from "@/pages/apps/PaperclipCloudOAuthHandoff";
import { PRODUCT_NAME } from "@/lib/brand";

const meta: Meta<typeof ManagedOAuthHandoffState> = {
  id: "apps-managed-cloud-oauth-handoff",
  title: "Apps, channels, and extensions/Connection setup/Apps/Managed Cloud OAuth handoff",
  component: ManagedOAuthHandoffState,
  parameters: { layout: "fullscreen",
    paperclip: {
      "capabilities": [
        "connection-setup/handoff"
      ],
      "implementation": "production",
      "boundary": "fixtures"
    },
  },
  args: {
    onRetry: () => undefined,
    onCancel: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof ManagedOAuthHandoffState>;

export const PreparingProvider: Story = {
  args: { phase: "loading" },
};

export const ResumingAfterReauthentication: Story = {
  args: { phase: "reauthenticating" },
};

export const RetryAfterInfrastructureFailure: Story = {
  args: {
    phase: "error",
    error: `${PRODUCT_NAME} Cloud couldn’t prepare secure sign-in. Try again.`,
  },
};

export const TerminalExpiredSession: Story = {
  args: {
    phase: "error",
    error: `This sign-in expired. Return to ${PRODUCT_NAME} and start the connection again.`,
  },
};
