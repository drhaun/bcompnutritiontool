# Fitomics Body Composition Planning Tool

## Overview

This is a comprehensive Streamlit-based web application for body composition planning and nutrition management. The application provides users with tools to calculate their nutritional needs, plan meals, track progress, and export meal plans to PDF format. Built with Python and Streamlit, it integrates with the USDA FoodData Central API for accurate nutritional information and uses OpenAI's API for AI-powered meal planning.

## System Architecture

### Frontend Architecture
- **Framework**: Streamlit web application with multi-page navigation
- **UI Components**: Interactive forms, charts, data tables, and file uploads
- **Branding**: Custom CSS styling with Fitomics brand colors and theming
- **Layout**: Wide layout with sidebar navigation and tabbed interfaces

### Backend Architecture
- **Core Framework**: Python-based with modular utility functions
- **Data Processing**: Pandas for data manipulation and analysis
- **Mathematical Calculations**: NumPy and SciPy for nutritional calculations
- **Visualization**: Matplotlib for charts and progress tracking

### Data Storage Solutions
- **Primary Storage**: CSV files for user data persistence
- **Session Management**: Streamlit session state for real-time data
- **Cache Systems**: JSON-based caching for food data and nutrition information
- **File Structure**: Organized data directory with separate files for different data types

## Key Components

### 1. Body Composition Calculator (`utils.py`)
- BMR (Basal Metabolic Rate) calculations using Mifflin-St Jeor equation
- TDEE (Total Daily Energy Expenditure) calculations with activity multipliers
- Body composition analysis with FMI and FFMI categories
- Weight change rate recommendations based on current composition

### 2. Food Database Integration (`fdc_api.py`)
- USDA FoodData Central API integration for accurate nutritional data
- Food search functionality with fuzzy matching
- Caching system for improved performance
- Fallback nutrition database for common foods

### 3. AI Meal Planning (`pages/5_AI_Meal_Planning.py`, `pages/6_AI_Meal_Plan.py`)
- OpenAI GPT-4o integration for intelligent meal generation
- Macro-nutrient targeting with validation
- Dietary restriction and preference handling
- Recipe generation with accurate nutritional calculations

### 4. Nutrition Validation System (`macro_validator.py`, `nutrition_cache.py`)
- Real-time macro calculation validation
- Ingredient-based nutritional analysis
- Fallback nutrition database with USDA-verified values
- Accuracy verification between targets and calculated values

### 5. PDF Export System (`pdf_export.py`)
- Professional meal plan PDF generation using FPDF
- Fitomics branding integration
- Comprehensive meal plan formatting
- Export functionality for sharing and printing

### 6. Progress Tracking System
- Daily weight and nutrition tracking
- Progress visualization with charts
- Photo upload and management
- Historical data analysis

## Data Flow

1. **User Onboarding**: Personal information collection and goal setting
2. **Nutritional Assessment**: BMR/TDEE calculation and macro target generation
3. **Meal Planning**: Either AI-powered or manual meal creation
4. **Validation**: Nutritional accuracy verification using cached data
5. **Export**: PDF generation for meal plans
6. **Tracking**: Daily progress monitoring and data persistence

## External Dependencies

### APIs
- **USDA FoodData Central**: Nutritional data retrieval
- **OpenAI GPT-4o**: AI-powered meal planning and recipe generation

### Python Packages
- `streamlit`: Web application framework
- `pandas`: Data manipulation and analysis
- `numpy`: Numerical computations
- `matplotlib`: Data visualization
- `fpdf`: PDF generation
- `openai`: AI integration
- `requests`: API communication
- `fuzzywuzzy`: Fuzzy string matching

### Development Tools
- `anthropic`: Alternative AI integration
- `scipy`: Scientific computing
- `tabulate`: Table formatting

## Deployment Strategy

- **Platform**: Replit with autoscale deployment target
- **Runtime**: Python 3.11 with Nix package management
- **Port Configuration**: Streamlit server on port 5000
- **Environment**: Headless server mode for production deployment
- **Workflow**: Parallel task execution with integrated testing

## Recent Changes

