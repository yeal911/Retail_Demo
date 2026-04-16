import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/stores", async (req, res) => {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "请提供tenantId" });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const stores = await prisma.store.findMany({
      where: { tenantId },
      include: { 
        sales: { orderBy: { date: "asc" } },
        targets: { where: { year, month } },
      },
      orderBy: { name: "asc" },
    });

    // Attach current month target to each store
    const data = stores.map(store => ({
      ...store,
      currentTarget: store.targets[0]?.target || null,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("Get stores error:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

router.patch("/stores/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "Status is required" });
    const store = await prisma.store.update({ where: { id }, data: { status } });
    res.json({ success: true, data: store });
  } catch (error) {
    console.error("Update store status error:", error);
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
});

router.post("/stores/:id/target", async (req, res) => {
  try {
    const { id } = req.params;
    const { target } = req.body;
    if (target == null) return res.status(400).json({ success: false, message: "Target is required" });
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const record = await prisma.salesTarget.upsert({
      where: { storeId_year_month: { storeId: id, year, month } },
      update: { target: Number(target) },
      create: { storeId: id, year, month, target: Number(target) },
    });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error("Set sales target error:", error);
    res.status(500).json({ success: false, message: "Failed to set target" });
  }
});

// ── Products & Categories ──
router.get("/products", async (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ success: false, message: "tenantId required" });
    const data = await prisma.product.findMany({
      where: { tenantId },
      include: { category: true },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ success: false, message: "tenantId required" });
    const data = await prisma.category.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch categories" });
  }
});

// ── Orders ──
router.get("/orders", async (req, res) => {
  try {
    const { tenantId, storeId, productId, startDate, endDate, sortBy = "date", sortOrder = "desc", page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (storeId) where.storeId = storeId;
    else if (tenantId) where.store = { tenantId };
    if (productId) where.items = { some: { productId } };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    const allowedSortFields = { date: "date", total: "total", paymentMethod: "paymentMethod" };
    const orderField = allowedSortFields[sortBy] || "date";
    const orderDir = sortOrder === "asc" ? "asc" : "desc";
    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: { include: { product: true } }, store: { select: { name: true } } },
        orderBy: { [orderField]: orderDir },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ success: true, data, total });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

// ── Inventory ──
router.get("/inventory", async (req, res) => {
  try {
    const { tenantId, storeId } = req.query;
    const where = {};
    if (storeId) where.storeId = storeId;
    else if (tenantId) where.store = { tenantId };
    const data = await prisma.inventory.findMany({
      where,
      include: { product: true, store: { select: { name: true } } },
      orderBy: { product: { name: "asc" } },
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch inventory" });
  }
});

export default router;
