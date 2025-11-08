/**
 * Template Seeder
 * Seeds database with built-in system templates
 */

import type { TemplateRepository } from "../repositories/TemplateRepository.ts";
import type { CreateTemplateInput } from "../models/CaseTemplate.ts";

export class TemplateSeeder {
  constructor(private templateRepo: TemplateRepository) {}

  /**
   * Seed all built-in templates
   */
  seedAll(): void {
    const templates = this.getBuiltInTemplates();

    for (const template of templates) {
      // Check if template already exists by name
      const allTemplates = this.templateRepo.findAllTemplates();
      const existing = allTemplates.find(
        (t) => t.name === template.name && t.isSystemTemplate
      );

      if (!existing) {
        this.templateRepo.createTemplate({
          ...template,
          isSystemTemplate: true,
          userId: null,
        });
        console.log(`✓ Seeded template: ${template.name}`);
      } else {
        console.log(`⊘ Template already exists: ${template.name}`);
      }
    }
  }

  /**
   * Get all built-in template definitions
   */
  private getBuiltInTemplates(): CreateTemplateInput[] {
    return [
      this.civilLitigationTemplate(),
      this.personalInjuryTemplate(),
      this.employmentTribunalTemplate(),
      this.housingPossessionDefenseTemplate(),
      this.familyCourtDivorceTemplate(),
      this.immigrationAppealTemplate(),
      this.landlordTenantDisputeTemplate(),
      this.debtRecoveryTemplate(),
    ];
  }

  /**
   * Template 1: Civil Litigation (Contract Dispute)
   */
  private civilLitigationTemplate(): CreateTemplateInput {
    return {
      name: "Civil Litigation - Contract Dispute",
      description:
        "Standard template for commercial or consumer contract disputes. Includes pre-action protocol steps and court proceedings timeline.",
      category: "civil",
      templateFields: {
        titleTemplate: "[Client Name] v [Defendant] - Contract Dispute",
        descriptionTemplate:
          "Contract dispute regarding [brief description of contract]. Alleged breach: [describe breach]. Damages sought: £[amount].",
        caseType: "consumer",
        defaultStatus: "active",
      },
      suggestedEvidenceTypes: [
        "Contract documents",
        "Correspondence (emails, letters)",
        "Invoice/payment records",
        "Witness statements",
        "Expert reports (if applicable)",
      ],
      timelineMilestones: [
        {
          title: "Letter Before Claim (Pre-Action)",
          description:
            "Send detailed letter of claim to defendant outlining breach and proposed resolution",
          daysFromStart: 7,
          isRequired: true,
          category: "filing",
        },
        {
          title: "Defendant Response Deadline",
          description: "Defendant must acknowledge claim within 14 days",
          daysFromStart: 21,
          isRequired: true,
          category: "deadline",
        },
        {
          title: "Prepare Claim Form (N1)",
          description: "Draft particulars of claim if settlement not reached",
          daysFromStart: 30,
          isRequired: false,
          category: "filing",
        },
        {
          title: "File Court Claim",
          description: "Issue claim at county court if no settlement",
          daysFromStart: 45,
          isRequired: false,
          category: "filing",
        },
      ],
      checklistItems: [
        {
          title: "Gather all contract documents",
          description:
            "Collect original contract, amendments, and related agreements",
          category: "evidence",
          priority: "high",
          daysFromStart: 1,
        },
        {
          title: "Calculate damages",
          description: "Itemize all losses with supporting documentation",
          category: "research",
          priority: "high",
          daysFromStart: 3,
        },
        {
          title: "Check court fees",
          description:
            "Verify current court fee based on claim value (£25-£10,000)",
          category: "filing",
          priority: "medium",
          daysFromStart: 5,
        },
        {
          title: "Draft witness statements",
          description:
            "Prepare factual witness statements from all relevant parties",
          category: "evidence",
          priority: "medium",
          daysFromStart: 14,
        },
      ],
    };
  }