- **July 6, 2025 - Fixed Nutrition Targets Calculation System**:
  - Resolved critical issue where suggested targets were using incorrect base values instead of day-specific calculations
  - Fixed day-specific nutrition data storage to properly capture calculated values from Day-Specific Nutrition Targets table
  - Updated all sections (Estimated Calorie Distribution, Customize Targets, etc.) to use suggested targets when available
  - Ensured proper fallback to base targets when Weekly Schedule is not completed
  - Suggested targets now correctly average values from day-specific table (e.g., 2,378 cal Mon-Thu, 1,778 cal Fri-Sun)
  - Added clear messaging that Weekly Schedule completion is required for suggested targets calculation

- **July 6, 2025 - Fixed Select All/Clear All Functionality**:
  - Resolved persistent issues with Select All and Clear All buttons in Diet Preferences page
  - Simplified button logic by removing conflicting st.rerun() calls and success messages
  - Buttons now directly update session state without interference
  - Applied consistent fix across all food categories: Proteins, Carbs, Fats, Vegetables, and Cuisines
  - Maintained visual styling with checkmark and X icons plus full-width button layout
  - Users can now successfully select all items in a category and modify individual selections

- **June 26, 2025 - AI Meal Planning Restructure**:
  - Split AI meal planning into two distinct pages for different user needs
  - Created "Standalone AI Meal Plan" (Page 6) - compact, single-form interface for quick meal planning without setup
  - Renamed comprehensive planning to "Advanced AI Meal Plan" (Page 7) - full weekly meal plans with body composition integration
  - Standalone mode includes all essential features: nutrition targets, dietary preferences, meal configuration, and PDF export
  - Both pages maintain OpenAI GPT-4o integration for intelligent meal generation
  - Preserved cross-navigation between standalone and advanced modes based on user needs

- **June 26, 2025 - Weekly AI Meal Planning Enhancement**:
  - Completely redesigned AI Meal Planning page to generate full weekly meal plans instead of single days
  - Integrated weekly schedule data with AI meal generation for context-aware meal planning
  - Enhanced meal planning to consider daily activities, workout timing, and meal contexts
  - Added intelligent meal distribution based on pre/post-workout needs and schedule constraints
  - Implemented weekly variety algorithms to prevent meal repetition across days
  - Fixed PDF export functionality to work with new weekly meal plan format
  - Added comprehensive grocery list consolidation across the entire week
  - Created day-specific meal optimization using body composition goals and daily TDEE
  - Enhanced export options with properly formatted PDF downloads and grocery lists

- **June 26, 2025 - Weekly Schedule Complete Redesign**:
  - Completely redesigned Weekly Schedule page with intuitive, clean UI
  - Streamlined schedule setup into clear sections: Basic Schedule, Activity Schedule, Meal Context
  - Enhanced time allocation visualization with comprehensive weekly overview table
  - Added detailed daily schedule breakdown with meal contexts and timing
  - Improved meal planning integration with 12 context options for optimal preparation planning
  - Simplified workout scheduling with total weekly count and day selection
  - Added sleep duration feedback and work schedule integration
  - Created visual schedule overview showing sleep, work, workout, meals, and TDEE for each day
  - Fixed Diet Preferences select all functionality with robust state tracking system

- **June 25, 2025 - Major Workflow Consolidation**:
  - Fixed Weekly Schedule page title to "Weekly Schedule" (removed "and Nutrition") in navigation bar
  - Renamed page file from 4_Weekly_Schedule_and_Nutrition.py to 4_Weekly_Schedule.py
  - Made meal context preferences fully customizable with dropdown selectors
  - Consolidated AI Meal Planning from 3 separate pages into 1 comprehensive workflow
  - Enhanced Weekly Schedule with comprehensive daily activity customization (work, dining, recreation, travel)
  - Fixed nested expander error preventing daily activity customization from displaying
  - Improved cooking time preferences persistence from Diet Preferences to AI Meal Planning
  - Added intelligent meal context recommendations based on daily activities
  
- **June 24, 2025 - UI/UX Streamlining**: 
  - Added Category column to Body Composition table (removed separate section)
  - Moved reference photos and detailed information to target setting section  
  - Consolidated Meal Sourcing Preferences into 3 clear options
  - Streamlined Meal Planning Preferences with cooking for, leftovers preference
  - Removed Travel & Location Preferences and Delivery Service Integration sections
  - Fixed Diet Preferences page refresh issues by using forms
  - Created separate Nutrition Targets page for clearer workflow navigation
  - Updated Weekly Schedule page to guide users to review nutrition targets before meal planning

## Changelog

- June 24, 2025. Initial setup and major UI improvements

## User Preferences

Preferred communication style: Simple, everyday language.