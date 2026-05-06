import React from "react";

interface RiskTierBadgeProps {
  tier: "high" | "medium" | "low";
}

export const RiskTierBadge: React.FC<RiskTierBadgeProps> = ({ tier }) => {
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
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTierColor(tier)}`}
    >
      {tier.toUpperCase()}
    </span>
  );
};
