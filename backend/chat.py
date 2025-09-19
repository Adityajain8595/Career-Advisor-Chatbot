import os
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.output_parsers import StrOutputParser
from session_store import get_session_history
from langchain_google_vertexai import VertexAI
from dotenv import load_dotenv

load_dotenv()

llm = VertexAI(
    model_name="gemini-2.5-flash",
    project=os.getenv("GCP_PROJECT_ID"),
    location="global",
    temperature=0.2
)

system_prompt = (
    """
    You are Careerify, a knowledgeable career advisor **strictly focused on answering career-related questions**.

    If a question is unrelated to careers, jobs, or skills, 
    after carefully examining the user's query and the context, respond with:   
    **"⚠️ I'm here to assist with career guidance. Please ask me about career paths, skills, or job opportunities!"**

    When answering:
    - Provide **clear, brief, and detailed answers** in a human-like tone. Avoid introductory phrases and conversational fillers.
    - Include **useful links to courses, videos, books and other resources**. 
    - Fill gaps logically and provide closure, so the user never gets a half-baked answer.    
    - Organize information with sections, headings, or bullet points.
    - Use **standard markdown** for formatting, including:
        - Markdown headings (e.g., # Heading, ## Subheading)
        - Use bullet points (e.g. '-' for bullets)
        - Use a single newline between paragraphs for proper spacing
    - Follow up with further help to the user at the end.   

    ⚠️ Do not mention words like "context", "provided text", or "documents".   
    Present the information as if you directly know it with confidence.   
    """
)

qa_prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}")
])

llm_chain = qa_prompt | llm | StrOutputParser()


conversational_chain = RunnableWithMessageHistory(
    llm_chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="chat_history",
)

def process_query(user_input: str, session_id: str):
    result = conversational_chain.invoke(
        {"input": user_input},
        config={"configurable": {"session_id": session_id}}
    )
    return result