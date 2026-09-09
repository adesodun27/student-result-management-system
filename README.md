# ACADEX — Student Result Management System

A web-based student result management system built for the SEN 106 project assignment. ACADEX allows administrators to manage academic records, lecturers to enter and submit student scores, and students to view their approved results and academic standing.

## Overview

ACADEX handles the full academic result workflow across three user roles:

- **Admin** — manages students, lecturers, courses, and course assignments; approves results before students can see them.
- **Lecturer** — enters continuous assessment (CA) and exam scores for assigned courses, with automatic grade calculation, and submits results for approval.
- **Student** — views approved results, GPA, class of degree, registered courses, and can submit support requests.

## Features

**Authentication**
- Single login for all roles, using Matric Number (students) or Staff ID (lecturers/staff)
- Role-based redirection to the correct dashboard
- Forced password change on first login

**Admin**
- Dashboard with live counts and pending approvals
- Create and manage students, lecturers, and courses
- Assign courses to lecturers and register students into courses
- Approve, return, or reopen submitted results
- View and manage student support requests

**Lecturer**
- View assigned courses
- Enter CA and exam scores with automatic total and grade calculation
- Save drafts and submit results

**Student**
- Dashboard showing GPA and academic status
- View results with pass / carry-over status per course
- CGPA and class of degree (First Class, Second Class Upper, etc.)
- View registered courses and profile
- Submit support requests and track their status

## Grading

- **CA:** max 30 marks
- **Exam:** max 70 marks
- **Grade scale (5.0):** A (70–100), B (60–69), C (50–59), D (45–49), E (40–44), F (below 40)
- A score below 40 in a course is marked as a **carry over**.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend & Database:** Supabase (PostgreSQL, Authentication, Row Level Security)

Security is enforced at the database level using Row Level Security (RLS), so each role can only access the data it is permitted to.

## Getting Started

1. Clone the repository:
git clone https://github.com/adesodun27/student-result-management-system.git
2. Open the project folder in VS Code.
3. Install the **Live Server** extension.
4. Open `pages/login.html`, right-click, and choose **Open with Live Server**.
5. The app runs at `http://127.0.0.1:5500/pages/login.html`.

> Note: The app must be opened through Live Server (not by opening the file directly) so it can connect to the database.

## Project Structure
├── css/ Stylesheets
├── js/ JavaScript (admin, lecturer, student modules)
├── pages/ HTML pages (admin, lecturer, student)
├── Schema.sql Database schema and security policies
└── index.html


## Result Workflow
Admin sets up courses & registrations
↓
Lecturer enters and submits scores
↓
Admin reviews and approves
↓
Student views approved results & GPA