import express from "express";
import cors from "cors";
import { pool } from "./db";
import propertyRoutes from "./routes/propertyRoutes";
import riskRoutes from "./routes/riskRoutes";

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    res.json({ status: "ok", time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Database connection failed" });
  }
});

// Routes
app.use("/api/v1/properties", propertyRoutes);
app.use("/api/v1/properties", riskRoutes); // Handles both risk calculation and resident-specific triggers

app.listen(PORT, () => {
  console.log(`✓ Backend running on http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
});
