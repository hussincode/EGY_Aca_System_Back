import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  ShadingType
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper styles
const PRIMARY_COLOR = '1E3A8A'; // Deep Blue
const SECONDARY_COLOR = '0D9488'; // Teal
const BG_HEADER = 'F1F5F9'; // Light Slate

function createCell(text, isHeader = false, widthPercent = null, bgHex = null) {
  return new TableCell({
    width: widthPercent ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
    shading: bgHex || isHeader ? { fill: bgHex || BG_HEADER, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 120, bottom: 120, left: 150, right: 150 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: text,
            bold: isHeader,
            size: isHeader ? 19 : 17,
            font: 'Segoe UI',
            color: isHeader ? PRIMARY_COLOR : '334155',
          }),
        ],
      }),
    ],
  });
}

function createHeading1(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 120 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 32,
        font: 'Segoe UI',
        color: PRIMARY_COLOR,
      }),
    ],
  });
}

function createHeading2(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 24,
        font: 'Segoe UI',
        color: SECONDARY_COLOR,
      }),
    ],
  });
}

function createParagraph(text, bold = false, italic = false, color = '1E293B') {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({
        text: text,
        bold: bold,
        italic: italic,
        size: 19,
        font: 'Segoe UI',
        color: color,
      }),
    ],
  });
}

function createBullet(text, boldPrefix = '') {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [
      new TextRun({
        text: boldPrefix,
        bold: true,
        size: 18,
        font: 'Segoe UI',
        color: PRIMARY_COLOR,
      }),
      new TextRun({
        text: text,
        size: 18,
        font: 'Segoe UI',
        color: '334155',
      }),
    ],
  });
}

