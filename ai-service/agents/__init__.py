"""
AI Agents Module

Contains specialized AI agents for different tasks:
- document_analyzer: Legal document analysis and case data extraction
"""

from agents.base_agent import BaseAgent
from agents.document_analyzer import DocumentAnalyzerAgent

__all__ = [
    'BaseAgent',
    'DocumentAnalyzerAgent',
]
