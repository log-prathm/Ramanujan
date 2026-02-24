import clientPromise from "@/lib/mongodb";

function cleanUsername(value) {
  if (!value || typeof value !== "string") {
    return "Player";
  }
  return value.replace(/[^\w\s\-]/g, "").trim().slice(0, 18) || "Player";
}

export async function POST(request) {
  try {
    const { game, username, score, deviceId, localIp } = await request.json();

    if (game !== "flappy-bird") {
      return Response.json({ ok: false, error: "Unsupported game" }, { status: 400 });
    }

    if (!deviceId || typeof deviceId !== "string") {
      return Response.json({ ok: false, error: "Missing deviceId" }, { status: 400 });
    }

    const numericScore = Number(score);
    if (!Number.isFinite(numericScore) || numericScore < 0) {
      return Response.json({ ok: false, error: "Invalid score" }, { status: 400 });
    }

    const identity = `${deviceId.slice(0, 64)}::${String(localIp || "na").slice(0, 64)}`;
    const safeUsername = cleanUsername(username);
    const now = new Date();

    const client = await clientPromise;
    const db = client.db("ramanujan_arcade");
    const collection = db.collection("scores");

    const existing = await collection.findOne(
      { game, identity },
      { projection: { score: 1 } }
    );

    if (!existing || numericScore > existing.score) {
      await collection.updateOne(
        { game, identity },
        {
          $set: {
            game,
            identity,
            username: safeUsername,
            score: numericScore,
            localIp: localIp || null,
            updatedAt: now
          },
          $setOnInsert: {
            createdAt: now
          }
        },
        { upsert: true }
      );
      return Response.json({ ok: true, updated: true });
    }

    return Response.json({ ok: true, updated: false });
  } catch (error) {
    return Response.json(
      { ok: false, error: "Failed to submit score", details: error.message },
      { status: 500 }
    );
  }
}
