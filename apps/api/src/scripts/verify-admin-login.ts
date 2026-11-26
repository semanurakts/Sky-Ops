
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { once } from "node:events";
import type { AddressInfo } from "node:net";

import app from "../app.js";
import { prisma } from "../lib/prisma.js";

function ask(question: string): Promise<string> {
  const readline = createInterface({ input: stdin, output: stdout });

  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

function askHidden(question: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    return Promise.reject(
      new Error("An interactive terminal is required."),
    );
  }

  const setRawMode = stdin.setRawMode.bind(stdin);
  stdout.write(question);

  return new Promise((resolve, reject) => {
    let value = "";

    const finish = (error?: Error) => {
      stdin.off("data", onData);
      setRawMode(false);
      stdin.pause();
      stdout.write("\n");

      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          finish(new Error("Operation cancelled."));
          return;
        }

        if (character === "\r" || character === "\n") {
          finish();
          return;
        }

        if (character === "\u007f" || character === "\b") {
          value = Array.from(value).slice(0, -1).join("");
          stdout.write("\b \b");
          continue;
        }

        if (character >= " " && character !== "\u001b") {
          value += character;
          stdout.write("*");
        }
      }
    };

    setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  let server: ReturnType<typeof app.listen> | undefined;

  try {
    const email = (await ask("Admin email: ")).toLowerCase();
    const password = await askHidden("Admin password (input hidden): ");

    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");

    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Could not determine test server address.");
    }

    const baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ email, password }),
    });

    if (loginResponse.status !== 200) {
      throw new Error(`Admin login failed: HTTP ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json() as {
      user?: { role?: string };
    };

    if (loginData.user?.role !== "ADMIN") {
      throw new Error("The authenticated account is not an Admin.");
    }

    console.log("Admin login: PASS");

    const setCookie = loginResponse.headers.get("set-cookie");

    if (!setCookie) {
      throw new Error("Login response did not contain a session cookie.");
    }

    const cookiePair = setCookie.split(";")[0];

    const meResponse = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: cookiePair },
    });

    const meData = await meResponse.json() as {
      user?: { role?: string };
    };

    if (meResponse.status !== 200 || meData.user?.role !== "ADMIN") {
      throw new Error("Admin session verification failed.");
    }

    console.log("GET /auth/me: PASS (ADMIN)");

    const logoutResponse = await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      headers: {
        Origin: "http://localhost:5173",
        Cookie: cookiePair,
      },
    });

    if (logoutResponse.status !== 204) {
      throw new Error(`Logout failed: HTTP ${logoutResponse.status}`);
    }

    console.log("Admin logout: PASS");

    const finalResponse = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: cookiePair },
    });

    if (finalResponse.status !== 401) {
      throw new Error("The revoked session is still accepted.");
    }

    console.log("Post-logout session invalidation: PASS");
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Admin verification failed.",
  );
  process.exitCode = 1;
});
