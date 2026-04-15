import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import * as llmService from "../services/llmService.js";

const router = Router();
const prisma = new PrismaClient();

router.post("/llm/query", async (req, res) => {
  try {
    const { data, question, locale, tenantId } = req.body;
    if (!question) return res.status(400).json({ success: false, message: "Question is required" });
    const result = await llmService.analyze(data, question, locale, tenantId);
    res.json({ success: true, result });
  } catch (error) {
    console.error("LLM query error:", error);
    res.status(500).json({ success: false, message: "Query failed" });
  }
});

router.post("/llm/agent", async (req, res) => {
  try {
    const { data, question, locale, tenantId } = req.body;
    if (!question) return res.status(400).json({ success: false, message: "Question is required" });
    const result = await llmService.agent(data, question, locale, tenantId);
    res.json({ success: true, result });
  } catch (error) {
    console.error("LLM agent error:", error);
    res.status(500).json({ success: false, message: "Agent request failed" });
  }
});

router.post("/llm/insights", async (req, res) => {
  try {
    const { data, locale, tenantId } = req.body;
    const result = await llmService.generateInsights(data, locale, tenantId);
    res.json({ success: true, result });
  } catch (error) {
    console.error("LLM insights error:", error);
    res.status(500).json({ success: false, message: "Insights generation failed" });
  }
});

router.get("/llm/logs", async (req, res) => {
  try {
    const { tenantId } = req.query;
    const where = tenantId ? { tenantId } : {};
    const logs = await prisma.llmLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error("Get LLM logs error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch LLM logs" });
  }
});

router.get("/mcp/logs", async (req, res) => {
  try {
    const { tenantId } = req.query;
    const where = tenantId ? { tenantId } : {};
    const logs = await prisma.mcpLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error("Get MCP logs error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch MCP logs" });
  }
});

router.delete("/llm/logs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.llmLog.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete LLM log error:", error);
    res.status(500).json({ success: false, message: "Failed to delete LLM log" });
  }
});

router.delete("/mcp/logs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.mcpLog.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete MCP log error:", error);
    res.status(500).json({ success: false, message: "Failed to delete MCP log" });
  }
});

export default router;
