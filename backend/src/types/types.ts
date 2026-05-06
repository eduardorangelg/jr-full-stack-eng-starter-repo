export interface RiskSignals {
  daysToExpiryDays: number;
  paymentHistoryDelinquent: boolean;
  noRenewalOfferYet: boolean;
  rentGrowthAboveMarket: boolean;
}

export interface ResidentRisk {
  residentId: string;
  name: string;
  unitId: string;
  riskScore: number;
  riskTier: "high" | "medium" | "low";
  daysToExpiry: number;
  signals: RiskSignals;
}

export interface CalculateRiskResponse {
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
