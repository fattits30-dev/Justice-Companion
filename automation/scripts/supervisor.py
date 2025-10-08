#!/usr/bin/env python3
"""
Agent Supervisor - Auto-restart crashed agents
Justice Companion Automation Framework
"""

import subprocess
import time
import sys
from pathlib import Path
from datetime import datetime


class AgentSupervisor:
    """Monitors agents and restarts them if they crash."""

    def __init__(self, project_root: Path):
        self.project_root = Path(project_root)
        self.agents = {
            'file_monitor': {
                'script': 'automation/agents/file_monitor_agent.py',
                'process': None,
                'restarts': 0,
                'last_restart': None
            },
            'test_runner': {
                'script': 'automation/agents/test_runner_agent.py',
                'process': None,
                'restarts': 0,
                'last_restart': None
            },
            'fix_suggester': {
                'script': 'automation/agents/fix_suggester_agent.py',
                'process': None,
                'restarts': 0,
                'last_restart': None
            }
        }

    def start_agent(self, agent_name: str):
        """Start a single agent."""
        agent = self.agents[agent_name]
        script_path = self.project_root / agent['script']

        print(f"[supervisor] Starting {agent_name}...")

        try:
            process = subprocess.Popen(
                [sys.executable, '-B', str(script_path)],
                cwd=self.project_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            agent['process'] = process
            agent['last_restart'] = datetime.now()

            print(f"[supervisor] ✅ {agent_name} started (PID: {process.pid})")
            return True

        except Exception as e:
            print(f"[supervisor] ❌ Failed to start {agent_name}: {e}")
            return False

    def check_agent(self, agent_name: str) -> bool:
        """Check if agent is still running."""
        agent = self.agents[agent_name]
        process = agent['process']

        if process is None:
            return False

        # Check if process is still alive
        poll = process.poll()
        if poll is not None:
            # Process has exited
            return False

        return True

    def restart_agent(self, agent_name: str):
        """Restart a crashed agent."""
        agent = self.agents[agent_name]

        # Kill old process if it exists
        if agent['process']:
            try:
                agent['process'].kill()
            except:
                pass

        agent['restarts'] += 1
        print(f"\n{'='*70}")
        print(f"[supervisor] 🔄 RESTARTING {agent_name}")
        print(f"[supervisor] Restart count: {agent['restarts']}")
        print(f"{'='*70}\n")

        # Wait a bit before restart
        time.sleep(1)

        return self.start_agent(agent_name)

    def run(self):
        """Main supervisor loop."""
        print("="*70)
        print("AGENT SUPERVISOR")
        print("Auto-restart enabled for all agents")
        print("="*70)
        print()

        # Start all agents
        for agent_name in self.agents.keys():
            self.start_agent(agent_name)
            time.sleep(0.5)  # Stagger starts

        print()
        print("[supervisor] All agents started. Monitoring...")
        print("[supervisor] Press Ctrl+C to stop")
        print()

        try:
            while True:
                # Check each agent
                for agent_name in self.agents.keys():
                    if not self.check_agent(agent_name):
                        print(f"[supervisor] ⚠️  {agent_name} crashed!")
                        self.restart_agent(agent_name)

                # Check every 2 seconds
                time.sleep(2)

        except KeyboardInterrupt:
            print("\n[supervisor] Shutdown requested...")
            self.shutdown()

    def shutdown(self):
        """Gracefully shutdown all agents."""
        print("[supervisor] Stopping all agents...")

        for agent_name, agent in self.agents.items():
            if agent['process']:
                try:
                    print(f"[supervisor] Stopping {agent_name}...")
                    agent['process'].terminate()
                    agent['process'].wait(timeout=5)
                except subprocess.TimeoutExpired:
                    print(f"[supervisor] Force killing {agent_name}...")
                    agent['process'].kill()
                except Exception as e:
                    print(f"[supervisor] Error stopping {agent_name}: {e}")

        print("[supervisor] All agents stopped")


if __name__ == '__main__':
    import os

    # Get project root
    project_root = Path(os.getenv('PROJECT_ROOT', Path.cwd()))

    # Run supervisor
    supervisor = AgentSupervisor(project_root)
    supervisor.run()
