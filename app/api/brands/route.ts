import { NextResponse } from "next/server";
import { getAllBrandsData } from "@/lib/brands/mockData";

// Mock network boundary: TanStack Query hits this like a real API today.
// Swapping this handler's body for a real upstream fetch later requires
// no change to the hook, cache key, or any consuming component.
export async function GET() {
  const data = getAllBrandsData();
  return NextResponse.json(data);
}
