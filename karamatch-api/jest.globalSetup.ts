import { client, resetDatabase } from "./database";

// The suites run against a real, long-lived MongoDB and never clean up after
// themselves: every run books slots for good. After enough runs the venues
// near Hasselt have no free hours left, ensureSlots has nothing to hand out,
// and the booking tests start failing on a world that simply ran dry.
// Wiping back to seed data before each run keeps them reproducible.
export default async function globalSetup() {
    await resetDatabase();
    await client.close();
}
