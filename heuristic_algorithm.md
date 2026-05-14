# Adaptive Heuristic Task Prioritization Algorithm

This document outlines the heuristic algorithm used in AcademiAI to dynamically recalculate task priorities based on a user's real-time mood, energy levels, and academic deadlines.

## Objective

The goal of this algorithm is to provide a smart, adaptive study plan that feels human. Instead of rigidly forcing tasks based solely on deadlines, the system accounts for how the user is feeling. If a user is exhausted, it prioritizes lighter tasks to keep momentum going. If a user is highly energized, it encourages tackling the most challenging assignments.

## Core Factors

The algorithm calculates a `priority_score` (ranging from `0.0` to `1.0`) for each pending task. The base score starts at `0.5`, and is then adjusted based on four primary factors:

1.  **Deadline Proximity (Time Urgency)**
2.  **Syllabus Weighting (High Impact)**
3.  **User Energy Level (Capacity)**
4.  **Task Estimated Duration (Effort Required)**

### 1. Deadline Proximity
Deadlines are critical in academia. The closer a task is to its deadline, the higher its priority score gets boosted.

*   **Urgent (≤ 1 day):** `+0.40`
*   **Approaching (≤ 3 days):** `+0.20`
*   **Upcoming (≤ 7 days):** `+0.10`

### 2. Syllabus Weighting (Impact)
Tasks that represent a larger portion of a student's grade should inherently demand more attention. When the AI Syllabus Analyzer extracts the `assessment_weight` (a percentage from 0 to 100) of a given assignment or exam, that weight is factored directly into the task's priority.

*   **Calculation:** `+ (assessment_weight / 100)`
*   *Example:* A final exam worth 40% of the grade adds `+0.40` to the priority score. A minor quiz worth 5% adds `+0.05`.

### 3. Energy Level vs. Effort (The Heuristic)
This is where the algorithm becomes adaptive. When a user records their mood and energy level (on a scale of 1 to 10), the system evaluates their capacity against the effort required for each task (estimated duration).

*   **Low Energy State (Energy ≤ 4):**
    *   The user is tired or stressed. The goal is to maintain momentum without causing burnout.
    *   *Quick Tasks (≤ 30 mins):* `+0.20` (Encourages easy wins)
    *   *Long Tasks (> 30 mins):* `-0.15` (De-prioritizes heavy mental loads)
*   **High Energy State (Energy ≥ 8):**
    *   The user is focused and ready to work. The goal is to tackle the hardest challenges now.
    *   *Long/Complex Tasks (≥ 60 mins):* `+0.20` (Capitalizes on peak energy)
*   **Neutral Energy State (Energy 5 - 7):**
    *   No specific heuristic adjustments are made based on energy; deadlines primarily drive the priority.

## Calculation Process

1.  **Trigger:** The user inputs their current mood and energy levels via the dashboard.
2.  **Fetch:** The system retrieves all `pending` tasks for the user.
3.  **Evaluate:** For each task:
    *   Initialize `P = 0.5`
    *   Add Deadline Bonus to `P`
    *   Add Syllabus Weight Bonus to `P`
    *   Apply Energy/Effort Adjustments to `P`
4.  **Normalize:** Ensure the final `priority_score` is strictly bounded between `0.1` and `0.999`.
    *   `P = Math.min(Math.max(P, 0.1), 0.999)`
5.  **Update:** The new scores are saved to the database.
6.  **Reflect:** The UI (e.g., Dashboard, Schedule suggestions) immediately re-sorts tasks based on the new `priority_score`, presenting an optimized study plan for the current moment.

## Future Enhancements
*   **Historical Accuracy:** Adjusting the estimated duration based on how long similar tasks took the user in the past.
*   **Mood Trend Analysis:** If a user reports low energy for consecutive days, the system could proactively suggest taking a break or automatically spreading out deadlines.