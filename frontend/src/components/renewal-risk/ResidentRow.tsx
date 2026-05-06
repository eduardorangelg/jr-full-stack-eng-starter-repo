import React, { Fragment } from "react";
import { ResidentRisk } from "./types";
import { RiskTierBadge } from "./RiskTierBadge";
import { SignalBreakdown } from "./SignalBreakdown";

interface ResidentRowProps {
  resident: ResidentRisk;
  isExpanded: boolean;
  onToggleExpand: (residentId: string) => void;
  onTriggerRenewal: (resident: ResidentRisk) => void;
  triggerStatus: "loading" | "success" | "error" | undefined;
}

export const ResidentRow: React.FC<ResidentRowProps> = ({
  resident,
  isExpanded,
  onToggleExpand,
  onTriggerRenewal,
  triggerStatus,
}) => {
  return (
    <Fragment>
      <tr
        className="hover:bg-gray-50 cursor-pointer"
        onClick={() => onToggleExpand(resident.residentId)}
      >
        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
          <div className="flex items-center">
            <svg
              className={`mr-2 h-4 w-4 transition-transform ${
                isExpanded ? "transform rotate-90" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            {resident.name}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
          <span title={`Unit ID: ${resident.unitId}`}>
            Unit {resident.unitNumber}
          </span>
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
          <RiskTierBadge tier={resident.riskTier} />
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTriggerRenewal(resident);
            }}
            disabled={
              triggerStatus === "loading" || triggerStatus === "success"
            }
            className={`text-sm px-3 py-1 rounded transition-colors ${
              triggerStatus === "success"
                ? "bg-green-100 text-green-700"
                : triggerStatus === "error"
                  ? "bg-red-100 text-red-700"
                  : "text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200"
            }`}
          >
            {triggerStatus === "loading"
              ? "Sending..."
              : triggerStatus === "success"
                ? "✓ Sent"
                : triggerStatus === "error"
                  ? "Failed"
                  : "Trigger RMS"}
          </button>
        </td>
      </tr>

      {/* Signal Breakdown Dropdown */}
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={6} className="px-6 py-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Risk Signal Breakdown
            </div>
            <SignalBreakdown signals={resident.signals} />
          </td>
        </tr>
      )}
    </Fragment>
  );
};
