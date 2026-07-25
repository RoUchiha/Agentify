import { buildAgent } from "@/connectors/harness-builder";
import { createBuildRoute } from "@/server/routes/build";

export const POST = createBuildRoute({
  build: (input) =>
    buildAgent(input, {
      baseUrl: process.env.HARNESS_BUILDER_URL ?? "http://127.0.0.1:3001",
      serviceToken: process.env.HARNESS_BUILDER_SERVICE_TOKEN,
    }),
});
