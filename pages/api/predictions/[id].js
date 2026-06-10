import { NextResponse } from "next/server";

export default async function handler(req) {
  // Predictions complete synchronously via HF; this endpoint is kept for compatibility
  return NextResponse.json({ status: "succeeded" });
}

export const config = {
  runtime: "edge",
};
