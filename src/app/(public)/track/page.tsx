import { TrackClient } from "@/components/track/TrackClient";

export const metadata = {
  title: "Grievance Status Tracker | AICTE Sentinel",
  description:
    "Citizen-facing public tracker — check the live status of a grievance filed with AICTE using the registry number from your acknowledgement slip. No sign-in required.",
};

export default function TrackPage() {
  return <TrackClient />;
}
