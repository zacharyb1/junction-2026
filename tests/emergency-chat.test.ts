import { describe, expect, it } from "vitest";
import { emergencyChatReply } from "@/lib/emergency";

describe("emergencyChatReply", () => {
  it("answers a seizure with the call first, the steps and the Red Cross page", () => {
    const reply = emergencyChatReply("help, dad is having a seizure") ?? "";
    expect(reply).toMatch(/^If someone is having a seizure now, call 112 now.* I cannot call for you\.\n/);
    expect(reply).toContain("- Do not hold them down");
    expect(reply).toContain("https://www.redcross.fi/first-aid/first-aid-instructions/seizures");
  });

  it("answers in Finnish when the message is Finnish", () => {
    expect(emergencyChatReply("isä ei hengitä")).toMatch(/^Jos joku ei herää, soita heti hätänumeroon 112.* En voi soittaa puolestasi\./);
  });

  it("leaves ordinary questions to AIDaddy", () => {
    expect(emergencyChatReply("the landlord wants to raise the rent")).toBeNull();
    expect(emergencyChatReply("he's not answering his phone")).toBeNull();
  });
});
