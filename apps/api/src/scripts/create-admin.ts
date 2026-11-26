
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../services/password.service.js";

function ask(question: string): Promise<string> {
  const readline = createInterface({
    input: stdin,
    output: stdout,
  });

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
      new Error("A real interactive terminal is required."),
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

      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
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

        if (character === "\u0015") {
          stdout.write("\b \b".repeat(value.length));
          value = "";
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
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (existingAdmin) {
    throw new Error(
      "An Admin account already exists. Bootstrap creation is disabled.",
    );
  }

  const email = (await ask("Admin email: ")).toLowerCase();

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("A valid email address is required.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("This email address is already registered.");
  }

  const password = await askHidden("Admin password (input hidden): ");

  if (password.length < 14 || password.length > 1024) {
    throw new Error(
      "Password must contain at least 14 characters and no more than 1024.",
    );
  }

  const confirmation = await askHidden("Confirm password: ");

  if (password !== confirmation) {
    throw new Error("Passwords do not match.");
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  console.log("\nAdmin account created successfully.");
  console.log(`ID: ${admin.id}`);
  console.log(`Email: ${admin.email}`);
  console.log(`Role: ${admin.role}`);
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Admin creation failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
