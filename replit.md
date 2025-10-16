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

### Phase 4 - Macro Accuracy Precision System (October 16, 2025)
**Critical Enhancement: Achieved ±3% macro precision with dynamic meal structure**
- **Dynamic Meal Structure**: System now intelligently determines meal count and timing based on user schedule, workout timing, and preferences (not hard-coded 3+2)
- **Workout-Aware Distribution**: Leverages step1_generate_meal_structure to optimize macro allocation around training sessions with nutrient timing logic
- **Precise Target Calculation**: Each meal receives specific macro targets from AI-determined structure (e.g., pre-workout meal gets higher carbs)
- **Robust Data Sourcing**: Fixed data extraction to read from both direct structure (calories/protein/carbs/fat keys) and nested daily_totals structure
- **Explicit Type Classification**: AI includes explicit "type" field ("meal" or "snack") with normalized validation (.strip().lower()) to prevent misclassification
- **Comprehensive Validation**: Dual-layer validation checks both daily totals AND individual meal/snack macros against their specific targets (±3% tolerance)
- **Iterative Correction**: 3-attempt retry mechanism regenerates plans until accuracy_validated=True or max attempts reached
- **Variable Meal Support**: Works with any meal structure (2 meals, 4 meals, 5 meals + snacks, etc.) based on schedule optimization
- **Enhanced AI Prompting**: Updated prompts to explicitly require ±3% accuracy with specific gram targets per meal from dynamic structure
- **Critical Bug Fix (Oct 16)**: Fixed key name mismatch (`accuracy_valid` → `accuracy_validated`) that was preventing validation results from propagating to retry logic, causing inaccurate meals to be accepted on first attempt without retries

### Phase 5 - Interactive Meal Customization System (October 16, 2025)
**New Feature: Real-time meal editing with AI-powered regeneration and ingredient swapping**
- **Weekly Grid View**: Added interactive 7-day meal grid displaying all meals at a glance with ingredients, portions, and macros in compact card format for easy week-to-week comparison
- **Meal Regeneration**: Implemented AI-powered single meal regeneration that preserves exact macro targets (±3%) while avoiding previous ingredients for variety
- **Ingredient Swap System**: Created intelligent ingredient replacement with category-based alternatives (proteins, carbs, fats, vegetables) and portion preservation
- **Modified Meal Plan Architecture**: Introduced separate `modified_meal_plan` session state to preserve original plan while tracking user customizations non-destructively
- **PDF Export Integration**: Updated PDF export to use final customized/modified meal plan instead of original generated plan
- **Session State Management**: Enhanced state handling to support parallel tracking of original and modified plans for reset/comparison capabilities
- **User Experience**: Two-tab interface (Weekly Grid View + Customize Meals) with day/meal selectors and real-time preview of changes
- **Macro Accuracy Safeguards**: Regenerated meals maintain ±3% accuracy requirement through AI prompting, ingredient swaps warn users about potential macro variance

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