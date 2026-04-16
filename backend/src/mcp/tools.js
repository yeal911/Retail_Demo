import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

export async function updateStoreStatus(storeId, status, tenantId) {
  const params = { storeId, status };
  try {
    const result = await prisma.$transaction(async (tx) => {
      const store = await tx.store.update({ where: { id: storeId }, data: { status } });
      return { success: true, message: `Store "${store.name}" status updated to ${status}` };
    });
    await logMcp("updateStoreStatus", params, result, storeId, tenantId);
    return result;
  } catch (error) {
    console.error("updateStoreStatus error:", error);
    const result = { success: false, message: `Failed to update store status: ${error.message}` };
    await logMcp("updateStoreStatus", params, result, storeId, tenantId);
    return result;
  }
}

export async function setSalesTarget(storeId, target, tenantId) {
  const params = { storeId, target };
  try {
    const result = await prisma.$transaction(async (tx) => {
      const store = await tx.store.findUnique({ where: { id: storeId } });
      if (!store) return { success: false, message: `Store ${storeId} not found` };
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      await tx.salesTarget.upsert({
        where: { storeId_year_month: { storeId, year, month } },
        update: { target: Number(target) },
        create: { storeId, year, month, target: Number(target) },
      });
      return { success: true, message: `Store "${store.name}" ${year}-${String(month).padStart(2, "0")} sales target set to $${Number(target).toLocaleString()}` };
    });
    await logMcp("setSalesTarget", params, result, storeId, tenantId);
    return result;
  } catch (error) {
    console.error("setSalesTarget error:", error);
    const result = { success: false, message: `Failed to set sales target: ${error.message}` };
    await logMcp("setSalesTarget", params, result, storeId, tenantId);
    return result;
  }
}

export async function adjustPricing(productId, newPrice, tenantId) {
  const params = { productId, newPrice };
  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({ where: { id: productId }, data: { price: Number(newPrice) } });
      return { success: true, message: `"${product.name}" price updated to $${Number(newPrice).toLocaleString()}` };
    });
    await logMcp("adjustPricing", params, result, null, tenantId);
    return result;
  } catch (error) {
    console.error("adjustPricing error:", error);
    const result = { success: false, message: `Failed to adjust pricing: ${error.message}` };
    await logMcp("adjustPricing", params, result, null, tenantId);
    return result;
  }
}

export async function transferInventory(productId, fromStoreId, toStoreId, quantity, tenantId) {
  const params = { productId, fromStoreId, toStoreId, quantity };
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
      return { success: true, message: `Transferred ${quantity} units from store ${fromStoreId} to ${toStoreId}` };
    });
    await logMcp("transferInventory", params, result, fromStoreId, tenantId);
    return result;
  } catch (error) {
    console.error("transferInventory error:", error);
    const result = { success: false, message: `Failed to transfer inventory: ${error.message}` };
    await logMcp("transferInventory", params, result, fromStoreId, tenantId);
    return result;
  }
}

export async function restockProduct(productId, storeId, quantity, tenantId) {
  const params = { productId, storeId, quantity };
  try {
    const result = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.update({
        where: { storeId_productId: { storeId, productId } },
        data: { quantity: { increment: quantity }, lastRestocked: new Date() },
      });
      return { success: true, message: `Restocked ${quantity} units, new total: ${inv.quantity}` };
    });
    await logMcp("restockProduct", params, result, storeId, tenantId);
    return result;
  } catch (error) {
    console.error("restockProduct error:", error);
    const result = { success: false, message: `Failed to restock: ${error.message}` };
    await logMcp("restockProduct", params, result, storeId, tenantId);
    return result;
  }
}
