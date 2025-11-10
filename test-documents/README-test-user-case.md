# 🧪 Test User Case - AI Performance Testing

## Overview

This test case evaluates the Justice Companion AI's ability to analyze legal documents and extract structured case information for automated case creation.

**Test Subject:** Test User - Unfair Dismissal Claim
**Case Type:** Employment Law
**Complexity:** High (Multiple document types, cross-references, performance context)

## 📄 Test Documents

### 1. **test-user-dismissal-letter.txt**
- **Purpose:** Primary termination document
- **Key Information:**
  - Employee: Test User (Lead Developer)
  - Employer: Global Tech Innovations PLC
  - Termination Date: 31 October 2024
  - Length of Service: 6 years, 7 months
  - Final Salary: £100,000 per annum
  - Termination Package: £16,217.95 total

### 2. **test-user-performance-review.txt**
- **Purpose:** Performance context and PIP initiation
- **Key Information:**
  - Review Period: April 2023 - March 2024
  - Rating: "Meets Some Requirements" (3/5)
  - Areas for Improvement: Project delivery, code quality, technology adoption
  - PIP Objectives: Mobile app completion, peer review scores, cloud certification

### 3. **test-user-email-chain.txt**
- **Purpose:** Communication timeline and performance discussions
- **Key Information:**
  - PIP Extension: From 8 weeks to 15 October 2024
  - Performance Updates: Weekly progress reports
  - Management Concerns: Delivery delays, technical challenges
  - CTO Approval: Extension granted for strategic project completion

### 4. **test-user-termination-meeting-notes.txt**
- **Purpose:** Final termination discussion and rationale
- **Key Information:**
  - Meeting Date: 15 October 2024
  - Attendees: Employee, Manager, CTO, HR
  - Rationale: Organizational restructuring, skills gap analysis
  - Package Agreement: Confirmed termination terms

## 🎯 AI Testing Objectives

### Core Capabilities
- **Document Analysis:** Extract structured data from unstructured text
- **Cross-Document Correlation:** Connect information across multiple sources
- **Legal Context Understanding:** Identify employment law case patterns
- **Confidence Scoring:** Provide transparency in extraction certainty
- **Source Attribution:** Show where information was extracted from

### Expected Extractions

#### Case Title
**Expected:** "Unfair Dismissal Claim - Test User vs Global Tech Innovations PLC"
**Confidence:** 95% (High)
**Sources:** Dismissal letter header, company name, employee name

#### Case Type
**Expected:** "employment"
**Confidence:** 98% (High)
**Sources:** Termination context, performance management, employment contract references

#### Opposing Party
**Expected:** "Global Tech Innovations PLC"
**Confidence:** 95% (High)
**Sources:** Letterhead, email signatures, meeting notes

#### Case Description
**Expected:** Comprehensive summary covering:
- Employment duration and role
- Performance concerns and PIP process
- Termination rationale (restructuring)
- Package details
- Appeal rights

**Confidence:** 90% (High)
**Sources:** All documents synthesized

#### Key Dates
- **Termination Date:** 31 October 2024 (High confidence)
- **PIP Start:** 1 July 2024 (Medium confidence)
- **PIP Extension:** 15 October 2024 (High confidence)
- **Employment Start:** 15 March 2018 (High confidence)

## 🚀 Test Execution Steps

### Manual Testing
1. **Start Application**
   ```bash
   npm run dev
   ```

2. **Navigate to Chat View**
   - Open Justice Companion
   - Go to Chat section

3. **Upload Documents**
   - Click upload button (📎)
   - Select each test document in sequence:
     1. `test-user-dismissal-letter.txt`
     2. `test-user-performance-review.txt`
     3. `test-user-email-chain.txt`
     4. `test-user-termination-meeting-notes.txt`

   **Note:** The system automatically detects test documents (files starting with "test-user-") and sets the user profile name to "Test User" to match the document claimant, preventing ownership mismatch warnings.

4. **Analyze AI Response**
   - Wait for document analysis completion
   - The AI should provide conversational analysis AND structured case data extraction
   - Click **"Create Case from Analysis"** button

5. **Review AI Extractions**
   - Verify case title: "Unfair Dismissal Claim - Test User vs Global Tech Innovations PLC"
   - Check confidence scores (should be 90-98% for key fields)
   - Review source attribution showing which document provided each piece of information
   - Examine case description completeness

6. **Test Human-in-the-Loop**
   - Modify extracted information if needed
   - Test duplicate case detection (try creating same case twice)
   - Verify case creation success and automatic case switching

### Automated Testing
```bash
# Run test case information
npx tsx scripts/create-test-user-case.ts

# Generate test report (future feature)
npx tsx scripts/create-test-user-case.ts --report
```

## 📊 Success Criteria

### Extraction Accuracy (Primary)
- ✅ **Title:** Exact match or very close (90%+ similarity)
- ✅ **Case Type:** Correctly identified as "employment"
- ✅ **Opposing Party:** Exact company name match
- ✅ **Key Dates:** Major dates extracted correctly
- ✅ **Description:** Comprehensive and accurate summary

### AI Transparency (Secondary)
- ✅ **Confidence Scores:** Provided for all major fields
- ✅ **Source Attribution:** Shows document sources for extractions
- ✅ **Cross-References:** Information correlated across documents

### User Experience (Tertiary)
- ✅ **Dialog Flow:** Smooth case creation workflow
- ✅ **Error Handling:** Clear messages for edge cases
- ✅ **Duplicate Detection:** Proper warning and options

## 🔍 Common Issues to Watch For

### AI Extraction Issues
- **Over-extraction:** Including irrelevant details in case description
- **Under-extraction:** Missing key dates or parties
- **Confidence Inflation:** Overly high confidence scores for uncertain extractions
- **Source Confusion:** Incorrect attribution of information sources

### User Experience Issues
- **Dialog Freezing:** Case creation dialog not responding
- **Data Loss:** Form data not persisting during edits
- **Validation Errors:** Required fields not properly validated
- **Duplicate Handling:** Poor user guidance for duplicate cases

## 📈 Performance Metrics

### Target Performance
- **Extraction Accuracy:** 90%+ for core fields
- **Processing Time:** < 30 seconds per document
- **Confidence Calibration:** Scores reflect actual accuracy
- **User Satisfaction:** Smooth, intuitive workflow

### Benchmarking
- Compare against manual document review time
- Measure reduction in case setup time
- Track accuracy improvements over time
- Monitor user error rates

## 🛠️ Maintenance

### Updating Test Case
1. Modify documents in `test-documents/` directory
2. Update expected results in `scripts/create-test-user-case.ts`
3. Run test to verify changes
4. Update this README with any changes

### Adding New Test Cases
1. Create new document files in `test-documents/`
2. Add new test case class in scripts
3. Update CLI interface for multiple test cases
4. Document new test scenarios

## 📞 Support

For issues with this test case:
1. Check AI service logs for extraction errors
2. Verify document formats are supported
3. Test individual documents separately
4. Review confidence scoring logic

---

**Test Case Version:** 1.0
**Last Updated:** November 2024
**AI Model Tested:** GPT-4 (Document Analysis)
