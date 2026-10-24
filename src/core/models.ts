import { respond } from "./engine";
export const models = [
  {
    id: "zulvyn",
    name: "Zulvyn",
    description: "Local browser and device intelligence.",
    status: "available",
    engine: respond,
    capabilities: ["knowledge", "diagnostics", "commands", "context"],
  },
  {
    id: "madon",
    name: "Madon",
    description: "Advanced intelligence. Coming soon.",
    status: "coming-soon",
    engine: null,
    capabilities: [],
  },
] as const;
export function activeModel() {
  return models[0];
}
