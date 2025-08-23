// src/main.tsx - Main entry point for VoiceFlow Automate
import "@logseq/libs";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { VoiceFlowApp } from './components/VoiceFlowApp';
import { runVoiceFlow, processVoiceNote } from "./lib/voiceProcessor";
import { initializeFileAccess } from "./lib/audioHandler";
import { settingsSchema } from './settings';
import './styles/index.css';

// Register settings schema
logseq.useSettingsSchema(settingsSchema);

async function main() {
  console.log("[VoiceFlow] Plugin loaded - Standalone version 2.0");

  // Mount React app
  const root = ReactDOM.createRoot(document.getElementById('app')!);
  root.render(
    <React.StrictMode>
      <VoiceFlowApp />
    </React.StrictMode>
  );

  // Initialize file access if enabled
  await initializeFileAccess();

  // Register slash command
  logseq.Editor.registerSlashCommand("VoiceFlow: Transcribe & Process", async () => {
    await runVoiceFlow();
  });

  // Register alternative slash commands
  logseq.Editor.registerSlashCommand("voiceflow", async () => {
    await runVoiceFlow();
  });

  logseq.Editor.registerSlashCommand("transcribe", async () => {
    await runVoiceFlow();
  });

  // Register block context menu
  logseq.Editor.registerBlockContextMenuItem("VoiceFlow Transcribe", async (block) => {
    await processVoiceNote(block.uuid);
  });

  // Register keyboard shortcut
  const shortcut = logseq.settings?.["voiceFlowShortcut"] || "mod+shift+v";
  logseq.App.registerCommandShortcut({ binding: shortcut }, async () => {
    await runVoiceFlow();
  });

  // Register command palette commands
  logseq.App.registerCommandPalette({
    key: "voiceflow-transcribe",
    label: "VoiceFlow: Transcribe current block",
    keybinding: {
      binding: shortcut
    }
  }, async () => {
    await runVoiceFlow();
  });

  logseq.App.registerCommandPalette({
    key: "voiceflow-settings",
    label: "VoiceFlow: Open settings"
  }, () => {
    logseq.showMainUI();
  });

  logseq.App.registerCommandPalette({
    key: "voiceflow-request-file-access",
    label: "VoiceFlow: Request file access (for automatic AAC deletion)"
  }, async () => {
    await initializeFileAccess();
  });

  // Model for UI
  function createModel() {
    return {
      show() {
        logseq.showMainUI({ autoFocus: true });
      },
    };
  }

  logseq.provideModel(createModel());

  logseq.setMainUIInlineStyle({
    zIndex: 11,
  });

  // Handle settings changes
  logseq.onSettingsChanged((newSettings, oldSettings) => {
    console.log("[VoiceFlow] Settings changed", newSettings);

    // Re-register shortcut if changed
    if (newSettings.voiceFlowShortcut !== oldSettings.voiceFlowShortcut) {
      const newShortcut = newSettings.voiceFlowShortcut || "mod+shift+v";
      logseq.App.registerCommandShortcut({ binding: newShortcut }, async () => {
        await runVoiceFlow();
      });
    }

    // Initialize file access if just enabled
    if (newSettings.autoRequestFileAccess && !oldSettings.autoRequestFileAccess) {
      initializeFileAccess();
    }
  });

  // Show initial setup message if no API key
  setTimeout(() => {
    if (!logseq.settings?.["openAIKey"]) {
      logseq.App.showMsg(
        "Welcome to VoiceFlow Automate! Please configure your OpenAI API key in plugin settings.",
        "info"
      );
    }
  }, 1000);
}

// Error boundary for the entire plugin
logseq.ready(main).catch(error => {
  console.error("[VoiceFlow] Failed to initialize plugin:", error);
  logseq.App.showMsg("VoiceFlow plugin failed to load. Check console for details.", "error");
});