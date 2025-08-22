# VoiceFlow Automate v2.0

A powerful Logseq plugin that transcribes voice notes and automatically creates tasks in Todoist using OpenAI's Whisper and GPT models.

## 🎙️ Important: AAC Audio Support

**⚠️ Mobile Users:** Logseq's mobile app records audio in AAC format by default. Since OpenAI's Whisper API doesn't support AAC files directly, you'll need to run the **Audio Converter Server** to process these files.

### Audio Converter Server Setup

The [logseq-audio-converter-server](https://github.com/GonzRon/logseq-audio-converter-server) provides automatic AAC to M4A conversion for mobile recordings.

#### Quick Setup:
1. **Install Prerequisites:**
   - Python 3.8+
   - FFmpeg ([Download](https://ffmpeg.org/download.html))

2. **Clone and Install:**
   ```bash
   git clone https://github.com/GonzRon/logseq-audio-converter-server
   cd logseq-audio-converter-server
   pip install -r requirements.txt
   ```

3. **Run the Server:**
   ```bash
   python aac_converter_server.py
   ```
   The server runs on `http://127.0.0.1:3456` by default.

4. **Configure in VoiceFlow Settings:**
   - AAC Converter Host: `127.0.0.1`
   - AAC Converter Port: `3456`

**Note:** Desktop users recording in MP3/M4A/WAV formats don't need the converter server.

## ✨ Key Features

- **Voice Transcription**: Convert audio files to text using OpenAI's Whisper API
- **AI Summarization**: Generate intelligent summaries and extract actionable tasks
- **Direct Todoist Integration**: Create tasks without external dependencies
- **Smart Tag Detection**: Automatically trigger actions using spoken hashtags
- **Hierarchical Tasks**: Create master tasks with subtasks for complex projects
- **Due Date Recognition**: Natural language processing for deadlines
- **Mobile Support**: Full AAC audio support with converter server

## 🚀 Quick Start

### 1. Installation

1. Download the plugin from the Logseq marketplace (or clone from GitHub)
2. Enable the plugin in Logseq settings

### 2. Configuration

#### Required: OpenAI Setup
1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Open plugin settings in Logseq (⚙️ → Plugins → VoiceFlow Automate)
3. Enter your OpenAI API key
4. Select your preferred model (GPT-4o recommended)
5. Test the connection

#### Optional: Todoist Integration
1. Get your API token from [Todoist Settings](https://todoist.com/app/settings/integrations/developer)
2. Enter the token in plugin settings
3. Test the connection
4. Configure project mappings (optional)

#### For Mobile Users: Audio Converter
1. Follow the [Audio Converter Server Setup](#audio-converter-server-setup) above
2. Configure converter settings in plugin
3. Test with a sample AAC recording

### 3. Basic Usage

1. **Record Audio:**
   - **Mobile**: Use Logseq's built-in recorder (creates AAC files)
   - **Desktop**: Use any audio recorder plugin (MP3/M4A/WAV)

2. **Process Voice Note:**
   - Place cursor on the block with audio file
   - Use slash command `/voiceflow` or keyboard shortcut `Cmd/Ctrl+Shift+V`

3. **Automatic Processing:**
   - Transcribes the audio
   - Creates AI summary (if enabled)
   - Extracts and creates tasks in Todoist (if #todo spoken)
   - Generates a new Logseq page with everything

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
"Plan the office party: book venue, order catering, send invitations, 
arrange decorations, hashtag todo hashtag ai hashtag work"
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

Map spoken hashtags to Todoist projects in the UI:

1. Click "Load Projects for Mapping" button
2. Edit the generated JSON to customize tags:

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

### Audio File Issues

#### AAC Files (Mobile)
- Ensure Audio Converter Server is running
- Check converter host/port settings match server
- Verify FFmpeg is installed correctly
- Server logs: Check `aac_converter.log`

#### Supported Formats
- **With Converter**: AAC, MP3, M4A, WAV, WebM
- **Without Converter**: MP3, M4A, WAV, WebM (no AAC)

### Todoist Tasks Not Created
1. Verify API token is correct
2. Test connection in settings
3. Check project mappings are valid
4. Ensure you spoke a trigger tag (#todo)
5. Check browser console for errors

### OpenAI Errors
- **401**: Invalid API key
- **429**: Rate limit or quota exceeded
- **400**: Check audio file format
- **Network Error**: Check internet connection

### Converter Server Issues
- **Connection Refused**: Start the converter server
- **Port Already in Use**: Change port in both server and plugin settings
- **FFmpeg Not Found**: Install FFmpeg and check PATH

## 📝 Workflow Tips

### Mobile Workflow
1. Record voice note in Logseq mobile
2. Ensure converter server is running on your computer
3. Sync to desktop
4. Process with VoiceFlow

### Desktop Workflow
1. Record with audio plugin (MP3/M4A format)
2. Process immediately with VoiceFlow
3. No converter needed for non-AAC files

### Best Practices
- **Quick Capture**: Record → Add `#todo` → Auto-process
- **Batch Processing**: Record multiple items → Use AI mode for smart extraction
- **Project Organization**: Set up project mappings for automatic routing
- **Meeting Notes**: Record meeting → AI summarizes → Tasks created automatically

## 🆕 What's New in v2.0

- **Direct Todoist Integration**: No external plugins required
- **Enhanced Tag Detection**: Better recognition of spoken hashtags
- **Hierarchical Task Support**: Create structured task lists
- **Due Date Recognition**: Natural language date parsing
- **AAC Support**: Full mobile audio support with converter server
- **Improved AI Processing**: Better task extraction with GPT-4

## 📊 Performance Notes

- **Transcription Speed**: 10-30 seconds for typical voice notes
- **AAC Conversion**: 1-3 seconds via converter server
- **AI Processing**: 2-5 seconds for summary and task extraction
- **File Size Limits**: 25MB for audio files (configurable in converter)

## 🔒 Privacy & Security

- **Local Processing**: AAC conversion happens on your machine
- **API Security**: Keys stored locally in Logseq settings
- **No Data Storage**: Converter server doesn't store files
- **Temporary Files**: Auto-cleaned after processing

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please submit issues and pull requests on GitHub.

### Related Projects
- [logseq-audio-converter-server](https://github.com/GonzRon/logseq-audio-converter-server) - AAC conversion service
- [Logseq](https://logseq.com) - Privacy-first knowledge base

## 🙏 Credits

- OpenAI for Whisper and GPT APIs
- Todoist for their excellent API
- FFmpeg for audio conversion capabilities
- Logseq community for feedback and support

## 📞 Support

For issues:
1. **Plugin Issues**: Open issue on GitHub
2. **Converter Issues**: Check [converter repo](https://github.com/GonzRon/logseq-audio-converter-server)
3. **API Issues**: Check OpenAI/Todoist documentation

### Debug Mode
Enable Debug Mode in settings for detailed logging in browser console (`Ctrl+Shift+I`).