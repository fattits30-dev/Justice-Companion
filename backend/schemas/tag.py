"""
Tag schemas - Pydantic models for tag API operations.

Single source of truth for tag-related request and response types.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ===== REQUEST SCHEMAS =====


class TagCreate(BaseModel):
    """Request model for creating a new tag."""

    name: str = Field(..., min_length=1, max_length=50, description="Tag name")
    color: str = Field(
        ..., pattern=r"^#[0-9A-Fa-f]{6}$", description="Hex color code (e.g., #FF0000)"
    )
    description: Optional[str] = Field(None, max_length=200, description="Optional tag description")

    @field_validator("name")
    @classmethod
    def strip_and_validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Tag name cannot be empty")
        return v

    @field_validator("color")
    @classmethod
    def validate_hex_color(cls, v: str) -> str:
        if not v or len(v) != 7 or not v.startswith("#"):
            raise ValueError("Valid hex color is required (e.g., #FF0000)")
        return v.upper()


class TagUpdate(BaseModel):
    """Request model for updating an existing tag."""

    name: Optional[str] = Field(None, min_length=1, max_length=50)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    description: Optional[str] = Field(None, max_length=200)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v = v.strip()
            if not v:
                raise ValueError("Tag name cannot be empty")
        return v

    @field_validator("color")
    @classmethod
    def validate_hex_color(cls, v: Optional[str]) -> Optional[str]:
        if v and (len(v) != 7 or not v.startswith("#")):
            raise ValueError("Valid hex color is required (e.g., #FF0000)")
        return v.upper() if v else None


class SearchCasesByTagsRequest(BaseModel):
    """Request model for searching cases by tags."""

    tag_ids: List[int] = Field(..., min_length=1, description="List of tag IDs to search for")
    match_all: bool = Field(
        True,
        description="If true, cases must have ALL tags (AND logic). If false, cases must have ANY tag (OR logic).",
    )


# ===== RESPONSE SCHEMAS =====


class TagResponse(BaseModel):
    """Response model for tag data."""

    id: int
    userId: int
    name: str
    color: str
    description: Optional[str] = None
    usageCount: Optional[int] = None
    createdAt: str
    updatedAt: str

    model_config = ConfigDict(from_attributes=True)


class CaseTagResponse(BaseModel):
    """Response model for case-tag association."""

    caseId: int
    tagId: int
    createdAt: str

    model_config = ConfigDict(from_attributes=True)


class TagDeleteResponse(BaseModel):
    """Response model for tag deletion."""

    deleted: bool
    id: int


class TagStatisticsResponse(BaseModel):
    """Response model for tag statistics."""

    totalTags: int
    tagsWithCases: int
    mostUsedTags: List[Dict[str, Any]]
    unusedTags: List[Dict[str, Any]]


class SearchCasesByTagsResponse(BaseModel):
    """Response model for tag search results."""

    caseIds: List[int]
    matchAll: bool
    tagIds: List[int]
    resultCount: int


# ===== ALIASES FOR BACKWARDS COMPATIBILITY =====
# These will be removed once all routes are updated
CreateTagRequest = TagCreate
UpdateTagRequest = TagUpdate
DeleteTagResponse = TagDeleteResponse
