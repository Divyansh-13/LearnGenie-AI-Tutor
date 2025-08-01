import { NextRequest, NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v2 } from '@google-cloud/translate';

const { Translate } = v2;
const translate = new Translate();
const speechClient = new SpeechClient();
const textToSpeechClient = new TextToSpeechClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const languageCode = formData.get('language') as string || 'en-US';
    const isRoleplay = formData.get('isRoleplay') === 'true';
    const roleplayContext = formData.get('roleplayContext') as string;
    const scenarioTitle = formData.get('scenarioTitle') as string;

    if (!audioFile) {
      return new NextResponse(JSON.stringify({ error: 'No audio file provided.' }), { status: 400 });
    }

    const audioBytes = await audioFile.arrayBuffer();
    const audioBase64 = Buffer.from(audioBytes).toString('base64');

    const [speechResponse] = await speechClient.recognize({
      audio: { content: audioBase64 },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: languageCode,
      },
    });

    const transcribedText = speechResponse.results?.map(result => result.alternatives?.[0].transcript).join('\n');

    if (!transcribedText || transcribedText.trim() === "") {
        return new NextResponse(JSON.stringify({error: "No speech detected"}), {status: 500});
    }

    let prompt: string;
    
    if (isRoleplay && roleplayContext) {
      // Roleplay mode prompt
      prompt = `You are in a roleplay scenario: ${scenarioTitle}. ${roleplayContext}

The student said: "${transcribedText}" in ${languageCode}.

IMPORTANT ROLEPLAY GUIDELINES:
- Stay in character for the scenario
- Keep responses simple and age-appropriate for children
- Ask follow-up questions to continue the conversation
- Use encouraging and positive language
- If the student makes mistakes, gently guide them with examples
- Limit responses to 1-2 sentences
- Use vocabulary appropriate for language learners
- Incorporate scenario-specific words and phrases

Respond naturally in the same language (${languageCode}) as if you are really in this situation with the student.`;
    } else {
      // Regular tutoring mode prompt
      prompt = `You are SpeakGenie, a friendly AI language tutor for children. A child said: "${transcribedText}" in ${languageCode}. 

Your reply should be:
- Simple and encouraging
- In the same language (${languageCode})
- Educational but fun
- 1-2 sentences maximum
- Help them learn while being supportive

Respond naturally and helpfully.`;
    }

    const result = await model.generateContent(prompt);
    const aiResponseText = result.response.text();

    const [ttsResponse] = await textToSpeechClient.synthesizeSpeech({
      input: { text: aiResponseText },
      voice: { languageCode: languageCode, ssmlGender: 'FEMALE' },
      audioConfig: { audioEncoding: 'MP3' },
    });
    
    if (!ttsResponse.audioContent) {
        return new NextResponse(JSON.stringify({ error: 'Could not synthesize speech.' }), { status: 500 });
    }

    const responseData = new FormData();
    responseData.append('audio', new Blob([ttsResponse.audioContent], { type: 'audio/mpeg' }));
    responseData.append('textData', JSON.stringify({ user: transcribedText, ai: aiResponseText }));

    return new NextResponse(responseData);

  } catch (error) {
    console.error("--- CATCH BLOCK ERROR ---", error);
    return new NextResponse(JSON.stringify({ error: 'An internal server error occurred.' }), { status: 500 });
  }
}