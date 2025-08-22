import "@logseq/libs";
import { runVoiceFlow } from "./lib/voiceProcessor";

async function main() {
  console.log("VoiceFlow Automate Plugin loaded");
  // Slash command
  logseq.Editor.registerSlashCommand("VoiceFlow: Transcribe & Process", async () => {
    await runVoiceFlow();
  });
  // Shortcut
  logseq.App.registerCommandShortcut({ binding: "mod+shift+v" }, async () => {
    await runVoiceFlow();
  });
}

logseq.ready(main).catch(console.error);
