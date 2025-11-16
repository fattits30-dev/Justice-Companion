# Template Syntax & Variable Substitution Guide

**Justice Companion Template System Documentation**

Version: 1.0.0
Last Updated: 2025-01-13

---

## Table of Contents

1. [Overview](#overview)
2. [Variable Syntax](#variable-syntax)
3. [Template Fields](#template-fields)
4. [Variable Substitution Rules](#variable-substitution-rules)
5. [Common Variables](#common-variables)
6. [Examples](#examples)
7. [Best Practices](#best-practices)
8. [API Usage](#api-usage)

---

## Overview

The Justice Companion template system allows you to create reusable case templates with **variable placeholders** that are dynamically replaced when applying the template to create a new case.

**Key Features:**
- Simple `[VariableName]` syntax
- System templates (read-only, available to all users)
- User templates (custom, editable)
- Variable substitution in titles, descriptions, milestones, and checklists
- Support for timeline milestones with relative dates
- Suggested evidence types
- Checklist items with priorities

---

## Variable Syntax

Variables use square bracket notation: `[VariableName]`

### Valid Variable Names
- Must be alphanumeric (letters and numbers)
- Can include underscores: `[Client_Name]`
- Case-sensitive: `[Client]` ≠ `[client]`
- No spaces allowed: `[Client Name]` is invalid

### Examples
```
✅ Valid:
[Client]
[Defendant]
[CaseNumber]
[Filing_Date]
[Amount_123]

❌ Invalid:
[Client Name]    // Contains space
[Client-Name]    // Contains hyphen
[123Number]      // Starts with number
```

---

## Template Fields

Templates consist of the following JSON structure:

```typescript
{
  "name": string,                          // Template name
  "description": string,                   // Template description
  "category": TemplateCategory,            // civil, criminal, family, etc.
  "templateFields": {
    "titleTemplate": string,               // Title with [Variables]
    "descriptionTemplate": string,         // Description with [Variables]
    "caseType": CaseType,                  // Case type enum
    "defaultStatus": CaseStatus,           // Default status (e.g., "active")
    "customFields": object                 // Optional custom fields
  },
  "suggestedEvidenceTypes": string[],      // Evidence type suggestions
  "timelineMilestones": Milestone[],       // Timeline milestones
  "checklistItems": ChecklistItem[]        // Checklist items
}
```

### Template Fields Object

| Field | Type | Description |
|-------|------|-------------|
| `titleTemplate` | string | Case title with variable placeholders |
| `descriptionTemplate` | string | Case description with variable placeholders |
| `caseType` | enum | Case type: `consumer`, `debt`, `employment`, `family`, `housing`, `immigration`, `other` |
| `defaultStatus` | enum | Default case status: `active`, `closed`, `archived` |
| `customFields` | object | Optional custom field mappings |

### Timeline Milestone Object

```typescript
{
  "title": string,              // Milestone title (can contain variables)
  "description": string,        // Description (can contain variables)
  "daysFromStart": number,      // Days after case creation (0-365)
  "isRequired": boolean,        // Whether milestone is mandatory
  "category": string            // "filing", "hearing", "deadline", "meeting", "other"
}
```

### Checklist Item Object

```typescript
{
  "title": string,              // Task title (can contain variables)
  "description": string,        // Description (can contain variables)
  "category": string,           // "evidence", "filing", "communication", "research", "other"
  "priority": string,           // "low", "medium", "high"
  "daysFromStart": number       // Optional suggested completion timeline
}
```

---

## Variable Substitution Rules

### 1. Exact Match Replacement
Variables are replaced exactly as provided:

```
Template: "[Client] vs [Defendant]"
Variables: {"Client": "John Doe", "Defendant": "Jane Smith"}
Result: "John Doe vs Jane Smith"
```

### 2. Multiple Occurrences
The same variable can appear multiple times:

```
Template: "[Client] filed a claim against [Defendant]. [Client] seeks damages."
Variables: {"Client": "John", "Defendant": "Acme Corp"}
Result: "John filed a claim against Acme Corp. John seeks damages."
```

### 3. Missing Variables
Variables not provided remain unchanged:

```
Template: "[Client] vs [Defendant] - Case [Number]"
Variables: {"Client": "John", "Defendant": "Jane"}
Result: "John vs Jane - Case [Number]"
```

### 4. Case Sensitivity
Variable names are case-sensitive:

```
Template: "[client] vs [Client]"
Variables: {"Client": "John"}
Result: "[client] vs John"  // [client] not replaced
```

### 5. No Escaping
Square brackets are treated as variable delimiters. To use literal brackets, avoid variable patterns:

```
❌ Problematic: "Amount [GBP] [Amount]"
✅ Better: "Amount (GBP) [Amount]"
```

---

## Common Variables

### Standard UK Legal Variables

#### Civil Litigation
- `[Client]` / `[ClientName]` - Claimant name
- `[Defendant]` / `[DefendantName]` - Defendant name
- `[Amount]` - Claim amount
- `[ContractDate]` - Date of contract
- `[BreachDate]` - Date of breach
- `[ContractType]` - Type of contract

#### Employment
- `[Claimant]` - Employee name
- `[Employer]` - Employer name
- `[JobTitle]` - Job position
- `[StartDate]` - Employment start date
- `[EndDate]` - Employment end date
- `[DismissalReason]` - Reason for dismissal

#### Family
- `[Petitioner]` - Person filing petition
- `[Respondent]` - Other party
- `[MarriageDate]` - Date of marriage
- `[SeparationDate]` - Date of separation
- `[Children]` - Number of children

#### Housing
- `[Tenant]` - Tenant name
- `[Landlord]` - Landlord name
- `[PropertyAddress]` - Full address
- `[TenancyStart]` - Tenancy start date
- `[RentAmount]` - Monthly rent

#### Immigration
- `[Appellant]` - Person appealing
- `[VisaType]` - Type of visa
- `[RefusalDate]` - Date of refusal
- `[HoReference]` - Home Office reference
- `[Country]` - Country of origin

---

## Examples

### Example 1: Contract Dispute Template

```json
{
  "name": "Contract Dispute - Business",
  "category": "civil",
  "templateFields": {
    "titleTemplate": "[Client] v [Defendant] - [ContractType] Dispute",
    "descriptionTemplate": "Contract dispute arising from [ContractType] dated [ContractDate]. Alleged breach: [BreachDescription]. Damages sought: £[Amount].",
    "caseType": "consumer",
    "defaultStatus": "active"
  },
  "suggestedEvidenceTypes": [
    "Contract documents",
    "Correspondence",
    "Invoice/payment records"
  ],
  "timelineMilestones": [
    {
      "title": "Letter Before Claim to [Defendant]",
      "description": "Send pre-action protocol letter to [Defendant]",
      "daysFromStart": 7,
      "isRequired": true,
      "category": "filing"
    }
  ]
}
```

**Application:**
```json
{
  "variables": {
    "Client": "ABC Ltd",
    "Defendant": "XYZ Corp",
    "ContractType": "Supply Agreement",
    "ContractDate": "15 March 2023",
    "BreachDescription": "failure to deliver goods",
    "Amount": "25000"
  }
}
```

**Result:**
- **Title:** "ABC Ltd v XYZ Corp - Supply Agreement Dispute"
- **Description:** "Contract dispute arising from Supply Agreement dated 15 March 2023. Alleged breach: failure to deliver goods. Damages sought: £25000."
- **Milestone:** "Letter Before Claim to XYZ Corp"

### Example 2: Employment Tribunal Template

```json
{
  "name": "Employment Tribunal - Unfair Dismissal",
  "category": "employment",
  "templateFields": {
    "titleTemplate": "[Claimant] v [Employer] - Unfair Dismissal",
    "descriptionTemplate": "Employment tribunal claim for unfair dismissal. [Claimant] was employed as [JobTitle] from [StartDate] to [EndDate]. Dismissed for [Reason].",
    "caseType": "employment",
    "defaultStatus": "active"
  }
}
```

**Application:**
```json
{
  "variables": {
    "Claimant": "Sarah Jones",
    "Employer": "TechCorp UK Ltd",
    "JobTitle": "Senior Developer",
    "StartDate": "1 June 2020",
    "EndDate": "15 December 2024",
    "Reason": "alleged poor performance"
  }
}
```

**Result:**
- **Title:** "Sarah Jones v TechCorp UK Ltd - Unfair Dismissal"
- **Description:** "Employment tribunal claim for unfair dismissal. Sarah Jones was employed as Senior Developer from 1 June 2020 to 15 December 2024. Dismissed for alleged poor performance."

---

## Best Practices

### 1. Use Descriptive Variable Names
```
✅ Good: [ClientFullName], [DefendantCompanyName]
❌ Bad: [X], [Name1], [N]
```

### 2. Consistent Naming Conventions
Use consistent variable names across templates:
- `[Client]` not `[Claimant]` in civil cases
- `[Defendant]` not `[Respondent]` in civil cases

### 3. Provide Default Text for Optional Variables
```
Template: "Case opened on [OpenDate] by [Handler]"
Better: "Case opened on [OpenDate]. Handler: [Handler]"
```

### 4. Document Required Variables
Add comments or documentation listing required vs optional variables:

```json
{
  "name": "My Template",
  "description": "Required variables: [Client], [Defendant]. Optional: [CaseNumber]"
}
```

### 5. Use Clear Delimiters
Avoid ambiguity with surrounding text:

```
❌ Ambiguous: "[ClientName]vsDefendant"
✅ Clear: "[ClientName] vs Defendant"
```

### 6. Validate Variable Values
Before applying template, validate that required variables are provided:

```typescript
const requiredVars = ["Client", "Defendant"];
const missing = requiredVars.filter(v => !variables[v]);
if (missing.length > 0) {
  throw new Error(`Missing required variables: ${missing.join(", ")}`);
}
```

---

## API Usage

### Create Template (POST /templates)

```bash
curl -X POST "http://localhost:3000/templates" \
  -H "Authorization: Bearer <session_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Contract Dispute Template",
    "description": "Template for consumer contract disputes",
    "category": "civil",
    "templateFields": {
      "titleTemplate": "[Client] v [Defendant] - Contract Dispute",
      "descriptionTemplate": "Dispute regarding [ContractType] contract dated [Date]",
      "caseType": "consumer",
      "defaultStatus": "active"
    },
    "suggestedEvidenceTypes": ["Contract", "Correspondence"],
    "timelineMilestones": [],
    "checklistItems": []
  }'
```

### List Templates (GET /templates)

```bash
# Get all templates
curl "http://localhost:3000/templates" \
  -H "Authorization: Bearer <session_id>"

# Filter by category
curl "http://localhost:3000/templates?category=civil" \
  -H "Authorization: Bearer <session_id>"
```

### Apply Template (POST /templates/{id}/apply)

```bash
curl -X POST "http://localhost:3000/templates/1/apply" \
  -H "Authorization: Bearer <session_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "Client": "John Doe",
      "Defendant": "Acme Corp",
      "ContractType": "Service Agreement",
      "Date": "15 March 2024"
    }
  }'
```

### Seed System Templates (POST /templates/seed)

```bash
curl -X POST "http://localhost:3000/templates/seed" \
  -H "Authorization: Bearer <session_id>"
```

**Response:**
```json
{
  "success": true,
  "message": "Template seeding complete: 8 seeded, 0 skipped, 0 failed",
  "stats": {
    "total_templates": 8,
    "seeded": 8,
    "skipped": 0,
    "failed": 0,
    "template_names": [
      "Civil Litigation - Contract Dispute",
      "Personal Injury Claim",
      "Employment Tribunal Claim",
      "Housing Possession Defense",
      "Family Court - Divorce Petition",
      "Immigration Appeal (First-tier Tribunal)",
      "Landlord-Tenant Dispute",
      "Debt Recovery Action"
    ]
  }
}
```

---

## Advanced Usage

### Dynamic Milestone Titles

Milestones support variable substitution:

```json
{
  "timelineMilestones": [
    {
      "title": "Serve [Defendant] with claim",
      "description": "Ensure [Defendant] receives claim within 4 months",
      "daysFromStart": 14,
      "category": "filing"
    }
  ]
}
```

### Conditional Text Patterns

Use descriptive variables for conditional-like text:

```
Template: "[Client] seeks [ReliefType] against [Defendant]"
Variables: {
  "Client": "John",
  "ReliefType": "damages and injunction",
  "Defendant": "Acme"
}
Result: "John seeks damages and injunction against Acme"
```

### Date Formatting

Variables are plain text - format dates before substitution:

```typescript
const formattedDate = new Date("2024-01-15").toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric"
});
// "15 January 2024"

variables["Date"] = formattedDate;
```

---

## Troubleshooting

### Variables Not Being Replaced

**Problem:** Template shows `[Client]` instead of "John Doe"

**Solutions:**
1. Check variable name spelling (case-sensitive)
2. Ensure variable is in `variables` object
3. Verify square brackets are standard ASCII `[` `]`

### Extra Whitespace in Output

**Problem:** "John  vs  Jane" (double spaces)

**Solutions:**
1. Use single spaces in template: `[Client] vs [Defendant]`
2. Trim variable values before substitution

### Special Characters in Variables

**Problem:** Variable contains quotes or special characters

**Solutions:**
1. Escape special characters before substitution
2. Validate input to reject problematic characters
3. Use HTML entities for web display if needed

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-13 | Initial documentation for service layer integration |

---

## Related Documentation

- [Template Service API Reference](../backend/services/template_service.py)
- [Template Seeder Guide](../backend/services/template_seeder.py)
- [Template Routes Documentation](../backend/routes/templates.py)
- [Audit Logging Guide](./AUDIT_LOGGING_GUIDE.md)

---

**Questions?** File an issue on GitHub or consult the API documentation.
