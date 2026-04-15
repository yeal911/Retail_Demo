import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "请提供用户名和密码" });
    }

    const user = await prisma.user.findFirst({
      where: { username, password },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "用户名或密码错误" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
        tenant: user.tenant ? { id: user.tenant.id, name: user.tenant.name } : null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

export default router;
