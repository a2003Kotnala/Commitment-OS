export const integrationProviders = [
    "slack",
    "zoom",
    "gmail",
    "google_calendar",
  ] as const;
  
  export type IntegrationProvider = (typeof integrationProviders)[number];
  
  export function isIntegrationProvider(value: string): value is IntegrationProvider {
    return integrationProviders.includes(value as IntegrationProvider);
  }
  
  export const providerLabels: Record<IntegrationProvider, string> = {
    slack: "Slack",
    zoom: "Zoom",
    gmail: "Gmail",
    google_calendar: "Google Calendar",
  };