import { staticRosterSource } from "@/lib/roster-source";
import { DEFAULT_TEAM_ID } from "@/lib/teams";
import HomeRedirect from "@/components/HomeRedirect";

// The home route sends visitors to a team page. It resolves the saved "my team"
// (roadmap 5a) on the client and falls back to the default. The valid team ids are
// resolved here on the server — only id strings cross to the client, no roster data.
export default function Home() {
  const teamIds = staticRosterSource.listTeams().map((team) => team.id);
  return <HomeRedirect teamIds={teamIds} defaultId={DEFAULT_TEAM_ID} />;
}
