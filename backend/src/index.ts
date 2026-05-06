import express from "express";
import cors from "cors";
import { pool } from "./db";

// Interfaces
interface RiskSignals {
  daysToExpiryDays: number;
  paymentHistoryDelinquent: boolean;
  noRenewalOfferYet: boolean;
  rentGrowthAboveMarket: boolean;
}

interface ResidentRisk {
  residentId: string;
  name: string;
  unitId: string;
  riskScore: number;
  riskTier: "high" | "medium" | "low";
  daysToExpiry: number;
  signals: RiskSignals;
}

interface CalculateRiskResponse {
  propertyId: string;
  calculatedAt: string;
  totalResidents: number;
  riskTiers: {
    high: number;
    medium: number;
    low: number;
  };
  residents: ResidentRisk[];
}

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    res.json({ status: "ok", time: result.rows[0].now });
  } catch (err) {
    res
      .status(500)
      .json({ status: "error", message: "Database connection failed" });
  }
});

// Get the seeded property (convenience endpoint for the frontend)
app.get("/api/v1/properties", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, address, city, state, zip_code FROM properties WHERE status = 'active'",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

// =============================================================
// Renewal Risk Calculation Endpoint
// POST /api/v1/properties/:propertyId/renewal-risk/calculate
// =============================================================
app.post(
  "/api/v1/properties/:propertyId/renewal-risk/calculate",
  async (req, res) => {
    const { propertyId } = req.params;

    try {
      // 1. Fetch all raw data in a single optimized query
      const dataQuery = `
      SELECT 
          r.id AS resident_id,
          r.first_name,
          r.last_name,
          u.id AS unit_id,
          u.unit_number,
          l.id AS lease_id,
          (l.lease_end_date - CURRENT_DATE) AS days_to_expiry,
          l.monthly_rent,
          (SELECT market_rent FROM unit_pricing up 
           WHERE up.unit_id = u.id 
           ORDER BY effective_date DESC LIMIT 1) as market_rent,
          EXISTS (
              SELECT 1 FROM resident_ledger rl 
              WHERE rl.resident_id = r.id 
              AND rl.charge_code = 'late_fee' 
              AND rl.transaction_date > CURRENT_DATE - INTERVAL '6 months'
          ) as is_delinquent,
          EXISTS (
              SELECT 1 FROM renewal_offers ro 
              WHERE ro.lease_id = l.id
          ) as has_renewal_offer
      FROM residents r
      JOIN units u ON r.unit_id = u.id
      JOIN leases l ON r.id = l.resident_id
      WHERE r.property_id = $1 
        AND r.status = 'active'
        AND l.status = 'active';
    `;

      const result = await pool.query(dataQuery, [propertyId]);
      const activeResidents = result.rows;

      if (activeResidents.length === 0) {
        return res
          .status(404)
          .json({ error: "No active residents found for this property." });
      }

      const calculatedAt = new Date().toISOString();
      const finalResidents: ResidentRisk[] = [];
      const riskTiersCount = { high: 0, medium: 0, low: 0 };

      // Set up a database transaction to save the calculated scores safely
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        for (const row of activeResidents) {
          const daysToExpiry = parseInt(row.days_to_expiry, 10);
          const isDelinquent = row.is_delinquent;
          const hasRenewalOffer = row.has_renewal_offer;

          // Postgres returns decimals as strings, so we parse them
          const monthlyRent = parseFloat(row.monthly_rent);
          const marketRent = parseFloat(row.market_rent);
          const rentGapPct = ((marketRent - monthlyRent) / monthlyRent) * 100;

          // --- 2. Base Score Calculation ---
          let daysScore = 0;
          if (daysToExpiry <= 90) daysScore = 100;
          else if (daysToExpiry <= 180) daysScore = 50;
          else daysScore = 10;

          const delinquencyScore = isDelinquent ? 100 : 0;
          const noOfferScore = !hasRenewalOffer ? 100 : 0;

          let rentGapScore = 0;
          if (rentGapPct > 10) rentGapScore = 100;
          else if (rentGapPct >= 5) rentGapScore = 50;

          let baseScore =
            daysScore * 0.4 +
            delinquencyScore * 0.25 +
            noOfferScore * 0.2 +
            rentGapScore * 0.15;

          // --- 3. Interaction Logic ---
          if (isDelinquent && !hasRenewalOffer) {
            baseScore += 10;
          }
          if (daysToExpiry <= 30 && rentGapPct > 10) {
            baseScore += 15;
          }
          if (isDelinquent && daysToExpiry <= 60) {
            baseScore += 10;
          }

          // Cap at 100 and floor at 0
          const finalScore = Math.max(0, Math.min(Math.round(baseScore), 100));

          // --- 4. Determine Tier ---
          let riskTier: "high" | "medium" | "low" = "low";
          if (finalScore >= 70) riskTier = "high";
          else if (finalScore >= 40) riskTier = "medium";

          riskTiersCount[riskTier]++;

          // --- 5. Save to Database ---
          const insertQuery = `
          INSERT INTO renewal_risk_scores 
          (property_id, resident_id, lease_id, risk_score, risk_tier, days_to_expiry, is_delinquent, has_renewal_offer, rent_gap_pct, calculated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
          await client.query(insertQuery, [
            propertyId,
            row.resident_id,
            row.lease_id,
            finalScore,
            riskTier,
            daysToExpiry,
            isDelinquent,
            hasRenewalOffer,
            rentGapPct,
            calculatedAt,
          ]);

          // --- 6. Append to Response Array ---
          finalResidents.push({
            residentId: row.resident_id,
            name: `${row.first_name} ${row.last_name}`,
            unitId: row.unit_id,
            riskScore: finalScore,
            riskTier: riskTier,
            daysToExpiry: daysToExpiry,
            signals: {
              daysToExpiryDays: daysToExpiry,
              paymentHistoryDelinquent: isDelinquent,
              noRenewalOfferYet: !hasRenewalOffer,
              rentGrowthAboveMarket: rentGapPct > 10,
            },
          });
        }

        await client.query("COMMIT");
      } catch (dbError) {
        await client.query("ROLLBACK");
        throw dbError; // Pass to outer catch
      } finally {
        client.release();
      }

      // --- 7. Return Final JSON ---
      const responsePayload: CalculateRiskResponse = {
        propertyId,
        calculatedAt,
        totalResidents: finalResidents.length,
        riskTiers: riskTiersCount,
        residents: finalResidents,
      };

      res.status(200).json(responsePayload);
    } catch (error) {
      console.error("Calculation Error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while calculating risk scores." });
    }
  },
);

// =============================================================
// Bonus: Trigger Renewal Event Endpoint
// POST /api/v1/properties/:propertyId/residents/:residentId/trigger-renewal
// =============================================================
app.post(
  "/api/v1/properties/:propertyId/residents/:residentId/trigger-renewal",
  async (req, res) => {
    const { propertyId, residentId } = req.params;
    const riskData = req.body;

    // Grab the mock RMS URL from the environment (provided in docker-compose)
    const rmsUrl = process.env.MOCK_RMS_URL || "http://mock-rms:3001/webhook";

    try {
      // 1. Construct the exact payload requested in the requirements
      const payload = {
        event: "renewal.risk_flagged",
        eventId: `evt-${Date.now()}`, // Simple unique ID
        timestamp: new Date().toISOString(),
        propertyId,
        residentId,
        data: riskData,
      };

      // 2. POST the payload to the Mock RMS server
      const rmsResponse = await fetch(rmsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!rmsResponse.ok) {
        throw new Error(
          `Mock RMS responded with status: ${rmsResponse.status}`,
        );
      }

      // 3. Tell the frontend it worked
      res.status(200).json({ success: true, message: "Event sent to RMS" });
    } catch (error) {
      console.error("RMS Webhook Error:", error);
      res.status(500).json({ error: "Failed to trigger RMS webhook" });
    }
  },
);

app.listen(PORT, () => {
  console.log(`✓ Backend running on http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
  console.log(
    `✓ Mock RMS URL: ${process.env.MOCK_RMS_URL || "not configured"}`,
  );
});
