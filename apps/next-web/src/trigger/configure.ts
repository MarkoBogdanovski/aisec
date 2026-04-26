import { configure } from "@trigger.dev/sdk/v3";

let configured = false;

export function configureTrigger() {
  if (configured) {
    return;
  }

  const accessToken = process.env.TRIGGER_SECRET_KEY;
  if (!accessToken) {
    return;
  }

  configure({ accessToken });
  configured = true;
}
