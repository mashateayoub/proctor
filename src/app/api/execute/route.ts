import { NextRequest, NextResponse } from "next/server";
import { executeCode, ExecutionRequest } from "@/lib/executionEngine";

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as ExecutionRequest;

    if(!payload?.code || !payload?.language) {
      return NextResponse.json(
        { error: "Code and language are required" },
        { status: 400 },
      );
    }

    const result = await executeCode(payload);
    if(result.provider === "remote" && result.error && result.error_code) {
      return NextResponse.json(result, { status: 503 });
    }
    return NextResponse.json(result);
  }
  catch(error: any) {
    return NextResponse.json(
      { error: "Execution engine disruption: " + error.message },
      { status: 500 },
    );
  }
}
