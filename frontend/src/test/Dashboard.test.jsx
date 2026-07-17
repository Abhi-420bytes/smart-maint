/**
 * STORY-13 & STORY-18: Dashboard UI Tests
 * Tests the core UI components and user interactions.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import Dashboard from '../components/Dashboard';

// Mock axios so tests don't hit a real server
vi.mock('axios');

// ── Sample API response data ──────────────────────────────────────────────────
const mockAnalysisResponse = {
  summary: {
    total_files: 5,
    total_loc: 450,
    average_complexity: 8.4,
    average_maintenance_score: 42.5,
    high_risk_count: 1,
    medium_risk_count: 2,
    low_risk_count: 2,
  },
  details: [
    { file: 'main.py', loc: 200, complexity: 25, coupling: 8, change_frequency: 12, score: 78.5, is_high_risk: true },
    { file: 'scanner.py', loc: 90, complexity: 12, coupling: 4, change_frequency: 5, score: 55.2, is_high_risk: false },
    { file: 'scoring.py', loc: 60, complexity: 6, coupling: 2, change_frequency: 3, score: 28.0, is_high_risk: false },
    { file: 'traffic.py', loc: 80, complexity: 10, coupling: 3, change_frequency: 4, score: 48.0, is_high_risk: false },
    { file: 'chatbot.py', loc: 20, complexity: 3, coupling: 1, change_frequency: 1, score: 12.0, is_high_risk: false },
  ],
  high_risk_files: [
    { file: 'main.py', loc: 200, complexity: 25, coupling: 8, change_frequency: 12, score: 78.5, is_high_risk: true },
  ],
  top_risk_files: [
    { file: 'main.py', loc: 200, complexity: 25, coupling: 8, change_frequency: 12, score: 78.5, is_high_risk: true },
  ],
};

const mockTrafficResponse = {
  input: { current_users: 100, growth_rate_percent: 15, projection_months: 6 },
  traffic_timeline: [
    { month: 0, label: 'Now', avg_concurrent_users: 100, peak_concurrent_users: 300 },
    { month: 6, label: 'Month 6', avg_concurrent_users: 231, peak_concurrent_users: 693 },
  ],
  capacity_timeline: [],
  current_capacity: { cpu_cores: 3, ram_gb: 2, storage_gb: 22, bandwidth_mbps: 30, tier: 'Starter', instance_type: 't3.small', estimated_monthly_cost_usd: 15, concurrent_users: 300 },
  projected_capacity: { cpu_cores: 7, ram_gb: 4, storage_gb: 24, bandwidth_mbps: 70, tier: 'Growth', instance_type: 't3.medium', estimated_monthly_cost_usd: 40, concurrent_users: 693 },
  scaling_needed: true,
  scaling_recommendations: ['Upgrade from Starter to Growth tier within 6 months.'],
};

const mockChatResponse = {
  intent: 'high_risk',
  response: '## High-Risk Modules\n\nA module is flagged **High Risk** when its score exceeds 70.',
  suggestions: ['What is cyclomatic complexity?', 'How do I refactor?'],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('STORY-11: Dashboard layout and metrics display', () => {
  it('renders the SMART-MAINT title', () => {
    render(<Dashboard />);
    expect(screen.getByText('SMART-MAINT')).toBeInTheDocument();
  });

  it('renders all three navigation tabs', () => {
    render(<Dashboard />);
    expect(screen.getByText('Code Analysis')).toBeInTheDocument();
    expect(screen.getByText('Traffic & Scaling')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('shows Code Analysis tab by default', () => {
    render(<Dashboard />);
    expect(screen.getByPlaceholderText(/Enter absolute project path/i)).toBeInTheDocument();
  });

  it('switches to Traffic & Scaling tab on click', async () => {
    render(<Dashboard />);
    await userEvent.click(screen.getByText('Traffic & Scaling'));
    expect(screen.getByText('Traffic Simulation Parameters')).toBeInTheDocument();
  });

  it('switches to AI Assistant tab on click', async () => {
    render(<Dashboard />);
    await userEvent.click(screen.getByText('AI Assistant'));
    expect(screen.getByText('SMART-MAINT AI Assistant')).toBeInTheDocument();
  });
});

describe('STORY-1 & STORY-3: Code analysis form and results', () => {
  beforeEach(() => {
    axios.post.mockResolvedValue({ data: mockAnalysisResponse });
    axios.get.mockResolvedValue({ data: { reports: [] } });
  });

  afterEach(() => vi.clearAllMocks());

  it('Analyze button is disabled when path is empty', () => {
    render(<Dashboard />);
    const btn = screen.getByRole('button', { name: /analyze/i });
    expect(btn).toBeDisabled();
  });

  it('Analyze button enables when path is typed', async () => {
    render(<Dashboard />);
    const input = screen.getByPlaceholderText(/Enter absolute project path/i);
    await userEvent.type(input, 'C:\\projects\\myapp');
    const btn = screen.getByRole('button', { name: /analyze/i });
    expect(btn).not.toBeDisabled();
  });

  it('calls /api/analyze with the entered path', async () => {
    render(<Dashboard />);
    const input = screen.getByPlaceholderText(/Enter absolute project path/i);
    await userEvent.type(input, 'C:\\projects\\myapp');
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }));
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8000/api/analyze',
      expect.objectContaining({ directory_path: 'C:\\projects\\myapp' })
    );
  });

  it('displays summary metric cards after analysis', async () => {
    render(<Dashboard />);
    const input = screen.getByPlaceholderText(/Enter absolute project path/i);
    await userEvent.type(input, 'C:\\projects\\myapp');
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }));
    await waitFor(() => {
      // Check the metric card for "Files" shows 5
      expect(screen.getAllByText('5').length).toBeGreaterThan(0);
      // Check high risk count card shows 1
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    });
  });

  it('shows error message when API fails', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { detail: 'Invalid directory path provided.' } },
    });
    render(<Dashboard />);
    const input = screen.getByPlaceholderText(/Enter absolute project path/i);
    await userEvent.type(input, 'bad/path');
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }));
    await waitFor(() => {
      expect(screen.getByText('Invalid directory path provided.')).toBeInTheDocument();
    });
  });
});

describe('STORY-4 & STORY-12: High-risk module identification and visualization', () => {
  beforeEach(() => {
    axios.post.mockResolvedValue({ data: mockAnalysisResponse });
    axios.get.mockResolvedValue({ data: { reports: [] } });
  });
  afterEach(() => vi.clearAllMocks());

  it('shows High Risk badge for high-risk files', async () => {
    render(<Dashboard />);
    await userEvent.type(screen.getByPlaceholderText(/Enter absolute project path/i), 'C:\\test');
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }));
    await waitFor(() => {
      // The badge span inside the table
      const badges = screen.getAllByText('High Risk');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('shows Stable badge for low-risk files', async () => {
    render(<Dashboard />);
    await userEvent.type(screen.getByPlaceholderText(/Enter absolute project path/i), 'C:\\test');
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }));
    await waitFor(() => {
      expect(screen.getAllByText('Stable').length).toBeGreaterThan(0);
    });
  });

  it('renders the analysis table with correct columns', async () => {
    render(<Dashboard />);
    await userEvent.type(screen.getByPlaceholderText(/Enter absolute project path/i), 'C:\\test');
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }));
    await waitFor(() => {
      expect(screen.getByText('Complexity')).toBeInTheDocument();
      expect(screen.getByText('Coupling')).toBeInTheDocument();
      expect(screen.getByText('Score')).toBeInTheDocument();
    });
  });
});

describe('STORY-5: Filter and export controls', () => {
  beforeEach(() => {
    axios.post.mockResolvedValue({ data: mockAnalysisResponse });
    axios.get.mockResolvedValue({ data: { reports: [] } });
  });
  afterEach(() => vi.clearAllMocks());

  it('shows filter buttons after analysis', async () => {
    render(<Dashboard />);
    await userEvent.type(screen.getByPlaceholderText(/Enter absolute project path/i), 'C:\\test');
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }));
    await waitFor(() => {
      expect(screen.getByText(/All \(/)).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('low')).toBeInTheDocument();
    });
  });

  it('shows Export CSV and Export JSON buttons', async () => {
    render(<Dashboard />);
    await userEvent.type(screen.getByPlaceholderText(/Enter absolute project path/i), 'C:\\test');
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }));
    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
    });
  });
});

describe('STORY-8 & STORY-14: Traffic simulation and visualization', () => {
  beforeEach(() => {
    axios.post.mockResolvedValue({ data: mockTrafficResponse });
  });
  afterEach(() => vi.clearAllMocks());

  it('renders traffic simulation form fields', async () => {
    render(<Dashboard />);
    await userEvent.click(screen.getByText('Traffic & Scaling'));
    expect(screen.getByText('Current Concurrent Users')).toBeInTheDocument();
    expect(screen.getByText('Monthly Growth Rate (%)')).toBeInTheDocument();
    expect(screen.getByText('Projection Horizon (months)')).toBeInTheDocument();
  });

  it('calls /api/traffic on form submit', async () => {
    render(<Dashboard />);
    await userEvent.click(screen.getByText('Traffic & Scaling'));
    await userEvent.click(screen.getByRole('button', { name: /run simulation/i }));
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/traffic',
        expect.objectContaining({ current_users: 100 })
      );
    });
  });

  it('shows scaling tier after simulation', async () => {
    render(<Dashboard />);
    await userEvent.click(screen.getByText('Traffic & Scaling'));
    await userEvent.click(screen.getByRole('button', { name: /run simulation/i }));
    await waitFor(() => {
      expect(screen.getByText('Growth')).toBeInTheDocument();
    });
  });

  it('shows scaling recommendations', async () => {
    render(<Dashboard />);
    await userEvent.click(screen.getByText('Traffic & Scaling'));
    await userEvent.click(screen.getByRole('button', { name: /run simulation/i }));
    await waitFor(() => {
      expect(screen.getByText('Scaling Recommendations')).toBeInTheDocument();
    });
  });
});

describe('STORY-15, STORY-16, STORY-17: Chatbot UI and API integration', () => {
  beforeEach(() => {
    axios.post.mockResolvedValue({ data: mockChatResponse });
  });
  afterEach(() => vi.clearAllMocks());

  it('renders chatbot welcome message', async () => {
    render(<Dashboard />);
    await userEvent.click(screen.getByText('AI Assistant'));
    expect(screen.getByText('SMART-MAINT AI Assistant')).toBeInTheDocument();
  });

  it('renders suggestion chips in welcome message', async () => {
    render(<Dashboard />);
    await userEvent.click(screen.getByText('AI Assistant'));
    expect(screen.getByText('What is a maintenance score?')).toBeInTheDocument();
  });

  it('sends message to /api/chat on submit', async () => {
    render(<Dashboard />);
    await userEvent.click(screen.getByText('AI Assistant'));
    const input = screen.getByPlaceholderText(/Ask about maintenance/i);
    await userEvent.type(input, 'which modules are high risk?');
    await userEvent.click(screen.getByRole('button', { name: '' })); // Send button
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/chat',
        expect.objectContaining({ message: 'which modules are high risk?' })
      );
    });
  });

  it('displays bot response after sending message', async () => {
    render(<Dashboard />);
    await userEvent.click(screen.getByText('AI Assistant'));
    const input = screen.getByPlaceholderText(/Ask about maintenance/i);
    await userEvent.type(input, 'high risk modules');
    await userEvent.click(screen.getByRole('button', { name: '' }));
    await waitFor(() => {
      expect(screen.getByText('High-Risk Modules')).toBeInTheDocument();
    });
  });

  it('clicking a suggestion chip sends that message', async () => {
    render(<Dashboard />);
    await userEvent.click(screen.getByText('AI Assistant'));
    await userEvent.click(screen.getByText('What is a maintenance score?'));
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/chat',
        expect.objectContaining({ message: 'What is a maintenance score?' })
      );
    });
  });
});
