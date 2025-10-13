# Fitomics Body Composition Planning Tool

## Overview
The Fitomics Body Composition Planning Tool is a comprehensive Streamlit-based web application designed for body composition and nutrition management. Its primary purpose is to empower users with tools to calculate nutritional needs, plan meals, track progress, and export professional PDF meal plans. The application aims to integrate advanced nutritional science with user-friendly interfaces, leveraging AI for intelligent meal generation and providing accurate food data through external APIs. The vision is to offer a personalized and effective solution for users to achieve their body composition goals.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Streamlit web application with multi-page navigation, wide layout, sidebar, and tabbed interfaces.
- **UI Components**: Interactive forms, charts, data tables, and file uploads.
- **Branding**: Custom CSS styling reflecting Fitomics brand colors and theming.

### Backend Architecture
- **Core Framework**: Python with modular utility functions.
- **Data Processing**: Pandas for data manipulation.
- **Mathematical Calculations**: NumPy and SciPy for nutritional and scientific computations (e.g., BMR, TDEE, FMI, FFMI, hydration calculations).
- **Visualization**: Matplotlib for charts and progress tracking.

### Data Storage Solutions
- **Primary Storage**: CSV files for user data persistence.
- **Session Management**: Streamlit session state for real-time data and comprehensive user input preservation across pages.
- **Cache Systems**: JSON-based caching for food data and nutrition information.

### Key Features and Technical Implementations
- **Body Composition Calculator**: Implements Mifflin-St Jeor BMR, TDEE, and body composition analysis (FMI, FFMI).
- **Food Database Integration**: Connects to USDA FoodData Central API for nutritional data, including fuzzy matching and caching.
- **AI Meal Planning**: Integrates OpenAI GPT-4o for intelligent, macro-targeted meal generation, handling dietary restrictions, preferences, and recipe generation. Features an interactive review/approval workflow for AI-generated plans and aims for strict macro accuracy (±3% tolerance).
- **Nutrition Validation System**: Real-time macro calculation validation and ingredient-based nutritional analysis using USDA-verified values.
- **PDF Export System**: Generates professional, branded PDF meal plans with comprehensive formatting.
- **Progress Tracking System**: Supports daily weight and nutrition tracking, visualization, and historical data analysis.
- **Hydration Calculator**: Provides personalized fluid needs assessment based on body weight, exercise, and environmental factors, supporting both imperial and metric units, and comprehensive electrolyte analysis.
- **Workout Proximity Meal Timing**: Incorporates guidelines for pre/post-workout nutrition based on training type and schedule.
- **Location-Based Meal Planning**: Allows users to input zip codes, favorite restaurants, and grocery stores for personalized recommendations.
- **Micronutrient Optimization**: Offers options to focus on specific micronutrients and seasonal ingredients.
- **Workflow & Session Management**: Streamlined 9-page workflow (App Overview, Initial Setup, Body Composition Goals, Diet Preferences, Weekly Schedule, Nutrition Targets, Advanced AI Meal Plan, DIY Meal Planning, Daily Monitoring, Progress Dashboard) with persistent session management to save and reload all user inputs and selections.

## Recent Optimization Summary (October 2025)

### Phase 1 - Critical Fixes
- Removed prerequisite bypasses and test code
- Fixed all LSP errors across Body Composition Goals, Daily Monitoring, Progress Dashboard
- Standardized session state to use day_specific_nutrition consistently

### Phase 2 - Security & Error Handling
- Moved OpenAI credentials to environment variables (OPENAI_API_KEY, OPENAI_ORGANIZATION_ID, OPENAI_PROJECT_ID)
- Created consolidated error handling utilities (ai_meal_plan_utils.py)
- Replaced all json.loads calls with safe_json_parse function

### Phase 3 - Code Consolidation
- Extracted duplicate macro display code into display_macros utility
- Consolidated meal display logic into display_meal function
- Simplified CSS from ~80 lines to 7 lines
- Reduced Advanced AI Meal Plan from 2364 to 2232 lines while preserving all features
- Created reusable utility functions for common operations

## External Dependencies

### APIs
- **USDA FoodData Central**: Used for retrieving comprehensive nutritional data for foods.
- **OpenAI GPT-4o**: Utilized for AI-powered meal planning, recipe generation, and intelligent meal recommendations.

### Python Packages
- `streamlit`: Core framework for building the web application.
- `pandas`: Essential for data manipulation and analysis.
- `numpy`: For numerical computations, particularly in nutritional calculations.
- `matplotlib`: Used for generating data visualizations and progress charts.
- `fpdf`: Enables the generation of PDF documents for meal plan exports.
- `openai`: Provides the interface for integrating with OpenAI's API.
- `requests`: Used for making HTTP requests to external APIs like USDA FoodData Central.
- `fuzzywuzzy`: Employed for fuzzy string matching in food searches.
- `scipy`: Used for scientific computing, complementing `numpy` in complex calculations.