"""
Sprint 4: Traffic Simulation & Server Capacity Estimation
Simulates user traffic growth and estimates required server resources.
"""

import math

# --- Constants for capacity estimation ---
# Assumptions per concurrent user
CPU_CORES_PER_100_USERS = 1.0      # 1 vCPU per 100 concurrent users
RAM_GB_PER_100_USERS = 0.5         # 0.5 GB RAM per 100 concurrent users
STORAGE_GB_BASE = 20               # Base OS + app storage
STORAGE_GB_PER_1000_USERS = 5      # Additional storage per 1000 users (logs, data)
BANDWIDTH_MBPS_PER_100_USERS = 10  # 10 Mbps per 100 concurrent users


def simulate_traffic_growth(
    current_users: int,
    growth_rate_percent: float,
    months: int
) -> list[dict]:
    """
    Simulates monthly user traffic growth using compound growth formula.
    Returns a list of monthly data points.
    """
    data_points = []
    rate = growth_rate_percent / 100.0

    for month in range(months + 1):
        projected_users = int(current_users * math.pow(1 + rate, month))
        # Peak load is typically 3x average concurrent users
        peak_users = projected_users * 3
        data_points.append({
            "month": month,
            "label": f"Month {month}" if month > 0 else "Now",
            "avg_concurrent_users": projected_users,
            "peak_concurrent_users": peak_users,
        })

    return data_points


def estimate_server_capacity(concurrent_users: int) -> dict:
    """
    Estimates required server resources for a given number of concurrent users.
    Returns CPU, RAM, Storage, and Bandwidth recommendations.
    """
    # Scale resources based on user count
    cpu_cores = max(1, math.ceil((concurrent_users / 100) * CPU_CORES_PER_100_USERS))
    ram_gb = max(2, math.ceil((concurrent_users / 100) * RAM_GB_PER_100_USERS * 2) / 2 * 2)
    storage_gb = STORAGE_GB_BASE + math.ceil((concurrent_users / 1000) * STORAGE_GB_PER_1000_USERS)
    bandwidth_mbps = max(10, math.ceil((concurrent_users / 100) * BANDWIDTH_MBPS_PER_100_USERS))

    # Determine scaling tier
    if concurrent_users <= 100:
        tier = "Starter"
        instance_type = "t3.small (AWS) / e2-small (GCP)"
        monthly_cost_usd = 15
    elif concurrent_users <= 500:
        tier = "Growth"
        instance_type = "t3.medium (AWS) / e2-medium (GCP)"
        monthly_cost_usd = 40
    elif concurrent_users <= 2000:
        tier = "Scale"
        instance_type = "t3.large (AWS) / e2-standard-2 (GCP)"
        monthly_cost_usd = 120
    elif concurrent_users <= 10000:
        tier = "Enterprise"
        instance_type = "c5.xlarge (AWS) / c2-standard-4 (GCP)"
        monthly_cost_usd = 350
    else:
        tier = "Hyperscale"
        instance_type = "c5.4xlarge + Auto-scaling group (AWS)"
        monthly_cost_usd = concurrent_users // 10  # rough estimate

    return {
        "concurrent_users": concurrent_users,
        "cpu_cores": cpu_cores,
        "ram_gb": ram_gb,
        "storage_gb": storage_gb,
        "bandwidth_mbps": bandwidth_mbps,
        "tier": tier,
        "instance_type": instance_type,
        "estimated_monthly_cost_usd": monthly_cost_usd,
    }


def generate_scaling_recommendation(
    current_users: int,
    growth_rate_percent: float,
    months: int
) -> dict:
    """
    Full traffic + capacity report combining simulation and estimation.
    """
    traffic_data = simulate_traffic_growth(current_users, growth_rate_percent, months)

    # Capacity at each key milestone
    capacity_timeline = []
    for point in traffic_data:
        cap = estimate_server_capacity(point["peak_concurrent_users"])
        capacity_timeline.append({
            **point,
            "capacity": cap,
        })

    # Determine if scaling is needed
    current_cap = estimate_server_capacity(current_users * 3)
    final_cap = estimate_server_capacity(traffic_data[-1]["peak_concurrent_users"])

    scaling_needed = final_cap["tier"] != current_cap["tier"]
    scaling_advice = []

    if scaling_needed:
        scaling_advice.append(
            f"Upgrade from {current_cap['tier']} to {final_cap['tier']} tier within {months} months."
        )
        scaling_advice.append(
            f"Recommended instance: {final_cap['instance_type']}"
        )
        scaling_advice.append(
            f"Estimated cost increase: ${current_cap['estimated_monthly_cost_usd']} → ${final_cap['estimated_monthly_cost_usd']}/month"
        )
    else:
        scaling_advice.append(
            f"Current {current_cap['tier']} tier is sufficient for the next {months} months."
        )
        scaling_advice.append("Monitor CPU and RAM utilization monthly.")

    if growth_rate_percent > 20:
        scaling_advice.append("High growth rate detected — consider enabling auto-scaling policies.")
    if growth_rate_percent > 50:
        scaling_advice.append("Extreme growth: implement CDN and load balancer immediately.")

    return {
        "input": {
            "current_users": current_users,
            "growth_rate_percent": growth_rate_percent,
            "projection_months": months,
        },
        "traffic_timeline": traffic_data,
        "capacity_timeline": capacity_timeline,
        "current_capacity": current_cap,
        "projected_capacity": final_cap,
        "scaling_needed": scaling_needed,
        "scaling_recommendations": scaling_advice,
    }
