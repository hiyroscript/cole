import { writeFileSync } from "node:fs";
import { workflows } from "../src/core/gamma/workflows";
writeFileSync(
  "src/core/gamma/workflow-nodes.json",
  JSON.stringify(
    Object.fromEntries(workflows.map((f) => [f.id, f.nodes.map((n) => n.id)])),
  ) + "\n",
);
