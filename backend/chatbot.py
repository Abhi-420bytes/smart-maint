"""
Sprint 5: Domain-Specific Performance Chatbot
Rule-based NLP engine for answering maintenance, risk, and infrastructure queries.
No external LLM API required — fully self-contained.
"""

import re
from typing import Optional

# ---------------------------------------------------------------------------
# Intent patterns — ordered from most specific to most general
# ---------------------------------------------------------------------------
INTENT_PATTERNS = [
    # Maintenance score / effort
    (r"\b(maintenance.?score|effort.?score|maint.?effort|how.?hard.?maintain)\b",
     "maintenance_score"),
    # High risk modules
    (r"\b(high.?risk|risky.?module|risk.?file|dangerous.?module|which.?module.?risk)\b",
     "high_risk"),
    # Complexity
    (r"\b(complex|cyclomatic|complexity)\b",
     "complexity"),
    # Coupling
    (r"\b(coupling|depend|import|tight.?coupl)\b",
     "coupling"),
    # LOC / lines of code
    (r"\b(loc|lines.?of.?code|code.?size|how.?big)\b",
     "loc"),
    # Traffic / users
    (r"\b(traffic|user.?growth|concurrent.?user|visitor|load|request.?per)\b",
     "traffic"),
    # Server / capacity
    (r"\b(server|capacity|cpu|ram|memory|storage|bandwidth|instance|cloud)\b",
     "capacity"),
    # Scaling
    (r"\b(scal|upgrade|tier|auto.?scal|infrastructure|infra)\b",
     "scaling"),
    # Cost
    (r"\b(cost|price|budget|dollar|usd|spend|expensive)\b",
     "cost"),
    # CI/CD
    (r"\b(ci.?cd|pipeline|deploy|github.?action|automat)\b",
     "cicd"),
    # Refactoring
    (r"\b(refactor|rewrite|clean.?up|technical.?debt|improve.?code)\b",
     "refactoring"),
    # General help
    (r"\b(help|what.?can|feature|capabilit|what.?do)\b",
     "help"),
    # Greeting
    (r"^(hi|hello|hey|howdy|greetings|good\s+(morning|afternoon|evening))[\s!?.]*$",
     "greeting"),
]

