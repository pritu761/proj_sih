import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { SessionUser } from "@/lib/rbac";
import { answerCopilotQuery, type CopilotHistoryTurn } from "@/lib/services/copilot";

const CopilotQuerySchema = z.object({
  query: z
    .string()
    .min(4, "Ask the copilot a question, e.g. how many breached capitation cases in the Southern region?")
    .max(300, "Keep the question under 300 characters"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      })
    )
    .max(6)
    .optional(),
});

/**
 * POST /api/copilot — grounded chat over the live grievance registry.
 * Session required; regional scoping is applied inside the repository calls,
 * exactly like the case explorer.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CopilotQuerySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const user = session.user as unknown as SessionUser;
    const result = await answerCopilotQuery({
      query: parsed.data.query,
      history: parsed.data.history as CopilotHistoryTurn[] | undefined,
      user,
    });

    if (result.disabled) {
      return NextResponse.json(
        { success: false, disabled: true, error: result.error || "AI features are not configured. Set GROQ_API_KEY." },
        { status: 200 }
      );
    }
    if (!result.ok || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || "Copilot could not answer right now." },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Copilot failed." },
      { status: 200 }
    );
  }
}
