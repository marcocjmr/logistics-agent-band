import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

function archiveCurrentSession() {
  const sharedFilePath = path.join(process.cwd(), "../shared_messages.json");
  const historyFilePath = path.join(process.cwd(), "../shared_history.json");
  
  if (!fs.existsSync(sharedFilePath)) return;
  
  try {
    const fileContent = fs.readFileSync(sharedFilePath, "utf-8");
    const prevMessages = JSON.parse(fileContent);
    if (!Array.isArray(prevMessages) || prevMessages.length === 0) return;
    
    // Check if this session is already archived
    let history = [];
    if (fs.existsSync(historyFilePath)) {
      try {
        history = JSON.parse(fs.readFileSync(historyFilePath, "utf-8"));
      } catch (e) {
        history = [];
      }
    }
    
    const lastMsgId = prevMessages[prevMessages.length - 1]?.id;
    const isAlreadyArchived = history.some((h: any) => h.messages[h.messages.length - 1]?.id === lastMsgId);
    if (isAlreadyArchived) return;

    // Extract query and travelState
    const userMsg = prevMessages.find((m: any) => m.sender_type === "User");
    const queryText = userMsg ? userMsg.content : "Untitled Plan";
    
    let destination = "Unknown";
    let totalCost = 0;
    let auditStatus = "pending";
    for (let i = prevMessages.length - 1; i >= 0; i--) {
      const content = prevMessages[i].content.trim();
      if (content.startsWith("{") && content.includes('"request"')) {
        try {
          const stateObj = JSON.parse(content);
          if (stateObj.request) {
            destination = stateObj.request.destination || destination;
            auditStatus = stateObj.audit?.status || auditStatus;
            totalCost = (stateObj.transit?.total_cost || 0) + (stateObj.lodging?.total_cost || 0);
            break;
          }
        } catch (e) {}
      }
    }

    // Only archive if the plan has progressed beyond the user's initial message
    const hasSwarmResponses = prevMessages.some((m: any) => m.sender_type !== "User");
    if (!hasSwarmResponses) return;

    history.push({
      id: crypto.randomUUID(),
      query: queryText,
      destination: destination,
      totalCost: totalCost,
      status: auditStatus,
      timestamp: new Date().toISOString(),
      messages: prevMessages
    });
    
    fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2), "utf-8");
  } catch (e) {
    console.error("Error archiving session in history GET:", e);
  }
}

export async function GET(request: NextRequest) {
  // Auto-archive active session if it's ready
  archiveCurrentSession();

  const historyFilePath = path.join(process.cwd(), "../shared_history.json");
  if (fs.existsSync(historyFilePath)) {
    try {
      const fileContent = fs.readFileSync(historyFilePath, "utf-8");
      const history = JSON.parse(fileContent);
      // Return history sorted by newest first
      if (Array.isArray(history)) {
        const sorted = [...history].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return NextResponse.json({ data: sorted });
      }
      return NextResponse.json({ data: history });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }
  return NextResponse.json({ data: [] });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const historyFilePath = path.join(process.cwd(), "../shared_history.json");
  if (fs.existsSync(historyFilePath)) {
    try {
      const fileContent = fs.readFileSync(historyFilePath, "utf-8");
      const history = JSON.parse(fileContent);
      if (Array.isArray(history)) {
        const filtered = history.filter((item: any) => item.id !== id);
        fs.writeFileSync(historyFilePath, JSON.stringify(filtered, null, 2), "utf-8");
        return NextResponse.json({ success: true, count: filtered.length });
      }
      return NextResponse.json({ error: "Invalid history format" }, { status: 500 });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "History file not found" }, { status: 404 });
}
