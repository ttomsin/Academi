# AcademiAI - Technical Overview & Architecture

## Introduction

AcademiAI is a smart, gamified academic companion designed to help university students manage their coursework, deadlines, and study materials intelligently. Unlike traditional, rigid task managers, AcademiAI uses an **Adaptive Heuristic Algorithm** alongside **Large Language Models (LLMs)** to dynamically adjust to the student's real-time physical/mental state, generate personalized study paths, and extract meaningful data directly from raw course materials.

This document serves as a technical breakdown of the system, suitable for understanding the core mechanics ahead of a final year presentation.

---

## 1. System Architecture

The project is built on a modern, serverless-ready stack:

*   **Frontend:** React 19, TypeScript, Tailwind CSS, Vite.
*   **Backend / API:** Node.js, Express.js.
*   **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Realtime subscriptions).
*   **AI Integration:** OpenRouter API (Accessing models like LLaMA 3.3 70B, Qwen, Gemma) using a fallback mechanism to ensure high availability on free tiers.

### The Application Flow
1.  **User Input:** The student interacts with the UI (e.g., uploading a PDF, logging their mood, creating a task).
2.  **API Gateway:** The React frontend securely communicates with the local Express API (`/api/*`) for AI-heavy tasks, or directly to Supabase for standard CRUD operations.
3.  **Data Processing:** If an AI task is triggered (e.g., Syllabus Parsing), the Express server uses `pdf-parse` to extract text from memory buffers, crafts a highly specific prompt with strict JSON constraints, and queries the LLM.
4.  **Database Storage:** The structured data is returned to the client and persisted in Supabase.
5.  **Realtime UI Update:** Supabase's Realtime channels instantly reflect changes across the application (e.g., showing a new notification when a task is automatically rescheduled).

---

## 2. Key Intelligent Features

### 2.1 The Adaptive Heuristic Algorithm (Dynamic Prioritization)
*See `heuristic_algorithm.md` for the full mathematical breakdown.*

Traditional task managers sort tasks by deadline. AcademiAI dynamically calculates a `priority_score` between `0.1` and `0.999` based on:
1.  **Time Urgency:** Proximity to the deadline.
2.  **Syllabus Impact (Weighting):** High-percentage assignments get an automatic priority boost.
3.  **Human Capacity (Mood/Energy):** When the student logs their daily energy levels, the system re-evaluates the difficulty (`estimated_duration_mins`) of pending tasks against their current capacity. Exhausted students are funneled towards quick, easy wins to maintain momentum, while energized students are pushed to tackle complex projects.

**Code Location:** `src/lib/api.ts` -> `recordMood` function.

### 2.2 Intelligent Syllabus Parsing & Auto-Scheduling
When a student uploads a course syllabus PDF, the AI:
1.  Extracts the raw text.
2.  Identifies all major assessments (exams, quizzes, projects).
3.  Extracts the grading weight (e.g., 20%) and due dates.
4.  The system automatically injects these as pending tasks into the student's database, including the extracted `assessment_weight`, which immediately hooks into the Heuristic Algorithm.

**Code Location:** `api/index.ts` -> `/api/ai/parse-syllabus` & `src/pages/CourseSyllabus.tsx`.

### 2.3 AI Study Path Generation
Students can upload raw lecture slides or textbook chapters. The AI analyzes the content and generates a step-by-step study plan.
Crucially, the AI calculates an `estimated_time` for each study step. When the student clicks "Add to Tasks", the application mathematically calculates the correct `scheduled_end` time by adding those minutes to the start time, ensuring the calendar is hyper-accurate.

**Code Location:** `src/pages/MaterialDetails.tsx` -> `handleGeneratePlan`.

### 2.4 Autonomous Task Management & Notifications
The system has built-in autonomy to handle student negligence:
*   On application load, it checks for any tasks where the deadline has passed.
*   **Standard Tasks:** Automatically rescheduled for the next day, and a system notification is pushed to the user.
*   **Exams:** Exams cannot be rescheduled. They are forcefully marked as `incomplete` and a critical warning notification is dispatched.

**Code Location:** `src/store/AppProvider.tsx` -> `fetchInitialData`.

### 2.5 Context-Aware AI Chat
The application features a built-in AI Assistant. Whenever the student sends a message, the system secretly injects:
1.  The student's name, major, and current gamification rank.
2.  The current active courses and pending tasks.
3.  The **exact current server time**.

This allows the AI to give highly specific advice, such as *"It's 10 PM right now, you should focus on finishing your CS101 assignment due tomorrow rather than starting a new project."*

**Code Location:** `src/pages/Chat.tsx` & `api/index.ts` -> `/api/ai/chat`.

---

## 3. Gamification Mechanics

To keep students engaged, the platform relies on an RPG-style ranking system:
*   Completing tasks grants XP (Points).
*   Points threshold dictate the user's Rank (Bronze -> Silver -> Gold -> Platinum -> Diamond -> Master -> Grandmaster).
*   Progress bars and visual feedback are heavily utilized on the Dashboard.

---

## 4. Presentation Readiness

**Is the app ready for a final year presentation?**
Yes. The application successfully demonstrates a full-stack integration of modern web technologies with practical, real-world AI applications. It goes beyond simple "wrapper" AI apps by using AI to drive a deterministic mathematical algorithm (The Heuristic Engine), showcasing both prompt engineering and traditional software architecture.

**Demo Tips for Presentation:**
1.  **Show the Automation:** Let a task expire, refresh the page, and show the judges how the system autonomously handled it (rescheduled vs. incomplete) and generated a notification.
2.  **Show the Parse:** Upload a syllabus. Show how raw, unstructured PDF text magically becomes structured, actionable, weighted tasks on the calendar.
3.  **Show the Heuristic:** Have a high-effort task and a low-effort task. Log an "Exhausted" mood and show the low-effort task jump to the top. Then log an "Energized" mood and show the high-effort task take over. This is the "wow" factor of the application.