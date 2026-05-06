import React from "react";
import { RiskSignals } from "./types";

interface SignalBreakdownProps {
  signals: RiskSignals;
}

export const SignalBreakdown: React.FC<SignalBreakdownProps> = ({ signals }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div
        className={`p-3 rounded-md border ${
          signals.daysToExpiryDays <= 90
            ? "bg-red-50 border-red-100"
            : signals.daysToExpiryDays <= 180
              ? "bg-yellow-50 border-yellow-100"
              : "bg-green-50 border-green-100"
        }`}
      >
        <div className="text-xs text-gray-500 font-medium">Days to Expiry</div>
        <div className="text-sm font-bold mt-1">{signals.daysToExpiryDays} days</div>
      </div>

      <div
        className={`p-3 rounded-md border ${
          signals.paymentHistoryDelinquent
            ? "bg-red-50 border-red-100"
            : "bg-green-50 border-green-100"
        }`}
      >
        <div className="text-xs text-gray-500 font-medium">Payment History</div>
        <div className="text-sm font-bold mt-1">
          {signals.paymentHistoryDelinquent ? "Delinquent" : "Clean"}
        </div>
      </div>

      <div
        className={`p-3 rounded-md border ${
          signals.noRenewalOfferYet
            ? "bg-red-50 border-red-100"
            : "bg-green-50 border-green-100"
        }`}
      >
        <div className="text-xs text-gray-500 font-medium">Renewal Offer</div>
        <div className="text-sm font-bold mt-1">
          {signals.noRenewalOfferYet ? "Not Sent" : "Sent"}
        </div>
      </div>

      <div
        className={`p-3 rounded-md border ${
          signals.rentGrowthAboveMarket
            ? "bg-red-50 border-red-100"
            : "bg-green-50 border-green-100"
        }`}
      >
        <div className="text-xs text-gray-500 font-medium">Rent vs. Market</div>
        <div className="text-sm font-bold mt-1">
          {signals.rentGrowthAboveMarket ? "Above Market" : "At/Below Market"}
        </div>
      </div>
    </div>
  );
};