# ---------------------------------------------------------------------------
# Response templates
# ---------------------------------------------------------------------------
RESPONSES = {
    "greeting": (
        "Hello! I'm the SMART-MAINT assistant. I can help you understand:\n"
        "• **Maintenance effort scores** — how hard your code is to maintain\n"
        "• **High-risk modules** — files most likely to cause maintenance problems\n"
        "• **Traffic forecasts** — projected user growth over time\n"
        "• **Server capacity** — CPU, RAM, and scaling recommendations\n\n"
        "Try asking: *'Which modules are high risk?'* or *'What server do I need for 1000 users?'*"
    ),

    "maintenance_score": (
        "## Maintenance Effort Score\n\n"
        "The **Maintenance Effort Score** (0–100) measures how difficult a file will be to maintain. "
        "It is calculated using:\n\n"
        "```\nScore = 0.4 × Complexity + 0.2 × Coupling + 0.1 × LOC + 0.3 × Change Frequency\n```\n\n"
        "| Range | Meaning |\n"
        "|-------|---------|\n"
        "| 0–40  | ✅ Low effort — easy to maintain |\n"
        "| 41–70 | ⚠️ Medium effort — monitor regularly |\n"
        "| 71–100 | 🔴 High effort — refactoring recommended |\n\n"
        "Run an analysis on your project folder to see scores for each file."
    ),

    "high_risk": (
        "## High-Risk Modules\n\n"
        "A module is flagged **High Risk** when its Maintenance Effort Score exceeds **70/100**.\n\n"
        "High-risk files typically have:\n"
        "- High **cyclomatic complexity** (many branches, loops, conditions)\n"
        "- High **coupling** (many imports/dependencies)\n"
        "- Frequent **git commits** (constantly changing code)\n"
        "- Large **lines of code** (monolithic files)\n\n"
        "**Recommended actions:**\n"
        "1. Break large functions into smaller, single-responsibility units\n"
        "2. Reduce imports by applying dependency injection\n"
        "3. Add unit tests before refactoring\n"
        "4. Use the dashboard table to sort by score and prioritize the top files"
    ),

    "complexity": (
        "## Cyclomatic Complexity\n\n"
        "**Cyclomatic complexity** counts the number of independent paths through your code. "
        "It increases with every `if`, `while`, `for`, `case`, `catch`, `&&`, `||`, or `?` operator.\n\n"
        "| Score | Meaning |\n"
        "|-------|---------|\n"
        "| 1–10  | ✅ Simple, easy to test |\n"
        "| 11–20 | ⚠️ Moderate — consider splitting |\n"
        "| 21–50 | 🔴 Complex — hard to test and maintain |\n"
        "| 50+   | 🚨 Very high — refactor immediately |\n\n"
        "SMART-MAINT uses complexity as the **highest-weighted factor (40%)** in the maintenance score."
    ),

    "coupling": (
        "## Coupling\n\n"
        "**Coupling** measures how many external modules a file depends on (import/require/include statements).\n\n"
        "High coupling means:\n"
        "- A change in one module can break many others\n"
        "- Testing requires mocking many dependencies\n"
        "- Harder to reuse or move code\n\n"
        "**Best practices to reduce coupling:**\n"
        "- Apply the **Single Responsibility Principle**\n"
        "- Use **dependency injection** instead of direct imports\n"
        "- Create **interface abstractions** between layers\n\n"
        "Coupling contributes **20%** to the maintenance effort score."
    ),

    "loc": (
        "## Lines of Code (LOC)\n\n"
        "LOC counts **non-empty lines** in each source file. While LOC alone doesn't indicate quality, "
        "very large files are harder to navigate, review, and test.\n\n"
        "**General guidelines:**\n"
        "- Functions: keep under **50 lines**\n"
        "- Files: keep under **300–500 lines**\n"
        "- Files over **1000 lines** are candidates for splitting\n\n"
        "LOC contributes **10%** to the maintenance effort score (lowest weight)."
    ),

    "traffic": (
        "## Traffic Growth Simulation\n\n"
        "The **Traffic Simulator** projects user growth using compound growth:\n\n"
        "```\nUsers(month) = CurrentUsers × (1 + GrowthRate)^month\n```\n\n"
        "It also estimates **peak load** (3× average concurrent users) to size infrastructure for worst-case scenarios.\n\n"
        "Use the **Traffic & Scaling** tab to:\n"
        "- Set your current user count\n"
        "- Choose a monthly growth rate (%)\n"
        "- Select a projection horizon (3–24 months)\n\n"
        "The chart will show your growth curve and flag when you need to scale up."
    ),

    "capacity": (
        "## Server Capacity Estimation\n\n"
        "SMART-MAINT estimates required resources based on **peak concurrent users**:\n\n"
        "| Resource | Formula |\n"
        "|----------|---------|\n"
        "| CPU | 1 vCPU per 100 users |\n"
        "| RAM | 0.5 GB per 100 users |\n"
        "| Storage | 20 GB base + 5 GB per 1000 users |\n"
        "| Bandwidth | 10 Mbps per 100 users |\n\n"
        "**Scaling tiers:**\n"
        "- 🟢 **Starter** (≤100 users): t3.small — ~$15/month\n"
        "- 🔵 **Growth** (≤500 users): t3.medium — ~$40/month\n"
        "- 🟡 **Scale** (≤2000 users): t3.large — ~$120/month\n"
        "- 🟠 **Enterprise** (≤10000 users): c5.xlarge — ~$350/month\n"
        "- 🔴 **Hyperscale** (10000+ users): Auto-scaling cluster"
    ),

    "scaling": (
        "## Scaling Recommendations\n\n"
        "SMART-MAINT provides **proactive scaling advice** based on your traffic projections:\n\n"
        "**Vertical scaling** (scale up): Upgrade to a larger instance type when CPU/RAM is the bottleneck.\n\n"
        "**Horizontal scaling** (scale out): Add more instances behind a load balancer for high availability.\n\n"
        "**When to act:**\n"
        "- CPU consistently > 70% → scale up or out\n"
        "- RAM usage > 80% → add memory or split services\n"
        "- Growth rate > 20%/month → enable **auto-scaling policies**\n"
        "- Growth rate > 50%/month → add **CDN** and **load balancer** immediately\n\n"
        "Check the **Scaling Recommendations** panel after running a traffic simulation."
    ),

    "cost": (
        "## Cost Estimation\n\n"
        "Estimated monthly cloud costs by tier (AWS/GCP approximate pricing):\n\n"
        "| Tier | Users | Instance | Est. Cost/Month |\n"
        "|------|-------|----------|-----------------|\n"
        "| Starter | ≤100 | t3.small | ~$15 |\n"
        "| Growth | ≤500 | t3.medium | ~$40 |\n"
        "| Scale | ≤2000 | t3.large | ~$120 |\n"
        "| Enterprise | ≤10000 | c5.xlarge | ~$350 |\n"
        "| Hyperscale | 10000+ | Auto-scaling | Variable |\n\n"
        "These are **compute-only** estimates. Add costs for storage, bandwidth, database, and CDN separately.\n\n"
        "Run a traffic simulation to get a cost projection over your chosen time horizon."
    ),

    "cicd": (
        "## CI/CD Automation\n\n"
        "SMART-MAINT uses **GitHub Actions** for continuous integration and deployment:\n\n"
        "**Pipeline stages:**\n"
        "1. **Trigger** — on every push to `main` or pull request\n"
        "2. **Install** — install Python and Node.js dependencies\n"
        "3. **Test** — run backend unit tests\n"
        "4. **Build** — build the React frontend\n"
        "5. **Deploy** — deploy to Render (backend) and Vercel (frontend)\n\n"
        "The workflow file is located at `.github/workflows/deploy.yml`.\n\n"
        "This ensures every code change is automatically validated and deployed without manual steps."
    ),

    "refactoring": (
        "## Refactoring Guidance\n\n"
        "When SMART-MAINT flags a file as **High Risk**, here's a prioritized refactoring approach:\n\n"
        "1. **Write tests first** — ensure existing behavior is captured before changing code\n"
        "2. **Extract functions** — break large functions into smaller, named units\n"
        "3. **Reduce complexity** — replace nested conditionals with early returns or strategy patterns\n"
        "4. **Decouple modules** — move shared logic to utility modules, reduce direct imports\n"
        "5. **Split large files** — files over 500 LOC should be split by responsibility\n"
        "6. **Re-analyze** — run SMART-MAINT again to verify the score improved\n\n"
        "Focus on the **top 3 highest-scoring files** first for maximum impact."
    ),

    "help": (
        "## What SMART-MAINT Can Do\n\n"
        "**Code Analysis (Sprint 1 & 2)**\n"
        "- Scan any project folder for source files\n"
        "- Compute LOC, cyclomatic complexity, coupling, and git change frequency\n"
        "- Generate a Maintenance Effort Score (0–100) per file\n"
        "- Identify high-risk modules needing refactoring\n\n"
        "**Traffic & Capacity (Sprint 4)**\n"
        "- Simulate user traffic growth over 3–24 months\n"
        "- Estimate required CPU, RAM, storage, and bandwidth\n"
        "- Recommend cloud instance types and scaling strategies\n\n"
        "**Chatbot (Sprint 5)**\n"
        "- Ask questions in plain English about maintenance, risk, traffic, or infrastructure\n\n"
        "**Try asking:**\n"
        "- *'Which modules are high risk?'*\n"
        "- *'What does the maintenance score mean?'*\n"
        "- *'How much server do I need for 5000 users?'*\n"
        "- *'When should I scale up?'*"
    ),

    "unknown": (
        "I'm not sure I understood that. I'm specialized in:\n\n"
        "- **Maintenance scores** and **high-risk modules**\n"
        "- **Code complexity**, **coupling**, and **LOC**\n"
        "- **Traffic simulation** and **server capacity**\n"
        "- **Scaling recommendations** and **CI/CD pipelines**\n\n"
        "Try rephrasing your question, or type **'help'** to see what I can answer."
    ),
}