  /**
   * Template 2: Personal Injury Claim
   */
  private personalInjuryTemplate(): CreateTemplateInput {
    return {
      name: "Personal Injury Claim",
      description:
        "Template for personal injury claims including road traffic accidents, workplace injuries, and public liability claims.",
      category: "civil",
      templateFields: {
        titleTemplate: "[Claimant Name] - Personal Injury Claim",
        descriptionTemplate:
          "Personal injury claim arising from [incident type] on [date]. Injuries sustained: [list injuries]. Liable party: [defendant name].",
        caseType: "other",
        defaultStatus: "active",
      },
      suggestedEvidenceTypes: [
        "Medical records and reports",
        "Accident report",
        "Photographs of injuries/accident scene",
        "Witness statements",
        "Pay slips (for loss of earnings)",
        "Receipts for expenses",
      ],
      timelineMilestones: [
        {
          title: "Obtain medical records",
          description:
            "Request GP notes and hospital records with patient consent",
          daysFromStart: 7,
          isRequired: true,
          category: "other",
        },
        {
          title: "Instruct medical expert",
          description:
            "Arrange independent medical examination and prognosis report",
          daysFromStart: 14,
          isRequired: true,
          category: "other",
        },
        {
          title: "Send Letter of Claim",
          description:
            "Formal notification to defendant/insurer with injury details",
          daysFromStart: 30,
          isRequired: true,
          category: "filing",
        },
        {
          title: "Defendant Response",
          description:
            "Insurer must respond within 21 days acknowledging claim",
          daysFromStart: 51,
          isRequired: true,
          category: "deadline",
        },
      ],
      checklistItems: [
        {
          title: "Complete accident report form",
          description: "Document incident details while memory is fresh",
          category: "communication",
          priority: "high",
          daysFromStart: 1,
        },
        {
          title: "Photograph injuries",
          description:
            "Take detailed photos of all visible injuries and update weekly",
          category: "evidence",
          priority: "high",
          daysFromStart: 1,
        },
        {
          title: "Identify liable party",
          description: "Determine defendant and obtain insurance details",
          category: "research",
          priority: "high",
          daysFromStart: 3,
        },
        {
          title: "Calculate special damages",
          description: "Itemize all out-of-pocket expenses and lost earnings",
          category: "research",
          priority: "medium",
          daysFromStart: 7,
        },
      ],
    };
  }

  /**
   * Template 3: Employment Tribunal
   */
  private employmentTribunalTemplate(): CreateTemplateInput {
    return {
      name: "Employment Tribunal Claim",
      description:
        "Template for unfair dismissal, discrimination, and employment rights claims at tribunal.",
      category: "employment",
      templateFields: {
        titleTemplate: "[Claimant Name] v [Employer] - Employment Tribunal",
        descriptionTemplate:
          "Employment tribunal claim for [type: unfair dismissal/discrimination/etc]. Employment dates: [start] to [end]. Grounds: [brief description].",
        caseType: "employment",
        defaultStatus: "active",
      },
      suggestedEvidenceTypes: [
        "Employment contract",
        "Payslips and P60/P45",
        "Emails and written communications",
        "Disciplinary/grievance records",
        "Performance reviews",
        "Witness statements from colleagues",
      ],
      timelineMilestones: [
        {
          title: "Submit ACAS Early Conciliation",
          description:
            "Mandatory step before tribunal claim (min 1 month process)",
          daysFromStart: 7,
          isRequired: true,
          category: "filing",
        },
        {
          title: "Obtain ACAS Certificate",
          description:
            "Wait for ACAS certificate (issued if conciliation fails)",
          daysFromStart: 37,
          isRequired: true,
          category: "deadline",
        },
        {
          title: "File ET1 Form",
          description:
            "Submit tribunal claim within 1 month of ACAS cert (strict deadline)",
          daysFromStart: 44,
          isRequired: true,
          category: "filing",
        },
        {
          title: "Employer Response (ET3)",
          description: "Employer must respond within 28 days of service",
          daysFromStart: 72,
          isRequired: true,
          category: "deadline",
        },
      ],
      checklistItems: [
        {
          title: "Check time limits",
          description:
            "Verify claim is within 3 months less 1 day of dismissal/incident",
          category: "filing",
          priority: "high",
          daysFromStart: 1,
        },
        {
          title: "Gather employment documents",
          description:
            "Collect contract, handbook, policies, and correspondence",
          category: "evidence",
          priority: "high",
          daysFromStart: 1,
        },
        {
          title: "Calculate compensation",
          description: "Determine financial losses and statutory award limits",
          category: "research",
          priority: "medium",
          daysFromStart: 5,
        },
        {
          title: "Draft witness list",
          description: "Identify colleagues who can support claim",
          category: "evidence",
          priority: "medium",
          daysFromStart: 10,
        },
      ],
    };
  }

