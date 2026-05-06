import React from "react";
import { ResidentRisk, CalculateRiskResponse } from "./types";
import { ResidentRow } from "./ResidentRow";
import { RiskSummaryHeader } from "./RiskSummaryHeader";

interface RiskTableProps {
  data: CalculateRiskResponse;
  filteredResidents: ResidentRisk[];
  expandedResidents: Set<string>;
  toggleExpandResident: (id: string) => void;
  triggerRenewalEvent: (resident: ResidentRisk) => void;
  triggerStatus: Record<string, "loading" | "success" | "error">;
  filterTier: "all" | "high" | "medium" | "low";
  setFilterTier: (tier: "all" | "high" | "medium" | "low") => void;
}

export const RiskTable: React.FC<RiskTableProps> = ({
  data,
  filteredResidents,
  expandedResidents,
  toggleExpandResident,
  triggerRenewalEvent,
  triggerStatus,
  filterTier,
  setFilterTier,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <RiskSummaryHeader
        data={data}
        filterTier={filterTier}
        setFilterTier={setFilterTier}
      />

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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredResidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No residents found matching the "{filterTier}" filter.
                </td>
              </tr>
            ) : (
              filteredResidents.map((resident) => (
                <ResidentRow
                  key={resident.residentId}
                  resident={resident}
                  isExpanded={expandedResidents.has(resident.residentId)}
                  onToggleExpand={toggleExpandResident}
                  onTriggerRenewal={triggerRenewalEvent}
                  triggerStatus={triggerStatus[resident.residentId]}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
