"""
Test suite for tag routes with service layer integration.

Tests 11 FastAPI endpoints:
1. POST /tags - Create tag
2. GET /tags - List tags
3. GET /tags/search - Search cases by tags (AND/OR)
4. GET /tags/{tag_id} - Get tag by ID
5. PUT /tags/{tag_id} - Update tag
6. DELETE /tags/{tag_id} - Delete tag
7. POST /tags/{tag_id}/cases/{case_id} - Attach tag to case
8. DELETE /tags/{tag_id}/cases/{case_id} - Remove tag from case
9. GET /tags/{tag_id}/cases - List cases with tag
10. GET /tags/cases/{case_id}/tags - List tags for case
11. GET /tags/statistics - Get tag statistics

Coverage:
- Service layer integration (TagService)
- Audit logging (AuditLogger)
- Authentication and authorization
- Validation and error handling
- AND/OR tag search logic
- Edge cases and idempotency
"""

import pytest
from sqlalchemy import text

# Fixtures are imported from backend/conftest.py:
# - db, client, test_user, auth_headers, test_case, test_tag

def unwrap(response):
    """Extract data from wrapped response {"success": true, "data": ...}."""
    json = response.json()
    if isinstance(json, dict) and "data" in json:
        return json["data"]
    return json

# ===== TEST CASES =====