  /**
   * Template 4: Housing Possession Defense
   */
  private housingPossessionDefenseTemplate(): CreateTemplateInput {
    return {
      name: "Housing Possession Defense",
      description:
        "Defend against landlord possession claims (Section 21/Section 8 notices, mortgage repossession).",
      category: "housing",
      templateFields: {
        titleTemplate: "Defense - [Landlord] v [Tenant] - Possession Claim",
        descriptionTemplate:
          "Defense to possession claim. Property: [address]. Tenancy type: [AST/regulated/etc]. Notice received: [date]. Grounds: [Section 21/Section 8 grounds].",
        caseType: "housing",
        defaultStatus: "active",
      },
      suggestedEvidenceTypes: [
        "Tenancy agreement",
        "Rent payment records",
        "Notice (Section 21/8)",
        "Correspondence with landlord",
        "Photos of property condition",
        "Deposit protection certificate",
      ],
      timelineMilestones: [
        {
          title: "File Defense Form",
          description: "Submit defense to court within 14 days of service",
          daysFromStart: 7,
          isRequired: true,
          category: "filing",
        },
        {
          title: "Check deposit protection",
          description:
            "Verify landlord protected deposit within 30 days of tenancy",
          daysFromStart: 3,
          isRequired: true,
          category: "other",
        },
        {
          title: "Obtain legal advice",
          description:
            "Urgent appointment with housing solicitor or advice service",
          daysFromStart: 1,
          isRequired: true,
          category: "other",
        },
        {
          title: "First Hearing",
          description:
            "Attend possession hearing (approx 4-8 weeks after filing)",
          daysFromStart: 42,
          isRequired: true,
          category: "hearing",
        },
      ],
      checklistItems: [
        {
          title: "Check notice validity",
          description:
            "Verify notice period, format, and procedural requirements",
          category: "research",
          priority: "high",
          daysFromStart: 1,
        },
        {
          title: "Review tenancy agreement",
          description:
            "Check for landlord breaches (e.g., no deposit protection)",
          category: "evidence",
          priority: "high",
          daysFromStart: 1,
        },
        {
          title: "Apply for discretionary housing payment",
          description: "Emergency funds from local council if rent arrears",
          category: "other",
          priority: "medium",
          daysFromStart: 2,
        },
        {
          title: "Gather rent payment evidence",
          description: "Bank statements showing all rent payments made",
          category: "evidence",
          priority: "high",
          daysFromStart: 3,
        },
      ],
    };
  }

  /**
   * Template 5: Family Court (Divorce)
   */
  private familyCourtDivorceTemplate(): CreateTemplateInput {
    return {
      name: "Family Court - Divorce Petition",
      description:
        "No-fault divorce petition template (post-2022 reforms). Includes financial settlement and child arrangements.",
      category: "family",
      templateFields: {
        titleTemplate: "Divorce - [Petitioner] and [Respondent]",
        descriptionTemplate:
          "Divorce petition. Marriage date: [date]. Separation date: [date]. Grounds: Irretrievable breakdown. Children: [number]. Financial settlement: [disputed/agreed].",
        caseType: "family",
        defaultStatus: "active",
      },
      suggestedEvidenceTypes: [
        "Marriage certificate",
        "Financial disclosure (Form E)",
        "Property valuations",
        "Pension statements",
        "Bank statements (last 12 months)",
        "Child arrangement proposals",
      ],
      timelineMilestones: [
        {
          title: "Submit Online Divorce Application",
          description: "File application via gov.uk portal (£593 court fee)",
          daysFromStart: 7,
          isRequired: true,
          category: "filing",
        },
        {
          title: "Serve Respondent",
          description:
            "Court serves respondent (or personal service if required)",
          daysFromStart: 21,
          isRequired: true,
          category: "other",
        },
        {
          title: "Conditional Order (20 weeks)",
          description:
            "Apply for conditional order after 20-week reflection period",
          daysFromStart: 140,
          isRequired: true,
          category: "filing",
        },
        {
          title: "Final Order (6 weeks + 1 day)",
          description: "Apply for final order to complete divorce",
          daysFromStart: 182,
          isRequired: true,
          category: "filing",
        },
      ],
      checklistItems: [
        {
          title: "Obtain marriage certificate",
          description: "Original or certified copy required for application",
          category: "evidence",
          priority: "high",
          daysFromStart: 1,
        },
        {
          title: "Complete financial disclosure",
          description:
            "Full Form E with all assets, debts, income, and pensions",
          category: "filing",
          priority: "high",
          daysFromStart: 7,
        },
        {
          title: "Draft child arrangements",
          description: "Propose living arrangements, contact, and maintenance",
          category: "filing",
          priority: "medium",
          daysFromStart: 14,
        },
        {
          title: "Attend MIAM (Mediation)",
          description:
            "Mandatory Information and Assessment Meeting (unless exempt)",
          category: "other",
          priority: "high",
          daysFromStart: 10,
        },
      ],
    };
  }

