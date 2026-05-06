import { Router } from "express";
import { riskService } from "../services/riskService";

const router = Router();

// POST /api/v1/properties/:propertyId/renewal-risk/calculate
router.post("/:propertyId/renewal-risk/calculate", async (req, res) => {
  const { propertyId } = req.params;
  try {
    const result = await riskService.calculateRisk(propertyId);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Calculation Error:", error);
    if (error.message.includes("No active residents")) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "An error occurred while calculating risk scores." });
  }
});

// POST /api/v1/properties/:propertyId/residents/:residentId/trigger-renewal
router.post("/:propertyId/residents/:residentId/trigger-renewal", async (req, res) => {
  const { propertyId, residentId } = req.params;
  const riskData = req.body;
  try {
    const result = await riskService.triggerRenewalEvent(propertyId, residentId, riskData);
    res.status(200).json(result);
  } catch (error) {
    console.error("RMS Webhook Error:", error);
    res.status(500).json({ error: "Failed to trigger RMS webhook" });
  }
});

export default router;
