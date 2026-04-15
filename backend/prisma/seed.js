import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 开始生成测试数据...");

  // 清空现有数据
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.salesTarget.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // Create admin user
  await prisma.user.create({ data: { username: "admin", password: "admin", role: "admin" } });
  console.log("👤 admin / admin");

  const tenantNames = ["Huawei MX", "Telcel", "Bimbo"];
  const cities = {
    "Huawei MX": ["CDMX", "Guadalajara", "Monterrey", "Puebla", "Tijuana", "León", "Mérida", "Querétaro", "Cancún", "Aguascalientes", "Chihuahua", "Hermosillo", "Veracruz", "Toluca", "Morelia"],
    "Telcel": ["CDMX", "Ecatepec", "Nezahualcóyotl", "Naucalpan", "Tlalnepantla", "Coyoacán", "Azcapotzalco", "Iztapalapa", "Benito Juárez", "Cuauhtémoc", "Miguel Hidalgo", "Álvaro Obregón", "Tláhuac", "Xochimilco", "Magdalena Contreras"],
    "Bimbo": ["Monterrey", "San Pedro Garza", "Santa Catarina", "Guadalupe", "Apodaca", "Escobedo", "García", "Juárez", "Saltillo", "Ramos Arizpe", "Torreón", "Gómez Palacio", "Durango", "Chihuahua", "Reynosa"],
  };
  const managerNames = ["Carlos García", "María López", "Juan Martínez", "Ana Rodríguez", "Roberto Hernández", "Laura González", "Miguel Pérez", "Patricia Sánchez", "Fernando Ramírez", "Rosa Torres", "Diego Flores", "Verónica Rivera", "Jorge Morales", "Cristina Jiménez", "Antonio Díaz"];

  const tenantProducts = {
    "Huawei MX": {
      categories: ["Smartphones", "Tablets", "Wearables", "Accessories", "Audio"],
      products: [
        { name: "Mate 60 Pro", sku: "HW-SM-001", price: 19999, cost: 12000, cat: "Smartphones" },
        { name: "P60 Lite", sku: "HW-SM-002", price: 8999, cost: 5000, cat: "Smartphones" },
        { name: "Nova 12", sku: "HW-SM-003", price: 5999, cost: 3200, cat: "Smartphones" },
        { name: "MatePad Pro", sku: "HW-TB-001", price: 12999, cost: 7500, cat: "Tablets" },
        { name: "MatePad SE", sku: "HW-TB-002", price: 4999, cost: 2800, cat: "Tablets" },
        { name: "Watch GT 4", sku: "HW-WR-001", price: 3499, cost: 1800, cat: "Wearables" },
        { name: "Band 8", sku: "HW-WR-002", price: 999, cost: 450, cat: "Wearables" },
        { name: "FreeBuds Pro", sku: "HW-AU-001", price: 2499, cost: 1200, cat: "Audio" },
        { name: "65W Charger", sku: "HW-AC-001", price: 599, cost: 200, cat: "Accessories" },
        { name: "Phone Case", sku: "HW-AC-002", price: 299, cost: 80, cat: "Accessories" },
      ],
    },
    "Telcel": {
      categories: ["Smartphones", "Plans", "Accessories", "Tablets", "Audio"],
      products: [
        { name: "iPhone 15", sku: "TC-SM-001", price: 25999, cost: 17000, cat: "Smartphones" },
        { name: "Samsung S24", sku: "TC-SM-002", price: 21999, cost: 14000, cat: "Smartphones" },
        { name: "Motorola Edge", sku: "TC-SM-003", price: 9999, cost: 5500, cat: "Smartphones" },
        { name: "Plan 5G Premium", sku: "TC-PL-001", price: 899, cost: 200, cat: "Plans" },
        { name: "Plan 5G Basic", sku: "TC-PL-002", price: 499, cost: 120, cat: "Plans" },
        { name: "iPad Mini", sku: "TC-TB-001", price: 15999, cost: 10000, cat: "Tablets" },
        { name: "AirPods Pro", sku: "TC-AU-001", price: 4999, cost: 2800, cat: "Audio" },
        { name: "Screen Protector", sku: "TC-AC-001", price: 199, cost: 40, cat: "Accessories" },
        { name: "Car Mount", sku: "TC-AC-002", price: 399, cost: 100, cat: "Accessories" },
        { name: "Power Bank", sku: "TC-AC-003", price: 699, cost: 250, cat: "Accessories" },
      ],
    },
    "Bimbo": {
      categories: ["Bread", "Snacks", "Dairy", "Beverages", "Packaged"],
      products: [
        { name: "Pan Blanco Bimbo", sku: "BM-BR-001", price: 59, cost: 28, cat: "Bread" },
        { name: "Pan Integral", sku: "BM-BR-002", price: 69, cost: 35, cat: "Bread" },
        { name: "Tortillas", sku: "BM-BR-003", price: 39, cost: 18, cat: "Bread" },
        { name: "Gansito", sku: "BM-SN-001", price: 15, cost: 6, cat: "Snacks" },
        { name: "Chocoramo", sku: "BM-SN-002", price: 18, cost: 7, cat: "Snacks" },
        { name: "Barritas", sku: "BM-SN-003", price: 12, cost: 4, cat: "Snacks" },
        { name: "Leche Lala 1L", sku: "BM-DA-001", price: 29, cost: 16, cat: "Dairy" },
        { name: "Yogurt Danone", sku: "BM-DA-002", price: 19, cost: 9, cat: "Dairy" },
        { name: "Jugo del Valle 1L", sku: "BM-BV-001", price: 35, cost: 17, cat: "Beverages" },
        { name: "Agua Purificada", sku: "BM-BV-002", price: 10, cost: 3, cat: "Beverages" },
      ],
    },
  };

  // ── Phase 1: 创建租户/用户/分类/商品/门店（少量，逐条即可）──
  const tenantIds = [];
  const catIds = {};   // tenantIdx -> { catName -> id }
  const prodIds = {};  // tenantIdx -> { sku -> id }
  const storeIds = {}; // tenantIdx -> [storeId...]

  for (let t = 0; t < tenantNames.length; t++) {
    const tenant = await prisma.tenant.create({ data: { name: tenantNames[t] } });
    tenantIds.push(tenant.id);
    await prisma.user.create({ data: { username: `user${t + 1}`, password: `pass${t + 1}`, tenantId: tenant.id } });

    const tp = tenantProducts[tenantNames[t]];
    catIds[t] = {};
    prodIds[t] = {};
    storeIds[t] = [];

    for (const catName of tp.categories) {
      const cat = await prisma.category.create({ data: { name: catName, tenantId: tenant.id } });
      catIds[t][catName] = cat.id;
    }
    for (const p of tp.products) {
      const product = await prisma.product.create({ data: { name: p.name, sku: p.sku, price: p.price, cost: p.cost, categoryId: catIds[t][p.cat], tenantId: tenant.id } });
      prodIds[t][p.sku] = product.id;
    }

    const tenantCities = cities[tenantNames[t]];
    for (let s = 0; s < 15; s++) {
      const store = await prisma.store.create({
        data: { name: `${tenantCities[s]} Store`, city: tenantCities[s], manager: managerNames[s], status: s < 12 ? "active" : "inactive", tenantId: tenant.id },
      });
      storeIds[t].push(store.id);
    }
    console.log(`✅ ${tenantNames[t]}: user${t + 1}/pass${t + 1}, ${tp.categories.length} cats, ${tp.products.length} products, 15 stores`);
  }

  // ── Phase 2: 内存构建所有批量数据 ──
  console.log("⚡ 构建批量数据...");
  const salesData = [];
  const inventoryData = [];
  const ordersData = [];
  const orderItemsData = [];
  const paymentMethods = ["cash", "card", "transfer"];
  const now = new Date();

  for (let t = 0; t < tenantNames.length; t++) {
    const tp = tenantProducts[tenantNames[t]];
    const products = tp.products;

    for (let s = 0; s < 15; s++) {
      const storeId = storeIds[t][s];

      // 库存
      for (const p of products) {
        inventoryData.push({
          storeId,
          productId: prodIds[t][p.sku],
          quantity: 30 + Math.floor(Math.random() * 120),
          reorderLevel: 20,
        });
      }

      // 30天销售 + 订单
      const baseRevenue = 3000 + Math.random() * 7000;
      const baseOrders = 40 + Math.floor(Math.random() * 80);

      for (let d = 29; d >= 0; d--) {
        const date = new Date(now);
        date.setDate(date.getDate() - d);
        date.setHours(0, 0, 0, 0);

        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const weekdayFactor = isWeekend ? 1.2 : 1.0;
        const randomFactor = 0.85 + Math.random() * 0.3;
        const revenue = Math.round(baseRevenue * weekdayFactor * randomFactor * 100) / 100;
        const orders = Math.max(5, Math.round(baseOrders * weekdayFactor * (0.85 + Math.random() * 0.3)));
        const avgTicket = Math.round((revenue / orders) * 100) / 100;

        salesData.push({ storeId, date, revenue, orders, avgTicket });

        // 每天生成5个订单明细
        for (let o = 0; o < 5; o++) {
          const orderId = randomUUID();
          const itemCount = 1 + Math.floor(Math.random() * 2);
          let orderTotal = 0;

          for (let i = 0; i < itemCount; i++) {
            const p = products[Math.floor(Math.random() * products.length)];
            const qty = 1 + Math.floor(Math.random() * 3);
            const subtotal = qty * p.price;
            orderTotal += subtotal;
            orderItemsData.push({
              orderId,
              productId: prodIds[t][p.sku],
              quantity: qty,
              unitPrice: p.price,
              subtotal,
            });
          }

          ordersData.push({
            id: orderId,
            storeId,
            date,
            total: orderTotal,
            paymentMethod: paymentMethods[Math.floor(Math.random() * 3)],
            status: "completed",
          });
        }
      }
    }
  }

  // ── Phase 3: 批量写入 ──
  console.log(`📦 写入: ${salesData.length} sales, ${inventoryData.length} inventory, ${ordersData.length} orders, ${orderItemsData.length} orderItems`);

  // SQLite 单次 transaction 上限约 500 条，分批写入
  const BATCH = 500;

  const batchWrite = async (model, data) => {
    for (let i = 0; i < data.length; i += BATCH) {
      await model.createMany({ data: data.slice(i, i + BATCH) });
    }
  };

  await batchWrite(prisma.inventory, inventoryData);
  await batchWrite(prisma.sale, salesData);
  await batchWrite(prisma.order, ordersData);
  await batchWrite(prisma.orderItem, orderItemsData);

  // ── 统计 ──
  const stats = {
    tenants: await prisma.tenant.count(),
    users: await prisma.user.count(),
    stores: await prisma.store.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    sales: await prisma.sale.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    inventory: await prisma.inventory.count(),
  };

  console.log("\n📊 数据统计:");
  Object.entries(stats).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
  console.log("\n✅ 测试数据生成完成!");
}

main()
  .catch((e) => { console.error("❌ 生成失败:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
