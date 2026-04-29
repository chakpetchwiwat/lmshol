# Implementation Plan - Phase 10.1: Certificate Template Engine

This phase introduces a robust template selection system for certificates, allowing administrators to choose between different visual styles for each course.

## User Review Required

> [!IMPORTANT]
> **Native Rendering Strategy**: We will continue using `pdfkit` for all templates. The `templateHtml` and `templateCss` fields in the database will store "Metadata" or "Structure Identifiers" rather than raw HTML/CSS to ensure high-performance rendering on Vercel without Chromium.

## Proposed Changes

### Wave 1: Data & Configuration Foundations
- **[MODIFY] prisma/seed.ts**: Seed the `CertificateTemplate` table with three unique records:
  - `CLASSIC_001`: Elegant, formal, traditional.
  - `MODERN_001`: Clean, geometric, contemporary.
  - `MINIMAL_001`: Sophisticated, high-whitespace, typography-focused.
- **[NEW] src/config/certificateTemplates.js**: A mapping file that links `templateId` to specific rendering configurations (colors, font sizes, layout constants).

### Wave 2: Multi-Template PDF Engine
- **[MODIFY] src/services/admin/certificatePdf.service.js**:
  - Refactor `generatePdfBuffer` to act as an orchestrator.
  - **Template Implementation Details**:
    - `drawClassic()`: Uses a dual-line border (gold/black), centered formal header, and a watermark or decorative corner elements.
    - `drawModern()`: Uses an asymmetrical layout, a solid color bar on one side, and bold "sans-serif" style positioning for the learner's name.
    - `drawMinimal()`: Removes all borders, uses a large tracking/letter-spacing for the title, and positions all details with extreme precision for a "premium" feel.
- **[MODIFY] src/services/admin/certificate.service.js**: Update the certificate creation logic to fetch the course's `templateId` and pass it to the PDF service.

### Wave 3: Admin UI - Selection & Preview
- **[NEW] src/components/admin/CertificateTemplateSelector.jsx**:
  - A grid of cards showing available templates.
  - Each card includes a high-quality preview thumbnail.
  - Displays "Selected" state with a checkmark and primary border.
- **[MODIFY] src/pages/admin/CourseEditor.jsx**: 
  - Integrate the selector into the "Certificate" tab.
  - Implement the "Save" logic to update `CourseCertificateSetting.templateId`.
- **[NEW] src/assets/images/templates/**: Store visual assets (SVG or PNG) representing the previews of the templates.

---

## Technical Specifications

| Feature | Classic | Modern | Minimal |
| :--- | :--- | :--- | :--- |
| **Primary Color** | Navy (#1a3a5a) | Charcoal (#1f2937) | Soft Grey (#4b5563) |
| **Accent Color** | Gold (#d4af37) | Electric Blue (#3b82f6) | None (Pure Typography) |
| **Border Style** | Double-line Decorative | None / Side Accent Bar | None |
| **Typography** | Formal Serif-style | Bold Sans-serif style | Light/Thin Spaced |

---

## Verification Plan

### Manual Verification
1.  **Template Switching**: Change template in Course Editor, save, and ensure it persists in the DB.
2.  **Visual Fidelity**: Use a test script to generate one PDF for each template type and compare against design expectations.
3.  **Real-world Issuance**: Use the "Issue Manual" button in the admin dashboard to generate a live certificate and verify the selected style is applied.

### Regression Testing
- Verify that standard Thai character rendering (vowels/tones) remains perfect across all three new layouts.