  /**
   * Template 6: Immigration Appeal
   */
  private immigrationAppealTemplate(): CreateTemplateInput {
    return {
      name: "Immigration Appeal (First-tier Tribunal)",
      description:
        "Template for appealing visa refusals, deportation orders, and asylum decisions.",
      category: "immigration",
      templateFields: {
        titleTemplate: "Immigration Appeal - [Appellant Name]",
        descriptionTemplate:
          "Appeal against [visa refusal/deportation/asylum refusal]. Home Office reference: [ref]. Decision date: [date]. Grounds: [Article 8/human rights/asylum grounds].",
        caseType: "other",
        defaultStatus: "active",
      },
      suggestedEvidenceTypes: [
        "Home Office decision letter",
        "Passport and travel documents",
        "Sponsor documents (if family visa)",
        "Evidence of relationship/employment",
        "Country expert reports",
        "Character references",
      ],
      timelineMilestones: [
        {
          title: "File Notice of Appeal",
          description: "Submit appeal to First-tier Tribunal (14-day deadline)",
          daysFromStart: 7,
          isRequired: true,
          category: "filing",
        },
        {
          title: "Home Office Review",
          description: "UKVI reviews decision (may withdraw or maintain)",
          daysFromStart: 28,
          isRequired: true,
          category: "deadline",
        },
        {
          title: "Submit Skeleton Argument",
          description: "Detailed legal grounds and evidence summary",
          daysFromStart: 42,
          isRequired: true,
          category: "filing",
        },
        {
          title: "Tribunal Hearing",
          description:
            "Oral hearing before immigration judge (approx 3-6 months)",
          daysFromStart: 120,
          isRequired: true,
          category: "hearing",
        },
      ],
      checklistItems: [
        {
          title: "Check appeal deadline",
          description:
            "14 days for in-country, 28 days for out-of-country appeals",
          category: "filing",
          priority: "high",
          daysFromStart: 1,
        },
        {
          title: "Obtain Home Office bundle",
          description: "Request all documents HO relied on for decision",
          category: "evidence",
          priority: "high",
          daysFromStart: 3,
        },
        {
          title: "Gather supporting evidence",
          description:
            "Collect all evidence not submitted with original application",
          category: "evidence",
          priority: "high",
          daysFromStart: 5,
        },
        {
          title: "Instruct expert witness (if needed)",
          description:
            "Country expert for asylum or medical expert for health grounds",
          category: "other",
          priority: "medium",
          daysFromStart: 14,
        },
      ],
    };
  }

