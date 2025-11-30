"""
Tag management routes for Justice Companion.
Migrated from electron/ipc-handlers/tags.ts

REFACTORED: Now uses TagService instead of direct database queries.

Routes:
- POST /tags - Create new tag
- GET /tags - List all tags for authenticated user
- GET /tags/search - Search cases by tags (AND/OR logic)
- GET /tags/{tag_id} - Get specific tag by ID
- PUT /tags/{tag_id} - Update tag
- DELETE /tags/{tag_id} - Delete tag
- POST /tags/{tag_id}/cases/{case_id} - Attach tag to case
- DELETE /tags/{tag_id}/cases/{case_id} - Remove tag from case
- GET /tags/{tag_id}/cases - List all cases with this tag
- GET /tags/cases/{case_id}/tags - List all tags for a case
- GET /tags/statistics - Get tag usage statistics

Service Layer Integration:
- TagService for all CRUD operations
- AuditLogger for comprehensive audit trails
- Dependency injection for clean architecture
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from backend.models.base import get_db
from backend.models.tag import Tag
from backend.routes.auth import get_current_user
from backend.services.tag_service import (
    TagService,
    CreateTagInput,
    UpdateTagInput,
)

# Import centralized dependencies
from backend.dependencies import (
    get_auth_service,
    get_tag_service,
)

# Import schemas from consolidated schema file
from backend.schemas.tag import (
    CreateTagRequest,
    UpdateTagRequest,
    SearchCasesByTagsRequest,
    TagResponse,
    CaseTagResponse,
    DeleteTagResponse,
    TagStatisticsResponse,
    SearchCasesByTagsResponse,
)

router = APIRouter(prefix="/tags", tags=["tags"])

def get_client_info(request: Request) -> tuple[Optional[str], Optional[str]]:
    """Extract client IP address and user agent from request."""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")
    return ip_address, user_agent

# ===== HELPER FUNCTIONS =====
def tag_to_response(tag: Tag) -> TagResponse:
    """Convert Tag model to TagResponse."""
    return TagResponse(
        id=tag.id,
        userId=tag.user_id,
        name=tag.name,
        color=tag.color,
        description=tag.description,
        usageCount=getattr(tag, "usage_count", 0),
        createdAt=tag.created_at.isoformat() if tag.created_at else None,
        updatedAt=tag.updated_at.isoformat() if tag.updated_at else None,
    )

# ===== ROUTES =====
@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    request: Request,
    tag_request: CreateTagRequest,
    user_id: int = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service),
):
    """
    Create a new tag.

    Requires authentication via session_id header.
    Tag names must be unique per user.

    **Service Layer:** Uses TagService.create_tag()
    """
    ip_address, user_agent = get_client_info(request)

    # Convert request to service input
    input_data = CreateTagInput(
        name=tag_request.name, color=tag_request.color, description=tag_request.description
    )

    # Create tag via service layer
    tag = tag_service.create_tag(
        user_id=user_id, input_data=input_data, ip_address=ip_address, user_agent=user_agent
    )

    return tag_to_response(tag)

@router.get("", response_model=List[TagResponse])
async def list_tags(
    user_id: int = Depends(get_current_user), tag_service: TagService = Depends(get_tag_service)
):
    """
    List all tags for the authenticated user.

    Returns tags with usage count (number of cases tagged).
    Ordered by name alphabetically.

    **Service Layer:** Uses TagService.get_tags()
    """
    tags = tag_service.get_tags(user_id=user_id, include_usage_count=True)
    return [tag_to_response(tag) for tag in tags]

@router.get("/search", response_model=SearchCasesByTagsResponse)
async def search_cases_by_tags(
    tag_ids: str = Query(..., description="Comma-separated list of tag IDs (e.g., '1,2,3')"),
    match_all: bool = Query(
        True, description="If true, cases must have ALL tags (AND). If false, ANY tag (OR)."
    ),
    user_id: int = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service),
):
    """
    Search cases by tags with AND or OR logic.

    **Query Parameters:**
    - `tag_ids`: Comma-separated tag IDs (e.g., "1,2,3")
    - `match_all`:
      - `true` (default): Cases must have ALL tags (AND logic)
      - `false`: Cases must have ANY tag (OR logic)

    **Examples:**
    - `/tags/search?tag_ids=1,2&match_all=true` → Cases with BOTH tag 1 AND tag 2
    - `/tags/search?tag_ids=1,2&match_all=false` → Cases with tag 1 OR tag 2

    **Service Layer:** Uses TagService.search_cases_by_tags()
    """
    try:
        # Parse tag_ids from comma-separated string
        tag_id_list = [int(tid.strip()) for tid in tag_ids.split(",") if tid.strip()]

        if not tag_id_list:
            raise HTTPException(status_code=400, detail="At least one tag ID is required")

        # Search via service layer
        case_ids = tag_service.search_cases_by_tags(
            user_id=user_id, tag_ids=tag_id_list, match_all=match_all
        )

        return SearchCasesByTagsResponse(
            caseIds=case_ids, matchAll=match_all, tagIds=tag_id_list, resultCount=len(case_ids)
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid tag_ids format: {str(e)}")

@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: int,
    user_id: int = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service),
):
    """
    Get a specific tag by ID.

    Only returns tag if it belongs to the authenticated user.

    **Service Layer:** Uses TagService.get_tag_by_id()
    """
    tag = tag_service.get_tag_by_id(tag_id=tag_id, user_id=user_id, include_usage_count=True)

    if not tag:
        raise HTTPException(
            status_code=404, detail=f"Tag with ID {tag_id} not found or unauthorized"
        )

    return tag_to_response(tag)

@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    request: Request,
    tag_id: int,
    tag_request: UpdateTagRequest,
    user_id: int = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service),
):
    """
    Update an existing tag.

    Only updates fields provided in the request body.
    Only allows updating tags owned by the authenticated user.

    **Service Layer:** Uses TagService.update_tag()
    """
    ip_address, user_agent = get_client_info(request)

    # Ensure at least one field is provided
    if tag_request.name is None and tag_request.color is None and tag_request.description is None:
        raise HTTPException(
            status_code=400, detail="At least one field must be provided for update"
        )

    # Convert request to service input
    input_data = UpdateTagInput(
        name=tag_request.name, color=tag_request.color, description=tag_request.description
    )

    # Update tag via service layer
    tag = tag_service.update_tag(
        tag_id=tag_id,
        user_id=user_id,
        input_data=input_data,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return tag_to_response(tag)

@router.delete("/{tag_id}", response_model=DeleteTagResponse, status_code=status.HTTP_200_OK)
async def delete_tag(
    request: Request,
    tag_id: int,
    user_id: int = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service),
):
    """
    Delete a tag.

    Only allows deleting tags owned by the authenticated user.
    SQLite will cascade deletion to case_tags via foreign key.

    **Service Layer:** Uses TagService.delete_tag()
    """
    ip_address, user_agent = get_client_info(request)

    # Delete tag via service layer
    tag_service.delete_tag(
        tag_id=tag_id, user_id=user_id, ip_address=ip_address, user_agent=user_agent
    )

    return DeleteTagResponse(deleted=True, id=tag_id)

@router.post("/{tag_id}/cases/{case_id}", status_code=status.HTTP_201_CREATED)
async def attach_tag_to_case(
    request: Request,
    tag_id: int,
    case_id: int,
    user_id: int = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service),
):
    """
    Attach a tag to a case.

    Validates that both the tag and case belong to the authenticated user.
    Idempotent: returns success if tag is already attached.

    **Service Layer:** Uses TagService.attach_tag_to_case()
    """
    ip_address, user_agent = get_client_info(request)

    # Attach tag via service layer
    was_attached = tag_service.attach_tag_to_case(
        tag_id=tag_id,
        case_id=case_id,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return {
        "success": True,
        "message": (
            "Tag attached to case successfully" if was_attached else "Tag already attached to case"
        ),
        "caseId": case_id,
        "tagId": tag_id,
        "wasAttached": was_attached,
    }

@router.delete("/{tag_id}/cases/{case_id}", status_code=status.HTTP_200_OK)
async def remove_tag_from_case(
    request: Request,
    tag_id: int,
    case_id: int,
    user_id: int = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service),
):
    """
    Remove a tag from a case.

    Validates that both the tag and case belong to the authenticated user.
    Idempotent: returns success even if tag was not attached.

    **Service Layer:** Uses TagService.remove_tag_from_case()
    """
    ip_address, user_agent = get_client_info(request)

    # Remove tag via service layer
    was_removed = tag_service.remove_tag_from_case(
        tag_id=tag_id,
        case_id=case_id,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return {
        "success": True,
        "message": (
            "Tag removed from case successfully" if was_removed else "Tag was not attached to case"
        ),
        "caseId": case_id,
        "tagId": tag_id,
        "removed": was_removed,
    }

@router.get("/{tag_id}/cases")
async def list_cases_with_tag(
    tag_id: int,
    user_id: int = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service),
    db: Session = Depends(get_db),
):
    """
    List all cases that have a specific tag.

    Only returns cases owned by the authenticated user.

    **Service Layer:** Uses TagService.get_cases_by_tag()

    **Note:** Returns full case objects (requires case data from database).
    This endpoint is a hybrid - uses TagService for tag verification and case IDs,
    then queries database for case details.
    """
    from sqlalchemy import text

    # Get case IDs via service layer
    case_ids = tag_service.get_cases_by_tag(tag_id=tag_id, user_id=user_id)

    if not case_ids:
        return []

    # Query case details from database
    placeholders = ",".join([f":id_{i}" for i in range(len(case_ids))])
    query = text(
        f"""
        SELECT
            c.id,
            c.title,
            c.description,
            c.case_type as caseType,
            c.status,
            c.user_id as userId,
            c.case_number as caseNumber,
            c.court_name as courtName,
            c.judge,
            c.opposing_party as opposingParty,
            c.opposing_counsel as opposingCounsel,
            c.next_hearing_date as nextHearingDate,
            c.filing_deadline as filingDeadline,
            c.created_at as createdAt,
            c.updated_at as updatedAt
        FROM cases c
        WHERE c.id IN ({placeholders}) AND c.user_id = :user_id
        ORDER BY c.updated_at DESC
    """
    )

    params = {f"id_{i}": case_id for i, case_id in enumerate(case_ids)}
    params["user_id"] = user_id

    cases = db.execute(query, params).fetchall()

    # Convert to list of dicts
    result = []
    for case in cases:
        case_dict = dict(case._mapping)
        case_dict["createdAt"] = (
            case_dict["createdAt"].isoformat() if case_dict.get("createdAt") else None
        )
        case_dict["updatedAt"] = (
            case_dict["updatedAt"].isoformat() if case_dict.get("updatedAt") else None
        )
        result.append(case_dict)

    return result

@router.get("/cases/{case_id}/tags", response_model=List[TagResponse])
async def list_tags_for_case(
    case_id: int,
    user_id: int = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service),
    db: Session = Depends(get_db),
):
    """
    List all tags for a specific case.

    Only returns tags for cases owned by the authenticated user.

    **Service Layer:** Uses TagService.get_case_tags()
    """
    # Verify user owns the case
    from sqlalchemy import text

    case_check = text("SELECT id FROM cases WHERE id = :case_id AND user_id = :user_id")
    case_exists = db.execute(case_check, {"case_id": case_id, "user_id": user_id}).fetchone()

    if not case_exists:
        raise HTTPException(status_code=404, detail=f"Case with ID {case_id} not found")

    # Get tags via service layer
    tags = tag_service.get_case_tags(case_id=case_id, user_id=user_id)

    return [tag_to_response(tag) for tag in tags]

@router.get("/statistics", response_model=TagStatisticsResponse)
async def get_tag_statistics(
    user_id: int = Depends(get_current_user), tag_service: TagService = Depends(get_tag_service)
):
    """
    Get tag usage statistics for the authenticated user.

    Returns:
    - Total number of tags
    - Number of tags with at least one case
    - Most used tags (top 5)
    - Unused tags

    **Service Layer:** Uses TagService.get_tag_statistics()
    """
    # Get statistics from service
    stats = tag_service.get_tag_statistics(user_id=user_id)

    # Convert most_used_tag to dict format for response
    most_used_tags = []
    if stats.most_used_tag:
        most_used_tags.append(
            {
                "id": stats.most_used_tag.id,
                "name": stats.most_used_tag.name,
                "color": stats.most_used_tag.color,
                "usageCount": stats.most_used_tag.usage_count,
            }
        )

    # Get all tags to build unused_tags list
    all_tags = tag_service.get_tags(user_id=user_id, include_usage_count=True)
    unused_tags = [
        {"id": tag.id, "name": tag.name, "color": tag.color}
        for tag in all_tags
        if getattr(tag, "usage_count", 0) == 0
    ]

    return TagStatisticsResponse(
        totalTags=stats.total_tags,
        tagsWithCases=stats.total_tagged_cases,
        mostUsedTags=most_used_tags,
        unusedTags=unused_tags,
    )
