import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    roomId: process.env.BAND_ROOM_ID || "",
    requirementsAnalystId: process.env.REQUIREMENTS_ANALYST_ID || "",
    requirementsAnalystHandle: process.env.REQUIREMENTS_ANALYST_HANDLE || "",
    transitPlannerId: process.env.TRANSIT_PLANNER_ID || "",
    transitPlannerHandle: process.env.TRANSIT_PLANNER_HANDLE || "",
    accommodationScoutId: process.env.ACCOMMODATION_SCOUT_ID || "",
    accommodationScoutHandle: process.env.ACCOMMODATION_SCOUT_HANDLE || "",
    financialAuditorId: process.env.FINANCIAL_AUDITOR_ID || "",
    financialAuditorHandle: process.env.FINANCIAL_AUDITOR_HANDLE || "",
  });
}
