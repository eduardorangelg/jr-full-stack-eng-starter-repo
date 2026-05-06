import { pool } from "../db";
import { ResidentRisk, CalculateRiskResponse } from "../types/types";

export const riskService = {
  async calculateRisk(propertyId: string): Promise<CalculateRiskResponse> {
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
      throw new Error("No active residents found for this property.");
    }

    const calculatedAt = new Date().toISOString();
    const finalResidents: ResidentRisk[] = [];
    const riskTiersCount = { high: 0, medium: 0, low: 0 };

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (const row of activeResidents) {
        const daysToExpiry = parseInt(row.days_to_expiry, 10);
        const isDelinquent = row.is_delinquent;
        const hasRenewalOffer = row.has_renewal_offer;
        const monthlyRent = parseFloat(row.monthly_rent);
        const marketRent = parseFloat(row.market_rent);
        const rentGapPct = ((marketRent - monthlyRent) / monthlyRent) * 100;

        // Base Score
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

        // Interaction Logic
        if (isDelinquent && !hasRenewalOffer) baseScore += 10;
        if (daysToExpiry <= 30 && rentGapPct > 10) baseScore += 15;
        if (isDelinquent && daysToExpiry <= 60) baseScore += 10;

        const finalScore = Math.max(0, Math.min(Math.round(baseScore), 100));

        // Determine Tier
        let riskTier: "high" | "medium" | "low" = "low";
        if (finalScore >= 70) riskTier = "high";
        else if (finalScore >= 40) riskTier = "medium";

        riskTiersCount[riskTier]++;

        // Save to Database
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

        finalResidents.push({
          residentId: row.resident_id,
          name: `${row.first_name} ${row.last_name}`,
          unitId: row.unit_id,
          unitNumber: row.unit_number,
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

      return {
        propertyId,
        calculatedAt,
        totalResidents: finalResidents.length,
        riskTiers: riskTiersCount,
        residents: finalResidents,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async triggerRenewalEvent(
    propertyId: string,
    residentId: string,
    riskData: any,
  ) {
    const rmsUrl = process.env.MOCK_RMS_URL || "http://mock-rms:3001/webhook";

    const payload = {
      event: "renewal.risk_flagged",
      eventId: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      propertyId,
      residentId,
      data: riskData,
    };

    const response = await fetch(rmsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Mock RMS responded with status: ${response.status}`);
    }

    return { success: true, message: "Event sent to RMS" };
  },
};
