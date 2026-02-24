import clientPromise from "@/lib/mongodb";

export async function GET(request) {
  try {
    const game = new URL(request.url).searchParams.get("game") || "flappy-bird";
    const client = await clientPromise;
    const db = client.db("ramanujan_arcade");

    const top = await db
      .collection("scores")
      .find({ game })
      .sort({ score: -1, updatedAt: 1 })
      .limit(20)
      .project({ _id: 0, username: 1, score: 1, game: 1, updatedAt: 1 })
      .toArray();

    return Response.json({ ok: true, leaderboard: top });
  } catch (error) {
    return Response.json(
      { ok: false, error: "Failed to fetch leaderboard", details: error.message },
      { status: 500 }
    );
  }
}
