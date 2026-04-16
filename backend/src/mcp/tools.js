import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── i18n Messages ────────────────────────────────────────────────

const msgs = {
  updateStoreStatus: {
    en: (name, status) => `Store "${name}" status updated to ${status}`,
    es: (name, status) => `Tienda "${name}" estado actualizado a ${status === "active" ? "activo" : "inactivo"}`,
    fail: { en: "Failed to update store status", es: "Error al actualizar estado de tienda" },
  },
  setSalesTarget: {
    en: (name, year, month, target) => `Store "${name}" ${year}-${String(month).padStart(2, "0")} sales target set to $${target}`,
    es: (name, year, month, target) => `Tienda "${name}" objetivo de ventas ${year}-${String(month).padStart(2, "0")} establecido en $${target}`,
    fail: { en: "Failed to set sales target", es: "Error al establecer objetivo de ventas" },
  },
  adjustPricing: {
    en: (name, price) => `"${name}" price updated to $${price}`,
    es: (name, price) => `"${name}" precio actualizado a $${price}`,
    fail: { en: "Failed to adjust pricing", es: "Error al ajustar precio" },
  },
  transferInventory: {
    en: (productName, qty, from, to) => `Transferred ${qty} units of "${productName}" from "${from}" to "${to}"`,
    es: (productName, qty, from, to) => `Transferidas ${qty} unidades de "${productName}" de "${from}" a "${to}"`,
    fail: { en: "Failed to transfer inventory", es: "Error al transferir inventario" },
  },
  restockProduct: {
    en: (productName, storeName, qty, total) => `Restocked "${productName}" at "${storeName}" with ${qty} units, new total: ${total}`,
    es: (productName, storeName, qty, total) => `Reabastecido "${productName}" en "${storeName}" con ${qty} unidades, total actual: ${total}`,
    fail: { en: "Failed to restock", es: "Error al reabastecer" },
  },
};

function t(locale) {
  return locale === "es" ? "es" : "en";
}

// ─── MCP Log ──────────────────────────────────────────────────────

async function logMcp(tool, params, result, storeId, tenantId) {
  try {
    await prisma.mcpLog.create({
      data: {
        tool,
        params: JSON.stringify(params),
        result: JSON.stringify(result),
        storeId: storeId || null,
        tenantId: tenantId || null,
      },
    });
  } catch (e) {
    console.error("MCP log error:", e);
  }
}

// ─── Tool Functions ───────────────────────────────────────────────
// All name params come from context data (resolved in executeTool), no extra DB queries.

export async function updateStoreStatus(storeId, status, tenantId, locale = "en", storeName) {
  const params = { storeId, status };
  const lang = t(locale);
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.store.update({ where: { id: storeId }, data: { status } });
      return { success: true, message: msgs.updateStoreStatus[lang](storeName || storeId, status) };
    });
    await logMcp("updateStoreStatus", params, result, storeId, tenantId);
    return result;
  } catch (error) {
    console.error("updateStoreStatus error:", error);
    const result = { success: false, message: `${msgs.updateStoreStatus.fail[lang]}: ${error.message}` };
    await logMcp("updateStoreStatus", params, result, storeId, tenantId);
    return result;
  }
}

export async function setSalesTarget(storeId, target, tenantId, locale = "en", storeName) {
  const params = { storeId, target };
  const lang = t(locale);
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const result = await prisma.$transaction(async (tx) => {
      const store = await tx.store.findUnique({ where: { id: storeId } });
      if (!store) return { success: false, message: `Store ${storeId} not found` };
      await tx.salesTarget.upsert({
        where: { storeId_year_month: { storeId, year, month } },
        update: { target: Number(target) },
        create: { storeId, year, month, target: Number(target) },
      });
      return { success: true, message: msgs.setSalesTarget[lang](storeName || store.name, year, month, Number(target).toLocaleString()) };
    });
    await logMcp("setSalesTarget", params, result, storeId, tenantId);
    return result;
  } catch (error) {
    console.error("setSalesTarget error:", error);
    const result = { success: false, message: `${msgs.setSalesTarget.fail[lang]}: ${error.message}` };
    await logMcp("setSalesTarget", params, result, storeId, tenantId);
    return result;
  }
}

export async function adjustPricing(productId, newPrice, tenantId, locale = "en", productName) {
  const params = { productId, newPrice };
  const lang = t(locale);
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: productId }, data: { price: Number(newPrice) } });
      return { success: true, message: msgs.adjustPricing[lang](productName || productId, Number(newPrice).toLocaleString()) };
    });
    await logMcp("adjustPricing", params, result, null, tenantId);
    return result;
  } catch (error) {
    console.error("adjustPricing error:", error);
    const result = { success: false, message: `${msgs.adjustPricing.fail[lang]}: ${error.message}` };
    await logMcp("adjustPricing", params, result, null, tenantId);
    return result;
  }
}

export async function transferInventory(productId, fromStoreId, toStoreId, quantity, tenantId, locale = "en", productName, fromStoreName, toStoreName) {
  const params = { productId, fromStoreId, toStoreId, quantity };
  const lang = t(locale);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const from = await tx.inventory.findUnique({ where: { storeId_productId: { storeId: fromStoreId, productId } } });
      if (!from || from.quantity < quantity) {
        return { success: false, message: `Insufficient stock: ${from?.quantity || 0} available, ${quantity} requested` };
      }
      await tx.inventory.update({ where: { id: from.id }, data: { quantity: { decrement: quantity } } });
      await tx.inventory.upsert({
        where: { storeId_productId: { storeId: toStoreId, productId } },
        update: { quantity: { increment: quantity } },
        create: { storeId: toStoreId, productId, quantity, reorderLevel: 20 },
      });
      return { success: true, message: msgs.transferInventory[lang](productName || productId, quantity, fromStoreName || fromStoreId, toStoreName || toStoreId) };
    });
    await logMcp("transferInventory", params, result, fromStoreId, tenantId);
    return result;
  } catch (error) {
    console.error("transferInventory error:", error);
    const result = { success: false, message: `${msgs.transferInventory.fail[lang]}: ${error.message}` };
    await logMcp("transferInventory", params, result, fromStoreId, tenantId);
    return result;
  }
}

export async function restockProduct(productId, storeId, quantity, tenantId, locale = "en", productName, storeName) {
  const params = { productId, storeId, quantity };
  const lang = t(locale);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.update({
        where: { storeId_productId: { storeId, productId } },
        data: { quantity: { increment: quantity }, lastRestocked: new Date() },
      });
      return { success: true, message: msgs.restockProduct[lang](productName || productId, storeName || storeId, quantity, inv.quantity) };
    });
    await logMcp("restockProduct", params, result, storeId, tenantId);
    return result;
  } catch (error) {
    console.error("restockProduct error:", error);
    const result = { success: false, message: `${msgs.restockProduct.fail[lang]}: ${error.message}` };
    await logMcp("restockProduct", params, result, storeId, tenantId);
    return result;
  }
}
