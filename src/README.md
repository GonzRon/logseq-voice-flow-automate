# 🎤 VoiceFlow Automate Plugin for Logseq

Seamlessly convert voice notes to organized Logseq pages and Todoist tasks using AI-powered transcription and smart task extraction.

## Features

- **Voice Transcription**: Leverages the GPT3-OpenAI plugin for accurate audio transcription
- **Automatic Page Creation**: Creates a new Logseq page with AI-generated title, transcription, and summary
- **Smart Task Creation**: Automatically creates tasks in Todoist based on voice content
- **Tag-Based Automation**: Use hashtags to control behavior (#todo, #ai, #direct)
- **AI Processing**: Optional AI summarization for complex voice notes
- **Hierarchical Tasks**: Create master tasks with subtasks for better organization
- **Project Mapping**: Route tasks to specific Todoist projects using tags
- **Due Date Recognition**: Natural language due date parsing

## Prerequisites

Before using this plugin, ensure you have installed and configured:

1. **logseq-plugin-gpt3-openai** - For voice transcription and AI processing
2. **logseq-todoist-plugin** - For task creation in Todoist

## Installation

1. Download the latest release from the releases page
2. In Logseq, go to Settings → Plugins
3. Click "Load unpacked plugin" and select the plugin folder
4. Configure the plugin settings as needed

## Usage

### Basic Workflow

1. Record or add an audio file to a Logseq block
2. Type `/VoiceFlowAutomate` or use the keyboard shortcut (Ctrl+Shift+V)
3. The plugin will:
   - Transcribe the audio using AI
   - Generate an AI title for the content
   - Create a new Logseq page with:
     - The transcription under "# Transcription"
     - An AI summary under "# Summary"
     - Additional sections for Tasks and Notes
   - Parse tags and instructions
   - Create tasks in Todoist (if #todo tag is present)
   - Add a reference to the new page in the original block

### Page Structure

Each created page includes:

```markdown
---
tags:: #voice-note #transcription
created:: 2024-01-15T10:30:00Z
source:: [[Original Page Name]]
---

# Transcription
[Full transcription of your voice note]

# Summary
[AI-generated summary of the key points]

# Tasks
[List of tasks if #todo tag was used]

# Notes
[Space for your additional notes]
```

### Tag Commands

- `#todo` - Triggers todo creation in Todoist
- `#ai` - Use AI summarization for task extraction
- `#direct` or `#literal` - Use literal transcription without AI processing
- `#work`, `#personal`, etc. - Route tasks to specific Todoist projects
- `#urgent`, `#high`, `#medium`, `#low` - Set task priority

### Examples

**Simple task:**
"Buy groceries tomorrow #todo"
- Creates a page with transcription
- Creates a single task in Todoist

**Multiple tasks with AI:**
"Plan office party: book venue, order catering, send invitations #todo #ai"
- Creates a page with full transcription and AI summary
- Uses AI to extract individual tasks
- Creates hierarchical tasks in Todoist

**Project routing:**
"Review quarterly reports #work #todo"
- Creates a page with transcription
- Routes task to Work project in Todoist

## Configuration

Access settings through Logseq Settings → VoiceFlow Automate:

### Core Settings
- **Todo Trigger Tags**: Tags that trigger todo creation
- **Default Transcription Mode**: Choose between literal or AI mode
- **Create Transcription Page**: Enable/disable automatic page creation
- **Auto-open Created Page**: Automatically navigate to the new page

### Task Settings
- **Hierarchical Tasks**: Enable/disable subtask creation in AI mode
- **Default Project**: Default Todoist project for tasks
- **Project Mappings**: Map hashtags to Todoist projects

### Page Settings
- **Add Tasks Section**: Include a Tasks section in created pages
- **Page Template**: Optional custom template for pages
- **Append Timestamp**: Add timestamps to transcriptions

### AI Settings
- **Custom AI Prompt**: Customize how AI extracts tasks and generates summaries

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Troubleshooting

1. **Plugins not found**: Ensure both required plugins are installed and enabled
2. **Transcription fails**: Check GPT3-OpenAI plugin API key configuration
3. **Tasks not created**: Verify Todoist plugin API token is set
4. **Page creation fails**: Check Logseq permissions and available storage

## Tips

- The AI-generated title helps organize your voice notes chronologically
- Use the Summary section for quick reference without reading full transcriptions
- Add your own notes and thoughts in the Notes section
- Link related pages using Logseq's [[page references]]
- Use templates for consistent page structure across voice notes

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues or feature requests, please open an issue on GitHub.