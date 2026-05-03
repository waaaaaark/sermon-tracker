import { getSermons, getGuesses, getLeaderboard } from "@/lib/store";
import { getNextSunday } from "@/lib/utils";
import SermonChart from "@/components/SermonChart";
import SermonList from "@/components/SermonList";
import LeaderboardComponent from "@/components/Leaderboard";
import GuessFormWrapper from "@/components/GuessFormWrapper";

export const revalidate = "force-dynamic";

export default async function Home() {
  const [sermons, guesses, leaderboard] = await Promise.all([
    getSermons(),
    getGuesses(),
    getLeaderboard(),
  ]);

  const nextSunday = getNextSunday();
  const resultDates = new Set(sermons.map((s) => s.date));

  const futureSundays: string[] = [];
  const d = new Date(nextSunday);
  for (let i = 0; i < 4; i++) {
    const dateStr = d.toISOString().split("T")[0];
    if (!resultDates.has(dateStr)) futureSundays.push(dateStr);
    d.setDate(d.getDate() + 7);
  }

  return (
    <main className="page">
      <header className="site-header">
        <div className="header-cross">✝</div>
        <div className="header-text">
          <h1>Sunday Sermon Clock</h1>
          <p className="header-sub">How long will the preacher preach?</p>
        </div>
      </header>

      <div className="content">
        <section className="card">
          <h2 className="section-title">
            <span className="section-icon">📈</span>
            Sermon Lengths
          </h2>
          <SermonChart sermons={sermons} />
        </section>

        <div className="two-col">
          <section className="card">
            <h2 className="section-title">
              <span className="section-icon">🎯</span>
              Make Your Guess
            </h2>
            <p className="section-desc">
              How long do you think this week&apos;s sermon will be?
            </p>
            <GuessFormWrapper availableDates={futureSundays} />
          </section>

          <section className="card">
            <h2 className="section-title">
              <span className="section-icon">🏆</span>
              Leaderboard
            </h2>
            <p className="section-desc">
              Ranked by average accuracy of last 4 scored guesses.
            </p>
            <LeaderboardComponent entries={leaderboard} />
          </section>
        </div>

        <section className="card">
          <h2 className="section-title">
            <span className="section-icon">📋</span>
            Sermon History
          </h2>
          <SermonList sermons={sermons} guesses={guesses} />
        </section>
      </div>

      <footer className="site-footer">
        <a href="/admin">Admin</a>
      </footer>
    </main>
  );
}