  /**
   * Template 7: Landlord-Tenant Dispute
   */
  private landlordTenantDisputeTemplate(): CreateTemplateInput {
    return {
      name: "Landlord-Tenant Dispute",
      description:
        "Template for deposit disputes, disrepair claims, and tenancy issues (not possession).",
      category: "housing",
      templateFields: {
        titleTemplate: "[Tenant] - Dispute with [Landlord]",
        descriptionTemplate:
          "Dispute type: [deposit/disrepair/unlawful eviction]. Property: [address]. Tenancy dates: [start] to [end/ongoing]. Issue: [brief description].",
        caseType: "housing",
        defaultStatus: "active",
      },
      suggestedEvidenceTypes: [
        "Tenancy agreement",
        "Inventory and check-in report",
        "Photos of property condition",
        "Repair requests and responses",
        "Rent payment records",
        "Correspondence with landlord",
      ],
      timelineMilestones: [
        {
          title: "Raise issue with landlord",
          description: "Formal written notice of disrepair/deposit dispute",
          daysFromStart: 3,
          isRequired: true,
          category: "other",
        },
        {
          title: "Landlord Response Period",
          description:
            "Landlord must respond within reasonable time (14-28 days)",
          daysFromStart: 21,
          isRequired: false,
          category: "deadline",
        },
        {
          title: "Initiate Deposit Scheme ADR",
          description: "Free dispute resolution via TDS/DPS/MyDeposits",
          daysFromStart: 30,
          isRequired: false,
          category: "other",
        },
        {
          title: "Submit County Court Claim",
          description: "File N1 claim form if ADR fails (last resort)",
          daysFromStart: 60,
          isRequired: false,
          category: "filing",
        },
      ],
      checklistItems: [
        {
          title: "Check deposit protection",
          description: "Verify deposit registered with TDS, DPS, or MyDeposits",
          category: "research",
          priority: "high",
          daysFromStart: 1,
        },
        {
          title: "Document property condition",
          description: "Timestamped photos and video walkthrough",
          category: "evidence",
          priority: "high",
          daysFromStart: 1,
        },
        {
          title: "Review tenancy agreement",
          description:
            "Check repair obligations and dispute resolution clauses",
          category: "research",
          priority: "medium",
          daysFromStart: 2,
        },
        {
          title: "Calculate damages/compensation",
          description: "Itemize losses or cost of repairs with quotes",
          category: "research",
          priority: "medium",
          daysFromStart: 7,
        },
      ],
    };
  }

  /**
   * Template 8: Debt Recovery
   */
  private debtRecoveryTemplate(): CreateTemplateInput {
    return {
      name: "Debt Recovery Action",
      description:
        "Template for recovering unpaid invoices, loans, or contractual debts from individuals or businesses.",
      category: "civil",
      templateFields: {
        titleTemplate: "[Creditor] v [Debtor] - Debt Recovery",
        descriptionTemplate:
          "Debt recovery claim. Amount owed: £[amount]. Invoice/loan date: [date]. Payment due: [date]. Debtor response: [ignored/disputed/partial payment].",
        caseType: "debt",
        defaultStatus: "active",
      },
      suggestedEvidenceTypes: [
        "Invoice or loan agreement",
        "Proof of delivery/service",
        "Payment reminders sent",
        "Debtor correspondence",
        "Bank statements showing non-payment",
        "Credit report (for insolvency check)",
      ],
      timelineMilestones: [
        {
          title: "Send Letter Before Action",
          description:
            "Final demand giving 14 days to pay or face legal action",
          daysFromStart: 7,
          isRequired: true,
          category: "other",
        },
        {
          title: "Debtor Payment Deadline",
          description: "Deadline for payment or response to letter",
          daysFromStart: 21,
          isRequired: true,
          category: "deadline",
        },
        {
          title: "Issue County Court Claim (N1)",
          description: "File claim online (MCOL) or via court if no payment",
          daysFromStart: 28,
          isRequired: false,
          category: "filing",
        },
        {
          title: "Debtor Defense Deadline",
          description: "Debtor has 14 days to acknowledge or defend",
          daysFromStart: 42,
          isRequired: false,
          category: "deadline",
        },
      ],
      checklistItems: [
        {
          title: "Verify debt is not statute-barred",
          description: "Check debt is within 6 years (12 for specialty debts)",
          category: "research",
          priority: "high",
          daysFromStart: 1,
        },
        {
          title: "Check debtor solvency",
          description: "Search Companies House or credit reference agencies",
          category: "research",
          priority: "high",
          daysFromStart: 2,
        },
        {
          title: "Calculate total owed",
          description: "Include principal, interest (8% statutory), and costs",
          category: "research",
          priority: "high",
          daysFromStart: 3,
        },
        {
          title: "Prepare enforcement options",
          description:
            "Research bailiffs, charging orders, attachment of earnings",
          category: "research",
          priority: "medium",
          daysFromStart: 14,
        },
      ],
    };
  }
}
