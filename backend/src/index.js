import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import authRouter from "./routes/auth.js";
import storeRouter from "./routes/store.js";
import llmRouter from "./routes/llm.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api", authRouter);
app.use("/api", storeRouter);
app.use("/api", llmRouter);

app.get("/api/config", (req, res) => {
  res.json({
    success: true,
    data: {
      llmApiUrl: process.env.LLM_API_URL || "",
      modelName: process.env.MODEL_NAME || "",
      hasApiKey: !!process.env.LLM_API_KEY,
    },
  });
});

app.put("/api/config", (req, res) => {
  try {
    const { llmApiUrl, modelName, apiKey } = req.body;
    const envPath = path.resolve("prisma", "..", ".env");
    let envContent = fs.readFileSync(envPath, "utf-8");

    if (llmApiUrl !== undefined) {
      envContent = envContent.replace(/LLM_API_URL=.*/g, `LLM_API_URL=${llmApiUrl}`);
      process.env.LLM_API_URL = llmApiUrl;
    }
    if (modelName !== undefined) {
      envContent = envContent.replace(/MODEL_NAME=.*/g, `MODEL_NAME=${modelName}`);
      process.env.MODEL_NAME = modelName;
    }
    if (apiKey !== undefined) {
      envContent = envContent.replace(/LLM_API_KEY=.*/g, `LLM_API_KEY=${apiKey}`);
      process.env.LLM_API_KEY = apiKey;
    }

    fs.writeFileSync(envPath, envContent);
    res.json({ success: true });
  } catch (error) {
    console.error("Update config error:", error);
    res.status(500).json({ success: false, message: "Failed to update config" });
  }
});

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

app.get("/api/tenants", async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: { select: { users: true, stores: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: tenants });
  } catch (error) {
    console.error("Get tenants error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch tenants" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
