import app from "./app.js";

const PORT = Number(process.env.PORT ?? 4000);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("Invalid PORT configuration.");
}

const server = app.listen(PORT, () => {
  console.log(`SkyOps API running at http://localhost:${PORT}`);
});

server.on("error", (error) => {
  console.error("Failed to start SkyOps API:", error);
  process.exitCode = 1;
});