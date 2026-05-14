"""Modelli Pydantic per chat, RAG, mappe concettuali e voce."""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from uuid import UUID


# Chat
class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    user_id:  Optional[UUID] = None
    chat_id:  Optional[UUID] = None
    messages: List[ChatMessage]
    model:    Optional[str]  = None
    use_rag:  bool           = False
    document_ids: Optional[List[UUID]] = None


class ChatResponse(BaseModel):
    chat_id: UUID
    message: ChatMessage
    sources: List[dict] = Field(default_factory=list)


# RAG
class RagQueryRequest(BaseModel):
    user_id:      Optional[UUID]      = None
    query:        str
    top_k:        int                 = 5
    document_ids: Optional[List[UUID]] = None
    model:        Optional[str]       = None


class RagSource(BaseModel):
    document_id: UUID
    chunk_id:    UUID
    page:        Optional[int] = None
    similarity:  float
    content:     str


class RagQueryResponse(BaseModel):
    answer:  str
    sources: List[RagSource]


# Mappa concettuale
class ConceptMapRequest(BaseModel):
    user_id:       Optional[UUID] = None
    title:         Optional[str]  = None
    text:          Optional[str]  = None
    document_id:   Optional[UUID] = None
    max_concepts:  int            = 12
    model:         Optional[str]  = None


class ConceptNode(BaseModel):
    id:    str
    label: str
    type:  Optional[str] = "concept"


class ConceptEdge(BaseModel):
    source: str
    target: str
    label:  Optional[str] = None


class ConceptMapResponse(BaseModel):
    map_id: Optional[UUID] = None
    title:  str
    nodes:  List[ConceptNode]
    edges:  List[ConceptEdge]


# Voce
class TTSRequest(BaseModel):
    text: str
    lang: str = "it"


# Suggerimenti
class WorkloadDay(BaseModel):
    day: str
    homework: int = 0
    exams: int = 0
    interrogations: int = 0


class SuggestExamRequest(BaseModel):
    workload: List[WorkloadDay]


class SuggestExamResponse(BaseModel):
    best_day: str
    score: float
    reasoning: str
    ranking: List[dict]
