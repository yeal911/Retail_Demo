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
    const store = await prisma.store.update({ where: { id: storeId }, data: { status } });
    const result = { success: true, message: `Store "${store.name}" status updated to ${status}` };
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
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      const result = { success: false, message: `Store ${storeId} not found` };
      await logMcp("setSalesTarget", params, result, storeId, tenantId);
      return result;
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    await prisma.salesTarget.upsert({
      where: { storeId_year_month: { storeId, year, month } },
      update: { target: Number(target) },
      create: { storeId, year, month, target: Number(target) },
    });
    const result = { success: true, message: `Store "${store.name}" ${year}年${month}月销售目标 set to $${Number(target).toLocaleString()}` };
    await logMcp("setSalesTarget", params, result, storeId, tenantId);
    return result;
  } catch (error) {
    console.error("setSalesTarget error:", error);
    const result = { success: false, message: `Failed to set sales target: ${error.message}` };
    await logMcp("setSalesTarget", params, result, storeId, tenantId);
    return result;
  }
}

export async function sendNotification(storeId, message, tenantId) {
  const params = { storeId, message };
  try {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      const result = { success: false, message: `Store ${storeId} not found` };
      await logMcp("sendNotification", params, result, storeId, tenantId);
      return result;
    }
    console.log(`📢 Notification → Store "${store.name}" (${storeId}): ${message}`);
    const result = { success: true, message: `Notification sent to store "${store.name}": ${message}` };
    await logMcp("sendNotification", params, result, storeId, tenantId);
    return result;
  } catch (error) {
    console.error("sendNotification error:", error);
    const result = { success: false, message: `Failed to send notification: ${error.message}` };
    await logMcp("sendNotification", params, result, storeId, tenantId);
    return result;
  }
}

export async function adjustPricing(productId, newPrice, tenantId) {
  const params = { productId, newPrice };
  try {
    const product = await prisma.product.update({ where: { id: productId }, data: { price: Number(newPrice) } });
    const result = { success: true, message: `"${product.name}" price updated to $${Number(newPrice).toLocaleString()}` };
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
    const from = await prisma.inventory.findUnique({ where: { storeId_productId: { storeId: fromStoreId, productId } } });
    if (!from || from.quantity < quantity) {
      const result = { success: false, message: `Insufficient stock: ${from?.quantity || 0} available, ${quantity} requested` };
      await logMcp("transferInventory", params, result, fromStoreId, tenantId);
      return result;
    }
    await prisma.inventory.update({ where: { id: from.id }, data: { quantity: { decrement: quantity } } });
    await prisma.inventory.upsert({
      where: { storeId_productId: { storeId: toStoreId, productId } },
      update: { quantity: { increment: quantity } },
      create: { storeId: toStoreId, productId, quantity, reorderLevel: 20 },
    });
    const result = { success: true, message: `Transferred ${quantity} units from store ${fromStoreId} to ${toStoreId}` };
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
    const inv = await prisma.inventory.update({
      where: { storeId_productId: { storeId, productId } },
      data: { quantity: { increment: quantity }, lastRestocked: new Date() },
    });
    const result = { success: true, message: `Restocked ${quantity} units, new total: ${inv.quantity}` };
    await logMcp("restockProduct", params, result, storeId, tenantId);
    return result;
  } catch (error) {
    console.error("restockProduct error:", error);
    const result = { success: false, message: `Failed to restock: ${error.message}` };
    await logMcp("restockProduct", params, result, storeId, tenantId);
    return result;
  }
}
