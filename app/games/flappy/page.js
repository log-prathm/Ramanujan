import Link from "next/link";
import FlappyBirdGame from "@/components/FlappyBirdGame";

export const metadata = {
  title: "Flappy Bird | Ramanujan Retro Arcade"
};

export default function FlappyPage() {
  return (
    <main className="game-shell">
      <div className="game-header">
        <Link href="/" className="back-link">
          Back to Home
        </Link>
        <h1>Flappy Bird: Anonymous Ladder</h1>
      </div>
      <FlappyBirdGame />
    </main>
  );
}
