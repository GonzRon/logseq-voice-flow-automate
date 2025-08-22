# 🎤 VoiceFlow Automate Plugin for Logseq (Standalone Version)

A standalone Logseq plugin that seamlessly converts voice notes to organized pages and Todoist tasks using OpenAI's Whisper API for transcription and GPT for intelligent task extraction.

## ✨ What's New in v2.0

**This plugin is now completely standalone!** No external plugin dependencies required.

- **Direct OpenAI Integration**: Built-in Whisper transcription and GPT processing
- **No External Dependencies**: Works independently without requiring other plugins
- **Enhanced Audio Support**: Native support for MP3, M4A, WAV, WEBM, and AAC files
- **Simplified Setup**: Just add your OpenAI API key and start transcribing

## 🚀 Features

- **🎙️ Voice Transcription**: Direct integration with OpenAI's Whisper API for accurate audio transcription
- **📄 Automatic Page Creation**: Creates organized Logseq pages with AI-generated titles and summaries
- **✅ Smart Task Creation**: Automatically creates tasks in Todoist based on voice content
- **🏷️ Tag-Based Automation**: Use hashtags to control behavior (#todo, #ai, #direct)
- **🤖 AI Processing**: Optional AI summarization and task extraction
- **📊 Hierarchical Tasks**: Create master tasks with subtasks for better organization
- **🗂️ Project Mapping**: Route tasks to specific Todoist projects using tags
- **📅 Due Date Recognition**: Natural language due date parsing
- **🔊 Wide Format Support**: MP3, M4A, WAV, WEBM, MP4, MPEG, MPGA, and AAC

## 📋 Prerequisites

1. **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)
2. **Logseq** - Version 0.8.0 or higher
3. **Todoist API Token** (optional) - For task creation features

## 🔧 Installation

### From Logseq Marketplace (Recommended)
1. Open Logseq Settings → Plugins
2. Search for "VoiceFlow Automate"
3. Click Install

### Manual Installation
1. Download the latest release from the releases page
2. In Logseq, go to Settings → Plugins
3. Click "Load unpacked plugin" and select the plugin folder

## ⚙️ Configuration

### Essential Setup

1. **Configure OpenAI API Key** (Required):
   - Go to Settings → Plugins → VoiceFlow Automate
   - Enter your OpenAI API key
   - Select your preferred model (gpt-3.5-turbo or gpt-4)

2. **Configure Todoist** (Optional):
   - Install the Logseq Todoist plugin if you want task creation
   - Configure your Todoist API token in that plugin

### Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| **OpenAI API Key** | - | Your OpenAI API key (required) |
| **OpenAI Model** | gpt-3.5-turbo | GPT model for summarization |
| **Default Mode** | literal | Choose between literal or AI processing |
| **Create Page** | true | Auto-create transcription pages |
| **Hierarchical Tasks** | true | Create subtasks in AI mode |
| **Keyboard Shortcut** | Ctrl+Shift+V | Customize the shortcut |

## 📖 Usage

### Basic Workflow

1. **Add an audio file** to a Logseq block:
   ```markdown
   ![Voice Recording](assets/recording.m4a)
   ```

2. **Trigger transcription** using one of these methods:
   - Type `/voiceflow` or `/transcribe`
   - Use keyboard shortcut `Ctrl+Shift+V` (customizable)
   - Right-click → "VoiceFlow Transcribe"

3. **The plugin will**:
   - Transcribe the audio using Whisper API
   - Generate an AI title and summary
   - Create a new organized page
   - Extract and create tasks (if #todo is present)
   - Add a reference to the new page

### Page Structure

Each created page includes:

```markdown
Title: AI-Generated Title
## Summary
- Key point 1
- Key point 2
- Key point 3

## Transcript
[Full transcription of your voice note]
```

### Tag Commands

Control plugin behavior with hashtags in your voice notes:

- `#todo` - Creates tasks in Todoist
- `#ai` - Use AI for task extraction
- `#direct` or `#literal` - Skip AI processing
- `#work`, `#personal` - Route to specific projects
- `#urgent`, `#high`, `#medium`, `#low` - Set priority

### Examples

#### Simple Task
*Voice:* "Buy groceries tomorrow #todo"
- Creates transcription page
- Creates single Todoist task with due date

#### Multiple Tasks with AI
*Voice:* "Plan office party: book venue, order catering, send invitations #todo #ai"
- Creates page with AI summary
- Extracts individual tasks using AI
- Creates hierarchical tasks in Todoist

#### Project Routing
*Voice:* "Review quarterly reports #work #todo"
- Creates transcription page
- Routes task to Work project in Todoist

## 🎯 Supported Audio Formats

- **MP3** - Direct transcription
- **M4A** - Direct transcription (iOS Voice Memos)
- **WAV** - Direct transcription
- **WEBM** - Direct transcription
- **AAC** - Converted or direct transcription
- **MP4/MPEG/MPGA** - Direct transcription

## 🔍 Troubleshooting

### Common Issues

**"Invalid OpenAI API Key"**
- Verify your API key in plugin settings
- Ensure your OpenAI account has credits
- Check if the key has the necessary permissions

**"Transcription failed"**
- Check audio file format is supported
- Verify file size is under 25MB (Whisper limit)
- Ensure stable internet connection

**"Tasks not created"**
- Verify Todoist plugin is installed and configured
- Check #todo tag is present in transcription
- Ensure project mappings are correct

### Debug Mode

Enable debug mode in settings to see detailed logs in the browser console (F12).

## 💡 Tips

- **Voice Memos on iOS**: Use M4A format for best compatibility
- **Long recordings**: Break into smaller segments for better processing
- **Clear speech**: Speak clearly for better transcription accuracy
- **Project tags**: Set up project mappings for automatic task routing
- **Templates**: Use page templates for consistent formatting

## 🔒 Privacy & Security

- **API Keys**: Stored locally in your Logseq graph
- **Audio Processing**: Files sent directly to OpenAI, not stored elsewhere
- **No Telemetry**: Plugin doesn't collect any usage data
- **Open Source**: Full code transparency

## 🆚 Comparison with v1.0

| Feature | v1.0 | v2.0 (Current) |
|---------|------|----------------|
| External Dependencies | Required GPT3-OpenAI plugin | **Standalone** |
| Setup Complexity | Complex (2 plugins) | **Simple** (1 plugin) |
| API Integration | Indirect | **Direct** |
| Maintenance | Dependent on external plugin | **Self-contained** |
| Performance | Additional overhead | **Optimized** |

## 📝 API Usage & Costs

This plugin uses OpenAI's APIs:
- **Whisper API**: ~$0.006 per minute of audio
- **GPT-3.5**: ~$0.002 per 1K tokens
- **GPT-4**: ~$0.03 per 1K tokens

Average voice note (1-2 minutes) costs approximately $0.01-0.02.

## 🐛 Known Limitations

- Audio files must be under 25MB (OpenAI limit)
- AAC files work best with optional converter service
- Internet connection required for transcription
- API rate limits apply based on your OpenAI tier

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenAI for Whisper and GPT APIs
- Logseq team for the excellent plugin system
- Community contributors and testers

## 📮 Support

For issues or feature requests, please open an issue on GitHub.

---

**Note**: This is a standalone version of VoiceFlow Automate. If you're upgrading from v1.0, you can safely uninstall the GPT3-OpenAI plugin dependency after migrating your settings.