import { useState } from "react";
import { useParams, Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3003";

// Interfaces (matching the backend contract)
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

function RenewalRiskPage() {
  const { propertyId } = useParams<{ propertyId: string }>();

  // --- State Management ---
  const [data, setData] = useState<CalculateRiskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Actions ---
  const calculateRisk = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/v1/properties/${propertyId}/renewal-risk/calculate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to calculate risk scores.");
      }

      const result: CalculateRiskResponse = await response.json();

      // Sort by highest risk score first
      result.residents.sort((a, b) => b.riskScore - a.riskScore);

      setData(result);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Helpers ---
  const getTierColor = (tier: string) => {
    switch (tier) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Properties
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Renewal Risk Dashboard
          </h1>
          <p className="text-gray-500">Property ID: {propertyId}</p>
        </div>
        <button
          onClick={calculateRisk}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? "Calculating..." : "Calculate Risk Scores"}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-red-700">
          <p>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!data && !isLoading && !error && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-lg font-medium mb-1">No data generated yet</p>
          <p className="text-sm">
            Click the button above to calculate current resident risk factors.
          </p>
        </div>
      )}

      {/* Data Table */}
      {data && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between text-sm text-gray-600">
            <span>
              Last calculated: {new Date(data.calculatedAt).toLocaleString()}
            </span>
            <div className="flex space-x-4">
              <span className="text-red-600 font-medium">
                High Risk: {data.riskTiers.high}
              </span>
              <span className="text-yellow-600 font-medium">
                Medium Risk: {data.riskTiers.medium}
              </span>
              <span className="text-green-600 font-medium">
                Low Risk: {data.riskTiers.low}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resident
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days to Expiry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Tier
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.residents.map((resident) => (
                  <tr key={resident.residentId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {resident.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {/* Simplified for display */}
                      {resident.unitId.substring(0, 8)}...{" "}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {resident.daysToExpiry} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900 font-medium">
                        {resident.riskScore}
                      </span>
                      <span className="text-gray-400 text-xs ml-1">/ 100</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTierColor(resident.riskTier)}`}
                      >
                        {resident.riskTier.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default RenewalRiskPage;
