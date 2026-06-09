// Prevent the module from starting its HTTP server during tests.
Deno.env.set("SKIP_SERVE", "1");

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler } from "./index.ts";

function setBaseEnv(environment: string) {
  Deno.env.set("ENVIRONMENT", environment);
  Deno.env.set("SUPABASE_URL", "http://localhost");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-stub");
  Deno.env.set("E2E_SEED_SECRET", "seed-secret");
}

Deno.test("handler: blocks unknown runtime environments", async () => {
  setBaseEnv("production");

  const res = await handler(new Request("http://localhost/functions/v1/e2e-seed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-e2e-secret": "seed-secret",
    },
    body: JSON.stringify({ op: "seed", plan: "starter", fill: "boards" }),
  }));

  assertEquals(res.status, 503);
  assertEquals(await res.json(), {
    error: "e2e_disabled",
    message: "e2e-seed is only available in test environments",
  });
});

Deno.test("handler: allows development runtime through the environment gate", async () => {
  setBaseEnv("development");

  const res = await handler(new Request("http://localhost/functions/v1/e2e-seed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-e2e-secret": "wrong-secret",
    },
    body: JSON.stringify({ op: "seed", plan: "starter", fill: "boards" }),
  }));

  assertEquals(res.status, 401);
  assertEquals(await res.json(), { error: "unauthorized" });
});