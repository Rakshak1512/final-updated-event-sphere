from typing import List, Optional, Dict
from pydantic import BaseModel
from fastapi import APIRouter, Depends, status

from app.dependencies import get_current_user_optional
from app.models.user import User
from app.services.chatbot_service import get_chatbot_response

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    reply: str
    suggestions: List[str] = []


@router.post("/ask", response_model=ChatResponse)
def ask_chatbot(
    payload: ChatRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    history_dicts = [{"role": m.role, "content": m.content} for m in payload.history] if payload.history else []
    result = get_chatbot_response(current_user, payload.message, history_dicts)
    return ChatResponse(
        reply=result["reply"],
        suggestions=result.get("suggestions", []),
    )