def detect_intent(message: str) -> str:
    """Detects the intent of a user message using regex pattern matching."""
    text = message.lower().strip()
    for pattern, intent in INTENT_PATTERNS:
        if re.search(pattern, text):
            return intent
    return "unknown"


def get_chatbot_response(message: str, context: Optional[dict] = None) -> dict:
    """
    Main chatbot entry point.
    Returns a structured response with intent, answer, and optional suggestions.
    """
    if not message or not message.strip():
        return {
            "intent": "empty",
            "response": "Please type a question. Try *'help'* to see what I can answer.",
            "suggestions": ["help", "What is a maintenance score?", "Which modules are high risk?"],
        }

    intent = detect_intent(message)
    response_text = RESPONSES.get(intent, RESPONSES["unknown"])

    # Contextual enrichment: if analysis data is available, inject real numbers
    if context and intent == "high_risk" and context.get("high_risk_files"):
        files = context["high_risk_files"][:5]
        names = "\n".join([f"- `{f['file']}` (score: {f['score']})" for f in files])
        response_text += f"\n\n**Your current high-risk files:**\n{names}"

    if context and intent == "maintenance_score" and context.get("average_score") is not None:
        avg = context["average_score"]
        response_text += f"\n\n**Your project's average score: {avg}/100**"

    # Suggest follow-up questions
    suggestions_map = {
        "greeting": ["What is a maintenance score?", "Which modules are high risk?", "How does traffic simulation work?"],
        "maintenance_score": ["Which modules are high risk?", "What is cyclomatic complexity?", "How do I reduce my score?"],
        "high_risk": ["What is cyclomatic complexity?", "How do I refactor high-risk code?", "What is coupling?"],
        "complexity": ["What is coupling?", "How is the maintenance score calculated?", "Which modules are high risk?"],
        "coupling": ["What is cyclomatic complexity?", "How do I reduce coupling?", "What is a maintenance score?"],
        "traffic": ["How is server capacity estimated?", "When should I scale up?", "What does scaling cost?"],
        "capacity": ["What are the scaling tiers?", "How much does it cost?", "When should I scale?"],
        "scaling": ["What does scaling cost?", "How is capacity estimated?", "What is auto-scaling?"],
        "cost": ["How is capacity estimated?", "When should I scale?", "What is the growth rate?"],
        "cicd": ["How do I deploy to Render?", "What is GitHub Actions?", "How do I trigger analysis automatically?"],
        "refactoring": ["Which modules are high risk?", "What is cyclomatic complexity?", "What is coupling?"],
        "help": ["What is a maintenance score?", "How does traffic simulation work?", "Which modules are high risk?"],
        "unknown": ["help", "What is a maintenance score?", "How does traffic simulation work?"],
    }

    return {
        "intent": intent,
        "response": response_text,
        "suggestions": suggestions_map.get(intent, ["help"]),
    }
