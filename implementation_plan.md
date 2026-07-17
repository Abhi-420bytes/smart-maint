# Sprint 1 Implementation Plan

## Goal Description
The objective of Sprint 1 is to **Establish maintenance intelligence foundation through code analysis**. This involves parsing a project's source code to extract complexity metrics (LOC, Cylomatic Complexity, Coupling) and generating a "Maintenance Effort Score". This data is then visualized on a basic initial dashboard.

## Proposed Changes

We will split the repository into `backend` and `frontend` folders.

### Backend (Python/FastAPI)
- **Framework**: FastAPI (for quick, lightweight API development).
- **Core Library for Parsing**: `radon` for Python code complexity and `os` module for folder scanning.
- **Endpoints**:
  - `POST /api/analyze`: Takes a local absolute directory path and returns the computed metrics.
- **Files**:
  - `backend/main.py`: The FastAPI application and endpoints.
  - `backend/scanner.py`: Logic to traverse directories and parse files.
  - `backend/scoring.py`: Logic to assign a 0-100 "Maintenance Effort Score".
  - `backend/requirements.txt`: Dependencies list.

### Frontend (React.js/Vite)
- **Framework**: React.js with Vite for fast builds.
- **Styling**: TailwindCSS for instant, modern styling.
- **Components**:
  - `frontend/src/App.jsx`: Main routing/view.
  - `frontend/src/components/Dashboard.jsx`: The layout to display the maintenance metrics.
  - `frontend/src/components/MetricCard.jsx`: Reusable component for displaying numbers visually.

## Verification Plan

### Automated Tests
Currently, we will establish manual verification since the dashboard is UI-heavy.

### Manual Verification
1. Start the FastAPI backend on `localhost:8000`.
2. Start the React frontend on `localhost:5173`.
3. Open the Dashboard in the browser.
4. Input the absolute path of the current software engineering folder (or backend itself) into the dashboard.
5. Hit "Analyze".
6. Verify the dashboard correctly visualizes:
   - Total files parsed
   - Total Lines of Code
   - Average Cyclomatic Complexity
   - Maintenance Effort Score
7. Validate that backend raises appropriate errors if an invalid path is provided.
