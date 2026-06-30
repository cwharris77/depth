import { redirect } from "next/navigation";
import { DEFAULT_TEAM_ID } from "@/lib/teams";

// The home route sends visitors to a team page. Once "my team" persistence (5a)
// lands this can prefer the saved team; for now it opens the default.
export default function Home() {
  redirect(`/team/${DEFAULT_TEAM_ID}`);
}