async function generateDocx() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
          },
        },
        children: [
          // Title Banner
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 150 },
            children: [
              new TextRun({
                text: 'EGYPTIAN ACADEMY SYSTEM (EGY-ACA)',
                bold: true,
                size: 36,
                font: 'Segoe UI',
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: 'Comprehensive Test Document & Quality Assurance Protocol',
                italic: true,
                size: 22,
                font: 'Segoe UI',
                color: SECONDARY_COLOR,
              }),
            ],
          }),

          // Section 1: Executive Summary
          createHeading1('1. Executive Summary & System Architecture'),
          createParagraph(
            'This test document provides a complete QA protocol to verify every API endpoint, button, alert, modal window, lead capture form, and dynamic CMS sync capability across the entire Egyptian Academy System.'
          ),
          createBullet(' Backend Server (egy-aca-back): Express.js REST API with MSSQL database, JWT authentication, and express-validator.', '• Component 1:'),
          createBullet(' Admin Dashboard (egy-aca-front): React & Vite web application managing operations, finance, players, staff, and landing page settings.', '• Component 2:'),
          createBullet(' Landing Page (elite-sports-hub): Dynamic TanStack/Vite marketing site connected to backend settings in real time.', '• Component 3:'),

          // Section 2: Backend API Test Suite
          createHeading1('2. Part I: Backend API Endpoints Test Suite (egy-aca-back)'),
          createParagraph('The backend contains 12 modules and over 35 API routes. The table below lists all endpoints, required permissions, request payloads, expected responses, and error test scenarios:'),

          // Table: API Endpoints
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell('Endpoint', true, 20),
                  createCell('Method', true, 10),
                  createCell('Role Required', true, 15),
                  createCell('Expected Status', true, 15),
                  createCell('Success Response', true, 20),
                  createCell('Error & Boundary Scenario', true, 20),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/api/auth/register'),
                  createCell('POST'),
                  createCell('Public'),
                  createCell('201 Created'),
                  createCell('{ data: { user }, message }'),
                  createCell('Duplicate email -> 409 Conflict; missing fields -> 400'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/api/auth/login'),
                  createCell('POST'),
                  createCell('Public'),
                  createCell('200 OK'),
                  createCell('{ data: { token } }'),
                  createCell('Bad credentials -> 401; empty body -> 400'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/api/branches'),
                  createCell('GET / POST'),
                  createCell('Admin (POST)'),
                  createCell('200 / 201'),
                  createCell('{ data: [branches] }'),
                  createCell('Non-admin user -> 403 Forbidden'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/api/games'),
                  createCell('GET / POST'),
                  createCell('Admin (POST)'),
                  createCell('200 / 201'),
                  createCell('{ data: [games] }'),
                  createCell('Empty sport name -> 400 Bad Request'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/api/players'),
                  createCell('GET / POST / PUT / DELETE'),
                  createCell('Admin, Manager'),
                  createCell('200 / 201'),
                  createCell('{ data: [players] }'),
                  createCell('Missing required player name -> 400'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/api/subscriptions'),
                  createCell('GET / POST'),
                  createCell('Admin, Manager, Accountant'),
                  createCell('200 / 201'),
                  createCell('{ data: [subscriptions] }'),
                  createCell('Paid amount > total price -> balance validation check'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/api/finance'),
                  createCell('GET / POST'),
                  createCell('Admin, Accountant'),
                  createCell('200 / 201'),
                  createCell('{ data: [transactions] }'),
                  createCell('Negative amount value -> 400 Bad Request'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/api/landing-settings'),
                  createCell('GET / POST'),
                  createCell('Public (GET) / Admin (POST)'),
                  createCell('200 OK'),
                  createCell('{ data: { hero, sports, coaches } }'),
                  createCell('Non-admin save -> 403 Forbidden'),
                ],
              }),
            ],
          }),

          // Section 3: Admin Dashboard UI & Buttons
          createHeading1('3. Part II: Admin Dashboard UI & Button Test Suite (egy-aca-front)'),
          createParagraph('Test grid for all pages, action buttons, form submissions, and alert toast feedback:'),

          // Table: UI Controls
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell('Page', true, 15),
                  createCell('Button / Control', true, 20),
                  createCell('Action', true, 25),
                  createCell('Triggered Alert / Toast', true, 20),
                  createCell('Bug Scenario to Verify', true, 20),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Login'),
                  createCell('Sign In Button'),
                  createCell('Authenticates user via POST /api/auth/login'),
                  createCell('Red Toast on error / Green Toast on success'),
                  createCell('Rapid double click during request'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Players'),
                  createCell('+ Add Player'),
                  createCell('Opens player registration modal drawer'),
                  createCell('None'),
                  createCell('ESC key backdrop dismiss check'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Players'),
                  createCell('Save Player'),
                  createCell('Submits form data to POST /api/players'),
                  createCell('Green Toast: "Player added successfully"'),
                  createCell('Submit with empty name or future birth date'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Players'),
                  createCell('Delete (Trash Icon)'),
                  createCell('Triggers deletion confirmation modal'),
                  createCell('Yellow Dialog: "Are you sure?"'),
                  createCell('Cancel vs Confirm action handling'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Subscriptions'),
                  createCell('+ New Subscription'),
                  createCell('Opens subscription creation form'),
                  createCell('None'),
                  createCell('Player autocomplete dropdown validation'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Settings'),
                  createCell('Save Landing Settings'),
                  createCell('Posts CMS JSON to /api/landing-settings'),
                  createCell('Green Toast: "Landing settings updated"'),
                  createCell('XSS payload injection in hero title'),
                ],
              }),
            ],
          }),

          // Section 4: Landing Page Sync
          createHeading1('4. Part III: Landing Page Integration Test Suite (elite-sports-hub)'),
          createParagraph('Validates how changes saved in the system propagate to the public landing page:'),

          createBullet(' Admin updates hero title in Settings.tsx -> POST /api/landing-settings.', '1. Flow Step 1:'),
          createBullet(' Landing page index.tsx fetches latest settings on mount or via BroadcastChannel event.', '2. Flow Step 2:'),
          createBullet(' User submits lead form ("Join Us") -> POST /api/leads -> Lead appears in Admin Leads page.', '3. Flow Step 3:'),

          // Section 5: Alert Catalog
          createHeading1('5. Part IV: Master Alert & Notification Catalog'),
          createHeading2('Success Toasts (Green / Blue)'),
          createBullet(' Triggered on successful login credentials.', '"Logged in successfully":'),
          createBullet(' Triggered after player object creation.', '"Player created successfully":'),
          createBullet(' Triggered when CMS changes are saved.', '"Landing settings updated":'),

          createHeading2('Error Toasts (Red)'),
          createBullet(' HTTP 401 unauthorized response.', '"Invalid credentials":'),
          createBullet(' HTTP 400 validation error from express-validator.', '"Missing required fields":'),
          createBullet(' HTTP 403 authorization error for insufficient privileges.', '"Access forbidden":'),

          // Section 6: Security & Bug Hunting
          createHeading1('6. Part V: Bug Hunting & Edge-Case Protocol'),
          createParagraph('Testing procedures for edge cases, security validation, and boundary limits:'),

          createBullet(' Send unauthenticated request to /api/players. Expected: 401 Unauthorized.', '• Test 1 (Auth Bypass):'),
          createBullet(' Send POST /api/branches from coach account. Expected: 403 Forbidden.', '• Test 2 (Privilege Escalation):'),
          createBullet(' Submit subscription value of -500. Expected: Form validation error.', '• Test 3 (Negative Price):'),
          createBullet(' Open Admin Panel & Landing Page in side-by-side tabs. Change settings & save. Expected: Real-time broadcast update.', '• Test 4 (Dynamic Sync):'),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '../../Egy_Aca_System_Comprehensive_Test_Document.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document successfully created at: ${outputPath}`);
}

generateDocx().catch((err) => {
  console.error('Error generating document:', err);
  process.exit(1);
});
