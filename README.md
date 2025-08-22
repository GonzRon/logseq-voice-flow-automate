# VoiceFlow Automate v2.0 - Standalone Edition

A powerful Logseq plugin that transcribes voice notes and automatically creates tasks in Todoist using OpenAI's Whisper and GPT models.

## ✨ Key Features

- **Voice Transcription**: Convert audio files to text using OpenAI's Whisper API
- **AI Summarization**: Generate intelligent summaries and extract actionable tasks
- **Direct Todoist Integration**: Create tasks without external dependencies
- **Smart Tag Detection**: Automatically trigger actions using spoken hashtags
- **Hierarchical Tasks**: Create master tasks with subtasks for complex projects
- **Due Date Recognition**: Natural language processing for deadlines

## 🚀 Quick Start

### 1. Installation

1. Download the plugin from the Logseq marketplace
2. Enable the plugin in Logseq settings

### 2. Configuration

#### Required: OpenAI Setup
1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Open plugin settings in Logseq
3. Enter your OpenAI API key
4. Test the connection

#### Optional: Todoist Integration
1. Get your API token from [Todoist Settings](https://todoist.com/app/settings/integrations/developer)
2. Enter the token in plugin settings
3. Test the connection
4. Configure project mappings (optional)

### 3. Basic Usage

1. Record audio in Logseq (using audio recorder plugin or mobile app)
2. Place cursor on the block with the audio file
3. Use slash command `/voiceflow` or keyboard shortcut `Cmd/Ctrl+Shift+V`
4. The plugin will:
   - Transcribe the audio
   - Create a summary (if AI mode enabled)
   - Create tasks in Todoist (if triggered)
   - Generate a new page with the transcription

## 🎯 Spoken Hashtag Commands

Use these spoken hashtags in your voice notes to trigger actions:

### Todo Creation
- `"hashtag todo"` or `"hashtag task"` - Create task(s) in Todoist
- `"hashtag to-do"` - Alternative spelling supported

### Processing Mode
- `"hashtag ai"` - Use AI summarization (overrides default)
- `"hashtag direct"` or `"hashtag literal"` - Use literal transcription

### Project Routing
- `"hashtag [project-tag]"` - Route to specific Todoist project
- Example: `"hashtag work"` routes to your Work project

### Priority Setting
- `"hashtag urgent"` or `"hashtag high"` - Set priority 4
- `"hashtag medium"` - Set priority 3
- `"hashtag low"` - Set priority 1

### Due Date Setting
- `"due date tomorrow"` - Sets due date to tomorrow
- `"due date next Friday"` - Natural language date parsing
- `"due date January 15th"` - Specific dates supported

## 📋 Examples

### Example 1: Simple Task
```
"Remember to call the dentist tomorrow, hashtag todo"
```
Creates: Single task "call the dentist" with due date tomorrow

### Example 2: AI-Processed Project Tasks
```
"Plan the office party: book venue, order catering, send invitations, arrange decorations, hashtag todo hashtag ai hashtag work"
```
Creates:
- Master task: "Plan Office Party" (in Work project)
- Subtasks: Book venue, Order catering, Send invitations, Arrange decorations

### Example 3: Urgent Task with Due Date
```
"Finish the quarterly report, due date Friday, hashtag todo hashtag urgent"
```
Creates: High-priority task with Friday deadline

## ⚙️ Advanced Configuration

### Project Mappings

Map spoken hashtags to Todoist projects:

```json
{
  "#work": {"id": "2234567890", "name": "Work"},
  "#personal": {"id": "2234567891", "name": "Personal"},
  "#health": {"id": "2234567892", "name": "Health"}
}
```

### Custom AI Prompts

Customize how AI processes your voice notes by configuring custom prompts in settings.

### Transcription Modes

- **Literal**: Exact transcription → single task
- **AI**: Intelligent processing → multiple structured tasks

## 🔧 Troubleshooting

### Audio File Not Found
- Ensure the audio file is properly embedded in the block
- Supported formats: MP3, M4A, WAV, WebM, AAC

### Todoist Tasks Not Created
1. Verify API token is correct
2. Test connection in settings
3. Check project mappings are valid
4. Ensure you spoke a trigger tag (#todo)

### OpenAI Errors
- **401**: Invalid API key
- **429**: Rate limit or quota exceeded
- **400**: Check audio file format

## 📝 Workflow Tips

1. **Quick Capture**: Record → Add `#todo` → Auto-process
2. **Batch Processing**: Record multiple items → Use AI mode for smart task extraction
3. **Project Organization**: Set up project mappings for automatic routing
4. **Meeting Notes**: Record meeting → AI summarizes → Tasks created automatically

## 🆕 What's New in v2.0

- **Standalone Todoist Integration**: No external plugins required
- **Enhanced Tag Detection**: Better recognition of spoken hashtags
- **Hierarchical Task Support**: Create structured task lists
- **Due Date Recognition**: Natural language date parsing
- **Improved AI Processing**: Better task extraction with GPT-4

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please submit issues and pull requests on GitHub.

## 🙏 Credits

- OpenAI for Whisper and GPT APIs
- Todoist for their excellent API
- Logseq community for feedback and support