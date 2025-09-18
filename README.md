# LearnGenie AI Tutor 🗣️✨

A real-time AI voice tutor for kids, built with Next.js and Google's AI stack. LearnGenie offers a playful, gamified English learning experience through voice-based conversations and interactive roleplay scenarios. Children can practice real-life dialogues while receiving smart feedback and multilingual playback support.

## 🎬 Demo Video
[Click here to watch the demo](https://drive.google.com/file/d/1s40GtpLyOe0F8vAeMe_eBqCS0vjkfEel/view?usp=sharing)

## ✨ Features

- 🤖 **AI Free Chat** - Have a natural, voice-based conversation with a friendly AI tutor
- 🎭 **Interactive Roleplay** - Practice real-life scenarios like being at school or in a store
- 🎤 **Voice Activity Detection (VAD)** - Automatically stops recording when you finish speaking
- 🌐 **Multilingual Voice Playback** - Listen to the AI's responses in multiple languages, including English, Hindi, Marathi, Gujarati, and Tamil
- 🎨 **Kid-Friendly UI/UX** - A vibrant, attractive, and engaging interface designed for children aged 6-16
- 🚀 **Real-time & Responsive** - Get instant voice responses in a fully responsive design that works on any device

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router with TypeScript)
- **React.js** for building the user interface
- **Tailwind CSS** for modern, utility-first styling
- **Web Audio API** for in-browser audio recording and analysis

### Backend
- **Next.js API Routes** (Serverless Functions)
- **Google Cloud Speech-to-Text** for voice transcription
- **Google Cloud Text-to-Speech** for generating AI voice
- **Google Cloud Translate API** for multilingual support
- **Google Gemini API** (gemini-1.5-flash) for generating intelligent responses

## 🚀 Setup and Installation

### Prerequisites
- Node.js (v18 or later)
- Google Cloud Account with a configured project
- Google AI Studio Account for the Gemini API key

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd LearnGenie-ai-tutor
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Get API Keys & Credentials

You will need two sets of credentials from Google:

#### A. Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new project and click "Get API key"
3. Copy the generated key

#### B. Google Cloud Service Account (for STT, TTS, Translate)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project
2. Enable the following APIs for your project:
   - Cloud Speech-to-Text API
   - Cloud Text-to-Speech API
   - Cloud Translation API
3. Create a Service Account with the following roles:
   - Cloud Speech-to-Text User
   - Cloud Text-to-Speech User
   - Cloud Translation User
4. Create a JSON key for this service account and download it

### 4. Environment Configuration
1. Move the downloaded JSON key file to the root of your project and rename it to `google_credentials.json`
2. Create a file named `.env.local` in the root of the project
3. Add your credentials to the `.env.local` file:

```env
# Get this key from Google AI Studio
GEMINI_API_KEY="your_gemini_api_key_here"
```

### 5. Start the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 📁 Project Structure

```
LearnGenie-ai-tutor/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts        # Main backend API logic
│   ├── components/
│   │   └── shared/
│   │       └── chat-window.tsx # The core frontend UI and logic
│   ├── lib/
│   │   └── scenarios.ts        # Roleplay scenario scripts
│   ├── globals.css             # Global and Tailwind CSS styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page
├── public/                     # Static assets
├── .env.local                  # Environment variables (create manually)
├── google_credentials.json     # Google Cloud credentials (add manually)
├── next.config.ts              # Next.js configuration
├── package.json                # Node.js dependencies
└── tailwind.config.js          # Tailwind CSS configuration
```

## 🎮 How to Use

### Free Chat Mode
1. Select your preferred language from the dropdown
2. Click the magic microphone button
3. Start speaking - the app will automatically detect when you stop
4. Listen to the AI's response and continue the conversation

### Roleplay Mode
1. Click the "🎭 Roleplay" button to enter roleplay mode
2. Choose from available scenarios:
   - 🏫 **At School** - Practice talking with teachers and classmates
   - 🛒 **At the Store** - Learn to shop and ask for things you need
   - 🏠 **At Home** - Talk about family and daily activities
   - 🎮 **At the Playground** - Make friends and talk about games
3. Follow the scenario prompts and practice natural conversations
4. Click "🏠 Exit Roleplay" to return to free chat mode

## 🌍 Supported Languages

- 🇺🇸 English (en-US)
- 🇮🇳 Hindi (hi-IN)
- 🇮🇳 Marathi (mr-IN)
- 🇮🇳 Gujarati (gu-IN)
- 🇮🇳 Tamil (ta-IN)


### Google Cloud Credentials
Place your Google Cloud service account JSON file as `google_credentials.json` in the root directory.

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Add your environment variables in the Vercel dashboard
3. Upload your `google_credentials.json` file or set up Google Cloud credentials as environment variables
4. Deploy!

### Other Platforms
This is a standard Next.js application and can be deployed to any platform that supports Node.js applications.

---

Made with ❤️ for children's education and language learning
