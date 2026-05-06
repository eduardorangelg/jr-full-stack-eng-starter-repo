import React from "react";
import { CalculateRiskResponse } from "./types";

interface RiskSummaryHeaderProps {
  data: CalculateRiskResponse;
  filterTier: "all" | "high" | "medium" | "low";
  setFilterTier: (tier: "all" | "high" | "medium" | "low") => void;
}

export const RiskSummaryHeader: React.FC<RiskSummaryHeaderProps> = ({
  data,
  filterTier,
  setFilterTier,
}) => {
  return (
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm text-gray-600">
      <div className="flex flex-col gap-1">
        <span>Last calculated: {new Date(data.calculatedAt).toLocaleString()}</span>
        <div className="flex space-x-4">
          <span className="text-red-600 font-medium">High: {data.riskTiers.high}</span>
          <span className="text-yellow-600 font-medium">Medium: {data.riskTiers.medium}</span>
          <span className="text-green-600 font-medium">Low: {data.riskTiers.low}</span>
        </div>
      </div>

      {/* Filter by Risk Tier */}
      <div className="flex items-center gap-2">
        <label htmlFor="tier-filter" className="font-medium text-gray-700">
          Filter by Risk:
        </label>
        <select
          id="tier-filter"
          value={filterTier}
          onChange={(e) =>
            setFilterTier(e.target.value as "all" | "high" | "medium" | "low")
          }
          className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="all">All Tiers</option>
          <option value="high">High Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="low">Low Risk</option>
        </select>
      </div>
    </div>
  );
};
