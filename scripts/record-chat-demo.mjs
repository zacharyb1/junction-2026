// Compatibility entry point for the original chat-only recording command.
// To refresh every replay: node scripts/record-demos.mjs [http://localhost:3000]
import { recordDemos } from "./record-demos.mjs";

recordDemos(process.argv[2], "chat");
