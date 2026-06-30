"use client";

import { useEffect } from "react";
import { setMyTeam } from "@/lib/my-team";

// Persists the team currently being viewed (roadmap 5a). Renders nothing; it just
// records the team id on mount so the home route can reopen it on the next visit.
export default function RememberTeam({ id }: { id: string }) {
  useEffect(() => {
    setMyTeam(id);
  }, [id]);
  return null;
}