class TestCreateTag:
    """Test POST /tags - Create tag."""

    def test_create_tag_success(self, client, auth_headers):
        """Test successful tag creation."""
        response = client.post(
            "/tags",
            json={
                "name": "Urgent",
                "color": "#FF0000",
                "description": "High priority cases"
            },
            headers=auth_headers
        )

        assert response.status_code == 201
        data = unwrap(response)
        assert data["name"] == "Urgent"
        assert data["color"] == "#FF0000"
        assert data["description"] == "High priority cases"
        assert data["usageCount"] == 0
        assert "id" in data
        assert "createdAt" in data

    def test_create_tag_duplicate_name(self, client, auth_headers):
        """Test duplicate tag name validation."""
        # Create first tag
        client.post(
            "/tags",
            json={"name": "Urgent", "color": "#FF0000"},
            headers=auth_headers
        )

        # Try to create duplicate
        response = client.post(
            "/tags",
            json={"name": "Urgent", "color": "#00FF00"},
            headers=auth_headers
        )

        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_create_tag_invalid_color(self, client, auth_headers):
        """Test invalid hex color validation."""
        response = client.post(
            "/tags",
            json={"name": "Test", "color": "red"},
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_create_tag_unauthorized(self, client):
        """Test unauthorized access."""
        response = client.post(
            "/tags",
            json={"name": "Test", "color": "#FF0000"}
        )

        assert response.status_code == 401

class TestListTags:
    """Test GET /tags - List tags."""

    def test_list_tags_empty(self, client, auth_headers):
        """Test listing tags when none exist."""
        response = client.get("/tags", headers=auth_headers)

        assert response.status_code == 200
        assert unwrap(response) == []

    def test_list_tags_with_data(self, client, auth_headers):
        """Test listing tags with usage counts."""
        # Create tags
        client.post("/tags", json={"name": "Tag A", "color": "#FF0000"}, headers=auth_headers)
        client.post("/tags", json={"name": "Tag B", "color": "#00FF00"}, headers=auth_headers)

        response = client.get("/tags", headers=auth_headers)

        assert response.status_code == 200
        data = unwrap(response)
        assert len(data) == 2
        assert all("usageCount" in tag for tag in data)
        # Should be ordered alphabetically
        assert data[0]["name"] == "Tag A"
        assert data[1]["name"] == "Tag B"

class TestGetTag:
    """Test GET /tags/{tag_id} - Get tag by ID."""

    def test_get_tag_success(self, client, auth_headers):
        """Test getting tag by ID."""
        # Create tag
        create_response = client.post(
            "/tags",
            json={"name": "Test", "color": "#FF0000"},
            headers=auth_headers
        )
        tag_id = unwrap(create_response)["id"]

        # Get tag
        response = client.get(f"/tags/{tag_id}", headers=auth_headers)

        assert response.status_code == 200
        data = unwrap(response)
        assert data["id"] == tag_id
        assert data["name"] == "Test"

    def test_get_tag_not_found(self, client, auth_headers):
        """Test getting non-existent tag."""
        response = client.get("/tags/99999", headers=auth_headers)

        assert response.status_code == 404

class TestUpdateTag:
    """Test PUT /tags/{tag_id} - Update tag."""

    def test_update_tag_name(self, client, auth_headers):
        """Test updating tag name."""
        # Create tag
        create_response = client.post(
            "/tags",
            json={"name": "Old Name", "color": "#FF0000"},
            headers=auth_headers
        )
        tag_id = unwrap(create_response)["id"]

        # Update tag
        response = client.put(
            f"/tags/{tag_id}",
            json={"name": "New Name"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = unwrap(response)
        assert data["name"] == "New Name"
        assert data["color"] == "#FF0000"  # Unchanged

    def test_update_tag_color(self, client, auth_headers):
        """Test updating tag color."""
        # Create tag
        create_response = client.post(
            "/tags",
            json={"name": "Test", "color": "#FF0000"},
            headers=auth_headers
        )
        tag_id = unwrap(create_response)["id"]

        # Update tag
        response = client.put(
            f"/tags/{tag_id}",
            json={"color": "#00FF00"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = unwrap(response)
        assert data["color"] == "#00FF00"

    def test_update_tag_no_fields(self, client, auth_headers):
        """Test update with no fields provided."""
        # Create tag
        create_response = client.post(
            "/tags",
            json={"name": "Test", "color": "#FF0000"},
            headers=auth_headers
        )
        tag_id = unwrap(create_response)["id"]

        # Try to update with no fields
        response = client.put(
            f"/tags/{tag_id}",
            json={},
            headers=auth_headers
        )

        assert response.status_code == 400

class TestDeleteTag:
    """Test DELETE /tags/{tag_id} - Delete tag."""

    def test_delete_tag_success(self, client, auth_headers):
        """Test successful tag deletion."""
        # Create tag
        create_response = client.post(
            "/tags",
            json={"name": "Test", "color": "#FF0000"},
            headers=auth_headers
        )
        tag_id = unwrap(create_response)["id"]

        # Delete tag
        response = client.delete(f"/tags/{tag_id}", headers=auth_headers)

        assert response.status_code == 200
        data = unwrap(response)
        assert data["deleted"] is True
        assert data["id"] == tag_id

        # Verify tag is deleted
        get_response = client.get(f"/tags/{tag_id}", headers=auth_headers)
        assert get_response.status_code == 404

    def test_delete_tag_not_found(self, client, auth_headers):
        """Test deleting non-existent tag."""
        response = client.delete("/tags/99999", headers=auth_headers)

        assert response.status_code == 404

class TestAttachTagToCase:
    """Test POST /tags/{tag_id}/cases/{case_id} - Attach tag to case."""

    def test_attach_tag_success(self, client, auth_headers, test_case):
        """Test successful tag attachment."""
        # Create tag
        create_response = client.post(
            "/tags",
            json={"name": "Test", "color": "#FF0000"},
            headers=auth_headers
        )
        tag_id = unwrap(create_response)["id"]

        # Attach tag to case
        response = client.post(
            f"/tags/{tag_id}/cases/{test_case.id}",
            headers=auth_headers
        )

        assert response.status_code == 201
        data = unwrap(response)
        assert data["success"] is True
        assert data["caseId"] == test_case.id
        assert data["tagId"] == tag_id
        assert data["wasAttached"] is True

    def test_attach_tag_idempotent(self, client, auth_headers, test_case):
        """Test attaching tag twice is idempotent."""
        # Create tag
        create_response = client.post(
            "/tags",
            json={"name": "Test", "color": "#FF0000"},
            headers=auth_headers
        )
        tag_id = unwrap(create_response)["id"]

        # Attach tag first time
        client.post(f"/tags/{tag_id}/cases/{test_case.id}", headers=auth_headers)

        # Attach tag second time
        response = client.post(
            f"/tags/{tag_id}/cases/{test_case.id}",
            headers=auth_headers
        )

        assert response.status_code == 201
        data = unwrap(response)
        assert data["wasAttached"] is False

class TestRemoveTagFromCase:
    """Test DELETE /tags/{tag_id}/cases/{case_id} - Remove tag from case."""

    def test_remove_tag_success(self, client, auth_headers, test_case):
        """Test successful tag removal."""
        # Create and attach tag
        create_response = client.post(
            "/tags",
            json={"name": "Test", "color": "#FF0000"},
            headers=auth_headers
        )
        tag_id = unwrap(create_response)["id"]
        client.post(f"/tags/{tag_id}/cases/{test_case.id}", headers=auth_headers)

        # Remove tag
        response = client.delete(
            f"/tags/{tag_id}/cases/{test_case.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = unwrap(response)
        assert data["success"] is True
        assert data["removed"] is True

    def test_remove_tag_idempotent(self, client, auth_headers, test_case):
        """Test removing tag twice is idempotent."""
        # Create tag
        create_response = client.post(
            "/tags",
            json={"name": "Test", "color": "#FF0000"},
            headers=auth_headers
        )
        tag_id = unwrap(create_response)["id"]

        # Remove tag (not attached)
        response = client.delete(
            f"/tags/{tag_id}/cases/{test_case.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = unwrap(response)
        assert data["removed"] is False

class TestListCasesWithTag:
    """Test GET /tags/{tag_id}/cases - List cases with tag."""

    def test_list_cases_empty(self, client, auth_headers):
        """Test listing cases when tag has none."""
        # Create tag
        create_response = client.post(
            "/tags",
            json={"name": "Test", "color": "#FF0000"},
            headers=auth_headers
        )
        tag_id = unwrap(create_response)["id"]

        response = client.get(f"/tags/{tag_id}/cases", headers=auth_headers)

        assert response.status_code == 200
        assert unwrap(response) == []

    def test_list_cases_with_data(self, client, auth_headers, test_case):
        """Test listing cases with tag."""
        # Create and attach tag
        create_response = client.post(
            "/tags",
            json={"name": "Test", "color": "#FF0000"},
            headers=auth_headers
        )
        tag_id = unwrap(create_response)["id"]
        client.post(f"/tags/{tag_id}/cases/{test_case.id}", headers=auth_headers)

        response = client.get(f"/tags/{tag_id}/cases", headers=auth_headers)

        assert response.status_code == 200
        data = unwrap(response)
        assert len(data) == 1
        assert data[0]["id"] == test_case.id

class TestListTagsForCase:
    """Test GET /tags/cases/{case_id}/tags - List tags for case."""

    def test_list_tags_empty(self, client, auth_headers, test_case):
        """Test listing tags when case has none."""
        response = client.get(f"/tags/cases/{test_case}/tags", headers=auth_headers)

        assert response.status_code == 200
        assert unwrap(response) == []

    def test_list_tags_with_data(self, client, auth_headers, test_case):
        """Test listing tags for case."""
        # Create and attach tag
        create_response = client.post(
            "/tags",
            json={"name": "Test", "color": "#FF0000"},
            headers=auth_headers
        )
        tag_id = unwrap(create_response)["id"]
        client.post(f"/tags/{tag_id}/cases/{test_case.id}", headers=auth_headers)

        response = client.get(f"/tags/cases/{test_case}/tags", headers=auth_headers)

        assert response.status_code == 200
        data = unwrap(response)
        assert len(data) == 1
        assert data[0]["id"] == tag_id

class TestSearchCasesByTags:
    """Test GET /tags/search - Search cases by tags (AND/OR)."""

    def test_search_and_logic(self, client, auth_headers, test_case):
        """Test AND logic - cases must have ALL tags."""
        # Create two tags
        tag1_response = client.post(
            "/tags",
            json={"name": "Tag1", "color": "#FF0000"},
            headers=auth_headers
        )
        tag1_id = unwrap(tag1_response)["id"]

        tag2_response = client.post(
            "/tags",
            json={"name": "Tag2", "color": "#00FF00"},
            headers=auth_headers
        )
        tag2_id = unwrap(tag2_response)["id"]

        # Attach both tags to case
        client.post(f"/tags/{tag1_id}/cases/{test_case.id}", headers=auth_headers)
        client.post(f"/tags/{tag2_id}/cases/{test_case.id}", headers=auth_headers)

        # Search with AND logic
        response = client.get(
            f"/tags/search?tag_ids={tag1_id},{tag2_id}&match_all=true",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = unwrap(response)
        assert data["matchAll"] is True
        assert test_case.id in data["caseIds"]
        assert data["resultCount"] == 1

    def test_search_or_logic(self, client, auth_headers, test_case):
        """Test OR logic - cases must have ANY tag."""
        # Create two tags
        tag1_response = client.post(
            "/tags",
            json={"name": "Tag1", "color": "#FF0000"},
            headers=auth_headers
        )
        tag1_id = unwrap(tag1_response)["id"]

        tag2_response = client.post(
            "/tags",
            json={"name": "Tag2", "color": "#00FF00"},
            headers=auth_headers
        )
        tag2_id = unwrap(tag2_response)["id"]

        # Attach only first tag to case
        client.post(f"/tags/{tag1_id}/cases/{test_case.id}", headers=auth_headers)

        # Search with OR logic
        response = client.get(
            f"/tags/search?tag_ids={tag1_id},{tag2_id}&match_all=false",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = unwrap(response)
        assert data["matchAll"] is False
        assert test_case.id in data["caseIds"]

    def test_search_invalid_format(self, client, auth_headers):
        """Test search with invalid tag_ids format."""
        response = client.get(
            "/tags/search?tag_ids=abc,def&match_all=true",
            headers=auth_headers
        )

        assert response.status_code == 400

class TestGetTagStatistics:
    """Test GET /tags/statistics - Get tag statistics."""

    def test_statistics_empty(self, client, auth_headers):
        """Test statistics when no tags exist."""
        response = client.get("/tags/statistics", headers=auth_headers)

        assert response.status_code == 200
        data = unwrap(response)
        assert data["totalTags"] == 0
        assert data["tagsWithCases"] == 0
        assert data["mostUsedTags"] == []
        assert data["unusedTags"] == []

    def test_statistics_with_data(self, client, auth_headers, test_case):
        """Test statistics with tags and usage."""
        # Create tags
        tag1_response = client.post(
            "/tags",
            json={"name": "Used", "color": "#FF0000"},
            headers=auth_headers
        )
        tag1_id = unwrap(tag1_response)["id"]

        client.post(
            "/tags",
            json={"name": "Unused", "color": "#00FF00"},
            headers=auth_headers
        )

        # Attach first tag to case
        client.post(f"/tags/{tag1_id}/cases/{test_case.id}", headers=auth_headers)

        response = client.get("/tags/statistics", headers=auth_headers)

        assert response.status_code == 200
        data = unwrap(response)
        assert data["totalTags"] == 2
        assert data["tagsWithCases"] == 1
        assert len(data["mostUsedTags"]) == 1
        assert data["mostUsedTags"][0]["name"] == "Used"
        assert len(data["unusedTags"]) == 1
        assert data["unusedTags"][0]["name"] == "Unused"

# ===== RUN TESTS =====
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
