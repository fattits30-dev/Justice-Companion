"""
Request Models

Pydantic models for AI agent requests.
All models use Pydantic v2 with strict validation.

Author: Justice Companion Team
License: MIT
"""

from typing import Optional
from pydantic import BaseModel, Field, field_validator


class ParsedDocument(BaseModel):
    """
    Parsed document data from DocumentParserService.

    Fields:
        filename: Original filename
        text: Extracted text content
        wordCount: Number of words in document
        fileType: File extension (e.g., 'pd', 'docx', 'txt')
    """

    filename: str = Field(..., min_length=1, description="Original filename")
    text: str = Field(..., min_length=1, description="Extracted text content")
    wordCount: int = Field(..., ge=0, description="Number of words in document")
    fileType: str = Field(..., min_length=1, description="File extension")

    @field_validator("text")
    @classmethod
    def validate_text_not_empty(cls, v: str) -> str:
        """Ensure text content is not just whitespace"""
        if not v.strip():
            raise ValueError("Document text cannot be empty or whitespace only")
        return v


class UserProfile(BaseModel):
    """
    User profile information.

    Fields:
        name: User's full name
        email: User's email address (optional)
    """

    name: str = Field(..., min_length=1, description="User's full name")
    email: Optional[str] = Field(None, description="User's email address")


class DocumentAnalysisRequest(BaseModel):
    """
    Request for document analysis.

    This is the main request model for the document analysis endpoint.
    It contains the parsed document, user profile, and optional user question.

    Fields:
        document: Parsed document data
        userProfile: User profile information
        sessionId: Unique session identifier (UUID)
        userQuestion: Optional question from user about the document
    """

    document: ParsedDocument = Field(..., description="Parsed document data")
    userProfile: UserProfile = Field(..., description="User profile information")
    sessionId: str = Field(..., min_length=1, description="Session UUID")
    userQuestion: Optional[str] = Field(None, description="Optional user question")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "document": {
                        "filename": "employment-tribunal-claim.pdf",
                        "text": "EMPLOYMENT TRIBUNAL CLAIM FORM...",
                        "wordCount": 1234,
                        "fileType": "pdf",
                    },
                    "userProfile": {"name": "John Doe", "email": "john@example.com"},
                    "sessionId": "123e4567-e89b-12d3-a456-426614174000",
                    "userQuestion": "What is the filing deadline?",
                }
            ]
        }
    }
