import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const BAND_API_KEY = process.env.BAND_API_KEY || "";
const BAND_ROOM_ID = process.env.BAND_ROOM_ID || "";

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
    console.error("Error archiving session:", e);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId") || BAND_ROOM_ID || "local-default-room-id";

  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
  }

  // Try reading from local shared JSON
  const sharedFilePath = path.join(process.cwd(), "../shared_messages.json");
  if (fs.existsSync(sharedFilePath)) {
    try {
      const fileContent = fs.readFileSync(sharedFilePath, "utf-8");
      const messages = JSON.parse(fileContent);
      return NextResponse.json({ data: messages });
    } catch (e: any) {
      console.error("Error reading shared messages file:", e);
    }
  }

  try {
    const response = await fetch(
      `https://app.band.ai/api/v1/agent/chats/${roomId}/messages?status=all&page_size=100`,
      {
        method: "GET",
        headers: {
          "X-API-Key": BAND_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Failed to fetch messages: ${errorText}` },
        { status: response.status }
      );
    }

    const resJson = await response.json();
    return NextResponse.json(resJson);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    // Archive current session before starting a new one
    archiveCurrentSession();

    // Reset and initialize shared_messages.json locally with the user's message
    const sharedFilePath = path.join(process.cwd(), "../shared_messages.json");
    const initialMsg = {
      id: crypto.randomUUID(),
      content: content,
      sender_name: null,
      sender_type: "User",
      inserted_at: new Date().toISOString(),
      message_type: "text"
    };
    
    try {
      fs.writeFileSync(sharedFilePath, JSON.stringify([initialMsg], null, 2), "utf-8");
    } catch (e: any) {
      console.error("Error writing initial user message to shared file:", e);
    }

    // Trigger local Python Swarm Orchestrator on port 5001
    fetch("http://127.0.0.1:5001/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }).catch(err => console.error("Error triggering local swarm:", err));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Archive current session before deleting it
    archiveCurrentSession();

    const sharedFilePath = path.join(process.cwd(), "../shared_messages.json");
    if (fs.existsSync(sharedFilePath)) {
      fs.writeFileSync(sharedFilePath, JSON.stringify([], null, 2), "utf-8");
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
