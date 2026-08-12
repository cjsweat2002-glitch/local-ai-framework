import { describe, expect, it } from "vitest";

describe("MANUS_API_KEY", () => {
  it("authenticates against the Manus task list endpoint", async () => {
    const apiKey = process.env.MANUS_API_KEY;
    expect(apiKey, "MANUS_API_KEY must be configured for this test").toBeTruthy();

    const response = await fetch(
      "https://api.manus.ai/v2/task.listMessages?task_id=agent-default-main_task",
      {
        method: "GET",
        headers: {
          "x-manus-api-key": apiKey as string,
        },
      },
    );

    const body = (await response.json()) as {
      ok?: boolean;
      error?: { code?: string; message?: string };
    };

    expect(
      response.status,
      body.error?.message ?? "Manus API credential validation failed",
    ).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(body.ok).toBe(true);
  }, 30_000);
});
