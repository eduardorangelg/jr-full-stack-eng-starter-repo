import { Router } from "express";
import { pool } from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, address, city, state, zip_code FROM properties WHERE status = 'active'",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

export default router;
