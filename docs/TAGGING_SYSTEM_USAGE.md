# Evidence Tagging System - Usage Guide

## Overview

The Evidence Tagging System allows users to organize evidence items using custom color-coded tags. This guide explains how to use the tagging features in Justice Companion.

---

## Creating and Managing Tags

### Opening Tag Manager

The Tag Manager dialog allows you to create, edit, and delete tags.

**To open Tag Manager:**
1. Navigate to Documents/Evidence view
2. Click "Manage Tags" button (usually in toolbar)
3. Or use keyboard shortcut (if configured)

### Creating a New Tag

**Steps:**
1. In Tag Manager dialog, fill out the form:
   - **Name**: Enter a tag name (1-50 characters, required)
     - Examples: "Important", "Urgent", "Reviewed", "Pending Analysis"
   - **Color**: Click a preset color or enter custom hex color
     - 10 preset colors available
     - Custom colors must be in #RRGGBB format
   - **Description**: Optional explanation (up to 200 characters)
     - Example: "Evidence requiring immediate attorney review"

2. Click "Create Tag" button

3. Tag appears in the list below with usage count (0)

**Validation Rules:**
- Tag names must be unique (per user)
- Color must be valid hex format
- Name cannot be empty

### Editing an Existing Tag

**Steps:**
1. Find the tag in the list
2. Click the Edit button (pencil icon)
3. Form populates with current values
4. Make changes
5. Click "Update Tag"
6. Changes apply to all evidence using this tag

**Note:** Changing tag color updates the appearance on all evidence items immediately.

### Deleting a Tag

**Steps:**
1. Find the tag in the list
2. Click the Delete button (trash icon)
3. Confirm deletion in dialog
   - Dialog shows how many evidence items will lose this tag
4. Tag is removed from all evidence

**Warning:** Deletion cannot be undone. Consider editing instead if you might need the tag later.

---

## Tagging Evidence

### Adding Tags to Evidence

**From Evidence Detail View:**
1. Open an evidence item
2. Find the Tags section
3. Click "+ Add Tag" button
4. Select from available tags
5. Tag appears immediately

**From Evidence List View:**
1. Click tag icon on evidence card
2. Select tags from dropdown
3. Tags appear on card

**Keyboard Shortcuts:**
- `Escape` - Cancel tag selection
- `Enter` - Apply selected tag

### Removing Tags from Evidence

**Steps:**
1. Click the X button on any tag badge
2. Tag is removed immediately (no confirmation)

**Note:** This only removes the tag from this evidence item. The tag itself remains in your tag library.

### Viewing Evidence Tags

Tags appear as colored badges on evidence items:
- **Color**: Background matches tag color
- **Text**: White or black for optimal contrast (automatic)
- **Size**: Scales with context (sm/md/lg)

---

## Searching by Tags

### Tag-Based Search

Find all evidence items that have specific tags:

**Steps:**
1. Use search bar or tag filter
2. Select one or more tags
3. Results show evidence with ALL selected tags (AND logic)

**Search Logic:**
- **Single tag**: Shows all evidence with that tag
- **Multiple tags**: Shows only evidence with ALL tags
- **Example**: Selecting "Important" AND "Urgent" shows evidence that has both tags

**Performance:**
- Tag searches use database indexes
- Results are instant even with thousands of evidence items

---

## Tag Statistics

View tag usage analytics in Tag Manager:

**Metrics:**
- **Total Tags**: Number of tags you've created
- **Total Tagged Evidence**: Evidence items with at least one tag
- **Most Used Tag**: Tag applied to most evidence items
- **Unused Tags**: Tags not applied to any evidence

**Usage Count:**
Each tag shows how many times it's been applied:
- "Used 5 times" - Applied to 5 evidence items
- "Used 0 times" - Not yet applied

---

## Best Practices

### Tag Naming

✅ **DO:**
- Use clear, descriptive names ("Needs Review", "High Priority")
- Be consistent with naming patterns
- Use title case for readability
- Keep names concise (under 20 characters)

❌ **DON'T:**
- Use vague names ("Tag1", "Misc")
- Create near-duplicates ("Important", "Important!")
- Use special characters excessively
- Make names too long (hard to read on small badges)

### Color Coding

**Suggested Color Schemes:**

