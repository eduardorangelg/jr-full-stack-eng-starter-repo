import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CalculateRiskResponse, ResidentRisk } from "../components/renewal-risk/types";
import { RiskTable } from "../components/renewal-risk/RiskTable";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3003";

function RenewalRiskPage() {
  const { propertyId } = useParams<{ propertyId: string }>();

  // --- State Management ---
  const [data, setData] = useState<CalculateRiskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggerStatus, setTriggerStatus] = useState<
    Record<string, "loading" | "success" | "error">
  >({});
  const [filterTier, setFilterTier] = useState<
    "all" | "high" | "medium" | "low"
  >("all");
  const [expandedResidents, setExpandedResidents] = useState<Set<string>>(
    new Set(),
  );

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

  const triggerRenewalEvent = async (resident: ResidentRisk) => {
    setTriggerStatus((prev) => ({ ...prev, [resident.residentId]: "loading" }));

    try {
      const response = await fetch(
        `${API_URL}/api/v1/properties/${propertyId}/residents/${resident.residentId}/trigger-renewal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            riskScore: resident.riskScore,
            riskTier: resident.riskTier,
            daysToExpiry: resident.daysToExpiry,
          }),
        },
      );

      if (!response.ok) throw new Error("Trigger failed");

      setTriggerStatus((prev) => ({
        ...prev,
        [resident.residentId]: "success",
      }));

      // Reset success message after 3 seconds
      setTimeout(() => {
        setTriggerStatus((prev) => {
          const newState = { ...prev };
          delete newState[resident.residentId];
          return newState;
        });
      }, 3000);
    } catch (err) {
      setTriggerStatus((prev) => ({ ...prev, [resident.residentId]: "error" }));
    }
  };

  // --- Helpers ---
  const toggleExpandResident = (residentId: string) => {
    setExpandedResidents((prev) => {
      const next = new Set(prev);
      if (next.has(residentId)) {
        next.delete(residentId);
      } else {
        next.add(residentId);
      }
      return next;
    });
  };

  const filteredResidents =
    data?.residents.filter((r) =>
      filterTier === "all" ? true : r.riskTier === filterTier,
    ) || [];

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
        <RiskTable
          data={data}
          filteredResidents={filteredResidents}
          expandedResidents={expandedResidents}
          toggleExpandResident={toggleExpandResident}
          triggerRenewalEvent={triggerRenewalEvent}
          triggerStatus={triggerStatus}
          filterTier={filterTier}
          setFilterTier={setFilterTier}
        />
      )}
    </div>
  );
}

export default RenewalRiskPage;
