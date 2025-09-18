from dotenv import load_dotenv
from google.cloud import texttospeech
load_dotenv()

def text_to_speech(text: str, lang: str = "en", voice: str = "female") -> bytes:
    
    if not text.strip():
        return b""

    client = texttospeech.TextToSpeechClient()

    synthesis_input = texttospeech.SynthesisInput(text=text)

    voice_params = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        ssml_gender=texttospeech.SsmlVoiceGender.FEMALE if voice.lower() == "female" else texttospeech.SsmlVoiceGender.MALE
    )

    audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)

    response = client.synthesize_speech(
        input=synthesis_input, voice=voice_params, audio_config=audio_config
    )

    return response.audio_content
