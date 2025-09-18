from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from talk import text_to_speech
from fastapi.responses import Response
from chat import process_query
from session_store import get_session_history

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def root():
    return {"message": "Careerist Chatbot Backend Running"}

@app.get("/history")
def get_history(session_id: str = "default_session"):
    chat = get_session_history(session_id)
    if chat is None:
        return {"chat_history": []}
    return {"chat_history": [{"role": m.type, "content": m.content} for m in chat.messages]}

@app.post("/ask")
async def ask_question(query: str = Form(...), session_id: str = Form(default="default_session")):
    answer = process_query(query, session_id)
    history = []
    st = get_session_history(session_id)
    if st:
        history = [{"role": msg.type, "content": msg.content} for msg in st.messages]
    return {"answer": answer, "chat_history": history}

@app.post("/tts")
async def tts_endpoint(text: str = Form(...), lang: str = Form("en"), voice: str = Form("male")):
    audio_bytes = text_to_speech(text, lang, voice)
    return Response(content=audio_bytes, media_type="audio/mpeg")