**By Priority:**
- 🔴 Red (#EF4444) - Urgent
- 🟠 Orange (#F97316) - High Priority
- 🟡 Amber (#F59E0B) - Medium Priority
- 🟢 Green (#10B981) - Low Priority

**By Status:**
- 🔵 Blue (#3B82F6) - To Review
- 🟣 Violet (#8B5CF6) - In Progress
- 🟢 Green (#10B981) - Completed
- ⚫ Gray (#6B7280) - Archived

**By Type:**
- 🔴 Red - Legal Issues
- 🟡 Amber - Financial
- 🔵 Blue - Technical
- 🟣 Violet - Communication

### Tag Organization

**Start Small:**
- Begin with 5-10 essential tags
- Add more as needs arise
- Delete unused tags regularly

**Tag Hierarchies (Conceptual):**
While the system doesn't support nested tags, you can use naming conventions:
- "Evidence - Physical"
- "Evidence - Digital"
- "Evidence - Testimonial"

**Regular Maintenance:**
- Review unused tags monthly
- Consolidate similar tags
- Update descriptions as usage evolves

---

## Keyboard Navigation

### Tag Manager Dialog

- `Escape` - Close dialog
- `Tab` - Navigate between fields
- `Enter` - Submit form (when in text input)
- Arrow keys - Navigate color picker

### Tag Selection

- `Tab` - Navigate tags
- `Enter` - Select/deselect tag
- `Escape` - Cancel selection

---

## Accessibility Features

### Screen Reader Support

All tagging features work with screen readers:
- Tag names announced when focused
- Color descriptions provided
- Usage counts read aloud
- Action buttons clearly labeled

### Keyboard-Only Operation

Complete functionality without mouse:
- Create, edit, delete tags
- Apply, remove tags
- Search by tags
- Navigate Tag Manager

### Visual Accessibility

- High contrast mode support
- Text remains readable on all color backgrounds
- Focus indicators on all interactive elements
- Color is not the only indicator (labels present)

---

## Common Use Cases

### Case Preparation

**Scenario:** Organizing evidence for court

**Tags:**
- "Exhibit A", "Exhibit B", etc. (Blue)
- "Original", "Copy" (Gray)
- "Needs Notarization" (Red)
- "Attorney Approved" (Green)

### Evidence Review

**Scenario:** Tracking review status

**Tags:**
- "Not Reviewed" (Red)
- "In Review" (Amber)
- "Reviewed - Relevant" (Green)
- "Reviewed - Not Relevant" (Gray)

### Time-Sensitive Items

**Scenario:** Managing deadlines

**Tags:**
- "Due This Week" (Red)
- "Due This Month" (Amber)
- "No Deadline" (Gray)

### Evidence Types

**Scenario:** Categorizing by format

**Tags:**
- "Physical Evidence" (Blue)
- "Digital Evidence" (Violet)
- "Testimony" (Teal)
- "Document" (Green)

---

## Troubleshooting

### "Tag Already Exists" Error

**Problem:** Trying to create duplicate tag name

**Solution:**
- Use a different name
- Or find and edit the existing tag

### Tags Not Appearing

**Problem:** Tags not showing on evidence

**Solution:**
- Refresh the evidence list
- Check if tag was successfully applied (click to edit evidence)
- Verify session is active

### Search Returns No Results

**Problem:** Tag search finds nothing

**Solution:**
- Try searching with fewer tags (AND logic requires all)
- Verify evidence has been tagged
- Check filters aren't too restrictive

### Tag Manager Won't Open

**Problem:** Click "Manage Tags" but nothing happens

**Solution:**
- Check browser console for errors
- Verify session is active (try refreshing)
- Report bug if issue persists

---

## API Integration

For developers integrating the tagging system:

### List All Tags

```typescript
const sessionId = window.sessionManager.getSessionId();
const result = await window.api.tags.list(sessionId);

if (result.success) {
  const tags = result.data; // Tag[]
}
```

### Create Tag

```typescript
const result = await window.api.tags.create(
  {
    name: 'Important',
    color: '#EF4444',
    description: 'High priority items'
  },
  sessionId
);
```

### Tag Evidence

```typescript
await window.api.tags.tagEvidence(
  evidenceId,
  tagId,
  sessionId
);
```

### Search by Tags

```typescript
const result = await window.api.tags.searchByTags(
  [tagId1, tagId2], // AND logic
  sessionId
);

const evidenceIds = result.data; // number[]
```

### Get Statistics

```typescript
const result = await window.api.tags.statistics(sessionId);

if (result.success) {
  console.log('Total tags:', result.data.totalTags);
  console.log('Most used:', result.data.mostUsedTag?.name);
}
```

---

## Future Enhancements

Planned features for future releases:

- [ ] **Tag Sharing**: Share tags with collaborators
- [ ] **Tag Templates**: Predefined tag sets for case types
- [ ] **Tag Analytics**: Usage trends and visualizations
- [ ] **Bulk Tagging**: Apply tags to multiple evidence items at once
- [ ] **Smart Suggestions**: AI-powered tag recommendations
- [ ] **Tag Hierarchies**: Parent/child tag relationships
- [ ] **Tag Import/Export**: Backup and restore tag libraries
- [ ] **Tag Rules**: Auto-tag evidence based on criteria

---

## Support

For issues or questions:

1. Check this guide first
2. Review error messages (often provide solutions)
3. Check audit logs for operation history
4. Report bugs via issue tracker

---

*Last updated: 2025-10-25*
*Version: 1.0.0*
