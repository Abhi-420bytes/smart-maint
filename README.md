# 🚀 SMART-MAINT

> AI-powered Software Maintenance Intelligence Platform for Code Analysis, Maintenance Prediction, Risk Detection, Traffic Simulation, and Server Capacity Estimation.

![Python](https://img.shields.io/badge/Python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)
![React](https://img.shields.io/badge/React-Frontend-61dafb)
![AWS](https://img.shields.io/badge/AWS-S3-orange)
![GitHub Actions](https://img.shields.io/badge/GitHub-Actions-black)
![License](https://img.shields.io/badge/License-MIT-success)

---

# 📖 Overview

Software maintenance consumes a significant portion of the software development lifecycle, requiring developers to continuously identify complex code, prioritize refactoring, estimate maintenance effort, and plan infrastructure scaling. Manual analysis of large repositories is time-consuming and often lacks actionable insights.

SMART-MAINT is an AI-powered software maintenance platform that automatically analyzes software repositories, computes code quality metrics, predicts maintenance effort, identifies high-risk modules, forecasts infrastructure growth, estimates cloud capacity requirements, and provides intelligent recommendations through an interactive dashboard and chatbot.

---

# 🎯 Objectives

- Analyze software repositories automatically
- Estimate software maintenance effort
- Detect high-risk modules
- Recommend refactoring strategies
- Simulate future traffic growth
- Estimate server capacity
- Automate CI/CD workflows
- Generate professional PDF reports
- Provide AI-powered chatbot assistance

---

# 🚀 Key Features

## 📁 Code Repository Analysis

- Local Folder Analysis
- Public GitHub Repository Analysis
- Multi-language Source Code Support (40+ file types)

---

## 📊 Code Metrics

Automatically computes:

- Lines of Code (LOC)
- Cyclomatic Complexity
- Coupling Score
- Git Change Frequency
- Maintenance Effort Score

---

## ⚠️ Risk Detection

Files are classified into:

🟥 High Risk

🟨 Medium Risk

🟩 Stable

The platform also generates AI-powered refactoring recommendations.

---

## 📈 Traffic Simulation

Forecasts future application traffic using compound growth models.

Provides:

- Monthly Growth Projection
- Peak Concurrent Users
- Cost Projection
- Resource Planning

---

## ☁️ Server Capacity Estimation

Estimates:

- CPU
- RAM
- Storage
- Network Bandwidth
- Infrastructure Tier

Supports multiple cloud deployment scenarios.

---

## 🤖 AI Chatbot

Interactive assistant capable of answering:

- Maintenance Score
- High-Risk Files
- Complexity
- Scaling
- Infrastructure
- CI/CD
- Refactoring Advice
- Capacity Planning

---

## 📄 PDF Report Generator

Exports:

- Executive Summary
- Risk Distribution
- AI Recommendations
- Complete File Analysis
- Infrastructure Planning

---

# 🏗️ System Architecture

```
Local Folder / GitHub Repository
                 │
                 ▼
        Source Code Scanner
                 │
                 ▼
     Metrics Computation Engine
      • LOC
      • Complexity
      • Coupling
      • Git History
                 │
                 ▼
     Maintenance Score Engine
                 │
                 ▼
      Risk Classification
                 │
        ┌────────┴─────────┐
        ▼                  ▼
 AI Recommendations   Traffic Simulation
                             │
                             ▼
                 Capacity Estimation
                             │
                             ▼
                  Chatbot Assistant
                             │
                             ▼
              Interactive Dashboard
```

---

# 📂 Project Structure

```
smart-maint
│
├── backend
│   ├── scanner.py
│   ├── scoring.py
│   ├── traffic.py
│   ├── chatbot.py
│   ├── auth.py
│   ├── pdf_report.py
│   ├── cloud_storage.py
│   └── app.py
│
├── frontend
│   ├── src
│   ├── components
│   ├── pages
│   └── assets
│
├── reports
│
├── tests
│
├── .github
│   └── workflows
│
├── requirements.txt
│
└── README.md
```

---

# ⚙️ Technology Stack

| Layer | Technology |
|---------|------------|
| Frontend | React.js |
| Backend | FastAPI |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Authentication | Google OAuth, GitHub OAuth |
| Cloud Storage | AWS S3 |
| CI/CD | GitHub Actions |
| Deployment | Render, Vercel |
| PDF Reports | ReportLab |
| Testing | Pytest, Vitest |

---

# 📊 Code Metrics

The platform computes:

- Lines of Code (LOC)
- Cyclomatic Complexity
- Coupling
- Git Commit Frequency
- Weighted Maintenance Score

Maintenance Score Formula:

```
Score =
0.4 × Complexity +
0.2 × Coupling +
0.1 × LOC +
0.3 × Git Change Frequency
```

---

# 📈 Risk Classification

| Score | Risk Level |
|---------|------------|
| >70 | High Risk |
| 41–70 | Medium Risk |
| ≤40 | Stable |

---

# 📊 Dashboard Features

- Maintenance Overview
- Risk Distribution
- Complexity Analysis
- Traffic Forecast
- Capacity Estimation
- AI Recommendations
- Interactive Charts
- Heatmaps

---

# ☁️ Infrastructure Planning

Traffic simulation estimates:

- Future Users
- Concurrent Users
- Peak Load
- CPU Requirements
- RAM Requirements
- Storage
- Monthly Infrastructure Cost

---

# 🤖 AI Recommendation Engine

The recommendation engine analyzes code metrics and suggests:

- Function decomposition
- Dependency reduction
- Security review
- Refactoring opportunities
- Performance improvements
- Maintainability enhancements

---

# 📄 API Endpoints

| Method | Endpoint | Purpose |
|---------|----------|---------|
| POST | /api/analyze | Analyze Repository |
| POST | /api/analyze/github | Analyze GitHub Repository |
| POST | /api/analyze/filter | Filter Results |
| POST | /api/analyze/export | Export Analysis |
| POST | /api/traffic | Traffic Simulation |
| POST | /api/chat | Chatbot |
| GET | /api/reports | Report Listing |
| POST | /api/analyze/pdf | Generate PDF |

---

# 🔒 Authentication

Supports:

- Email Login
- Google OAuth
- GitHub OAuth

---

# 📊 Testing

Backend

- 21 Unit Tests
- Pytest

Frontend

- 24 UI Tests
- Vitest

Total Tests

**45 Automated Tests**

---

# 🚀 Installation

Clone Repository

```bash
git clone https://github.com/yourusername/smart-maint.git

cd smart-maint
```

Install Backend

```bash
pip install -r requirements.txt
```

Run Backend

```bash
uvicorn app:app --reload
```

Run Frontend

```bash
npm install

npm run dev
```

---

# 🌍 Applications

- Software Maintenance
- Technical Debt Analysis
- Code Quality Assessment
- DevOps Planning
- Infrastructure Forecasting
- Cloud Capacity Planning
- Engineering Management
- Software Project Analytics

---

# 🔮 Future Enhancements

- Machine Learning-based Maintenance Prediction
- GitHub Enterprise Support
- Kubernetes Resource Estimation
- Docker Deployment
- SonarQube Integration
- Multi-cloud Cost Optimization
- LLM-powered Refactoring Suggestions
- Predictive Technical Debt Analysis

---

# 📊 Project Highlights

- Full-Stack Web Application
- Software Repository Analysis
- AI-based Maintenance Prediction
- Risk Detection Dashboard
- Cloud Infrastructure Planning
- Traffic Growth Simulation
- Interactive Chatbot
- PDF Report Generation
- CI/CD Automation
- OAuth Authentication
- AWS Cloud Integration

---

# 👨‍💻 Authors

**Challa Abhi Ram**

B.Tech Artificial Intelligence Engineering

Amrita School of Computing

Amrita Vishwa Vidyapeetham

---

**Shilpita V.**

Amrita School of Computing

---

**Mukkeshh**

Amrita School of Computing

---

# 🙏 Acknowledgement

We sincerely thank **Amrita Vishwa Vidyapeetham** for providing the academic environment, guidance, and resources that supported the development of SMART-MAINT. We also acknowledge the use of open-source technologies, including React, FastAPI, AWS S3, GitHub Actions, ReportLab, and other community-driven tools that made this project possible.

---

# 📜 License

This project is intended for academic and research purposes.

Feel free to fork, improve, and cite the work.

⭐ If you find this project useful, consider giving it a star!
