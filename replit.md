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

- **July 17, 2025 - LOCATION-BASED MEAL PLANNING INTEGRATION: Intelligent Location Features**:
  - Added comprehensive location-based features to Standalone AI Meal Plan page
  - New Location & Restaurants tab with zip code input for primary and work locations
  - Travel routes tracking for portable meal and restaurant recommendations along common routes
  - Favorite restaurants integration with macro-friendly menu suggestions
  - Favorite grocery stores with shopping tips and ingredient availability optimization
  - Convenience store options for quick meals and emergency snacks
  - Seasonal ingredient preferences with auto-detection of current season (Summer, Fall, Winter, Spring)
  - Enhanced AI prompts to intelligently use location data for personalized meal planning
  - Location-based recommendations display in grocery lists showing restaurant options, store tips, and convenience options
  - Enhanced meal planning accuracy with location-appropriate ingredient suggestions
  - Fixed missing utility functions (calculate_protein_grams, calculate_carb_grams, calculate_fat_grams) for nutrition calculations
  - Comprehensive testing confirms all location features working correctly with proper data structure handling
  - AI now provides restaurant-specific menu recommendations based on user's favorite locations
  - Seasonal produce integration ensures ingredient suggestions match current season and location
  - Enhanced grocery list generation with location-specific store recommendations and seasonal ingredient focus

- **July 17, 2025 - COMPREHENSIVE STANDALONE AI MEAL PLAN ENHANCEMENT: Enhanced Precision & User Experience**:
  - Completely revamped Standalone AI Meal Plan page with comprehensive features matching Weekly Schedule page
  - Enhanced workout scheduling to support multiple daily workouts with detailed time blocks like Weekly Schedule
  - Implemented dynamic meal context builder matching Weekly Schedule page with detailed prep preferences, locations, and time ranges
  - Added comprehensive Diet Preferences section with 4 organized tabs: Restrictions & Allergies, Food Preferences, Flavors & Seasonings, and Meal Sourcing
  - Enhanced AI prompt precision from ±3% to ±1% macro accuracy tolerance for extremely precise meal planning
  - Added detailed serving size requirements using precise grams/ounces (e.g., "150g chicken breast" vs "1 chicken breast")
  - Implemented USDA nutritional database calculation requirements for ingredient-level macro accuracy
  - Enhanced AI prompts with calculation verification requirements and portion adjustment guidelines
  - Fixed grocery list generation AttributeError by updating data structure access for new meal plan format
  - Added comprehensive seasoning, flavor profile, and cooking enhancer preferences integration
  - Enhanced meal sourcing preferences with home cooking, meal prep, delivery, and grocery shopping interest levels
  - Structured page to match Diet Preferences page organization for consistent user experience
  - Added precision calculation requirements forcing AI to show calculation work for each ingredient
  - Updated validation system to use strict 1% tolerance instead of 3% for maximum accuracy
  - Enhanced PDF export compatibility with new comprehensive meal plan structure
  - Improved meal context system to provide more detailed context for AI meal generation
  - Added comprehensive user preference collection for more personalized and accurate meal plans

- **July 17, 2025 - COMPREHENSIVE DIET PREFERENCES INTEGRATION: Enhanced AI Meal Planning Accuracy**:
  - Integrated ALL Diet Preferences page information into both Advanced and Standalone AI meal planners
  - Added comprehensive dietary restrictions, food allergies, and disliked foods with safety-critical handling
  - Included detailed supplementation preferences (creatine, protein powder, pre-workout, vitamins, etc.)
  - Enhanced seasoning and flavor preferences with specific seasonings and cooking enhancers
  - Added variety control preferences with repetition, weekly structure, and cooking variety options
  - Integrated location-based preferences with zip codes, favorite restaurants, and grocery stores
  - Added micronutrient optimization focus areas and seasonal ingredient preferences
  - Enhanced meal sourcing preferences for delivery, home cooking, and grocery shopping
  - Improved AI prompts with comprehensive user context for more accurate and personalized meal plans
  - Maintained ±3% macro accuracy requirements while adding extensive personalization features
  - Both Advanced and Standalone AI meal planners now access complete Diet Preferences data structure
  - Enhanced PDF export with comprehensive text cleaning for special character compatibility

- **July 13, 2025 - CRITICAL FIX: Resolved KeyError 'calories' in Advanced AI Meal Plan**:
  - Fixed critical production bug where Advanced AI Meal Plan was trying to access non-existent 'calories' key in meal_targets
  - Updated data structure access to correctly use daily_totals instead of meal_targets for macro target retrieval
  - Fixed validation function to properly access daily_totals from day_targets structure
  - Added fallback values for all macro targets to prevent KeyError exceptions
  - Comprehensive testing confirms all systems now working correctly with 100% accuracy validation
  - Both Advanced and Standalone AI meal planners are now fully operational and ready for production use
  - Temperature maintained at 0.1 for maximum calculation consistency and ±3% macro accuracy requirement

- **July 13, 2025 - COMPLETED: Major AI Meal Planning System Overhaul for ±3% Accuracy**:
  - Completely revamped AI meal planning prompts with enhanced JSON output format
  - Implemented strict ±3% macro accuracy requirements with validation checks
  - Added comprehensive profile summary explaining how user preferences influence meal plans
  - Integrated workout annotations showing pre/post-workout meal optimizations
  - Enhanced meal naming system with descriptive names instead of generic labels
  - Added individual meal target tracking and accuracy comparisons
  - Implemented organized grocery list categorization by food type
  - Created enhanced PDF export functions with profile summaries and workout timing guidance
  - Updated both Advanced and Standalone AI meal planners with unified enhanced format
  - Added daily totals validation and accuracy summaries in meal plan responses
  - Fixed meal plan processing to handle both legacy and new enhanced JSON formats
  - Enhanced error handling and validation for PDF export functionality
  - Improved cooking instructions formatting with clear step-by-step guidance
  - Added support for calorie-dense ingredient recommendations to boost low macros
  - Temperature lowered to 0.1 for maximum calculation consistency and accuracy

- **July 13, 2025 - Enhanced Location-Based Meal Planning & Micronutrient Optimization**:
  - Added comprehensive location-based meal planning features to Diet Preferences page
  - Implemented zip code input for primary location and work location
  - Added favorite restaurants and grocery stores tracking for personalized recommendations
  - Created convenience store options for on-the-go meal planning
  - Integrated travel routes consideration for meal planning across locations
  - Added comprehensive micronutrient optimization with 15+ micronutrient focus options
  - Implemented seasonal ingredient integration with auto-detect season functionality
  - Added preferred seasonal produce selection for enhanced meal variety
  - Created smart ingredient substitution system for dietary restrictions and preferences
  - Added meal prep coordination levels from minimal to maximum weekly prep planning
  - Enhanced both Advanced and Standalone AI meal planners with location-based context
  - Updated AI prompts to include micronutrient targeting, seasonal preferences, and location data
  - Created seasonal_ingredients.py utility module for dynamic ingredient recommendations
  - Added location-based meal sourcing integration (placeholder for future API expansions)
  - Enhanced user interface with conditional location fields for intuitive experience
  - Maintained core ±3% macro accuracy while adding powerful backend optimization features
  - Updated App Overview page to showcase new enhanced features and capabilities

- **July 13, 2025 - Enhanced Workout Proximity Meal Timing System & Page Reorganization**:
  - Added comprehensive workout proximity meal timing guidelines to both AI meal planning systems
  - Enhanced standalone AI meal planner with detailed pre/post-workout meal preferences
  - Added educational content about workout meal timing for users in both pages
  - Updated AI prompts with specific workout proximity requirements (±3% macro accuracy)
  - Integrated training type considerations (strength, cardio, HIIT) into meal planning
  - Added user-facing guidance about fat/fiber restrictions around workout times
  - Enhanced meal timing recommendations for fasted training vs pre-workout nutrition
  - Updated both standalone and advanced AI meal planners with liquid/digestible meal options around workouts
  - Added specific macro targets for pre-workout (low fat/fiber) and post-workout (high protein/carbs) meals
  - Reorganized standalone AI meal plan page - moved Meal Plan Configuration and Diet Preferences up, Calculated Daily Energy Needs to bottom
  - Improved user flow by showing energy calculations after all selections are made, taking preferences into account
  - Enhanced target displays with body mass and fat-free mass ratios, calorie percentages, and energy availability calculations
  - Added comprehensive energy availability education with health implications and optimization guidance
  - Implemented real-time energy availability warnings when users adjust targets below healthy thresholds
  - Added energy availability analysis to both standalone and advanced AI meal planning pages for consistent user education
  - Enhanced Nutrition Targets page with comprehensive energy availability integration and workout timing guidelines
  - Added enhanced target displays with body mass ratios, calorie percentages, and EA status to individual meal customization
  - Integrated workout-specific nutrition recommendations based on scheduled training types and timing
  - Enhanced daily macro budget display with real-time energy availability calculations and workout-specific guidance
  - Simplified standalone meal planner to use physical activity level instead of separate workout frequency/calories fields
  - Added support for multiple workouts per day in standalone planner with detailed workout specifications
  - Enhanced workout details to include duration and multiple workout scheduling capabilities
  - Added precision TDEE calculation using specific workout types, durations, and calories when multiple workouts are specified
  - Enhanced energy availability calculations to use precise workout calorie estimates instead of activity level approximations
  - Added workout calorie breakdown display showing individual workout contributions to daily energy expenditure
  - Implemented progressive summary system showing cumulative progress across all workflow pages
  - Added rolling summary at bottom of each page displaying completed steps and user selections
  - Enhanced user experience with step-by-step progress tracking and visual completion indicators

- **July 13, 2025 - Enhanced Session Management & Streamlined AI Meal Planning**:
  - Completely enhanced session management to save all user form inputs and selections
  - Fixed critical data structure issue where nested dictionaries weren't being properly saved/loaded
  - Added comprehensive data capture for Initial Setup, Body Composition Goals, Diet Preferences, and Weekly Schedule
  - Users can now save and reload sessions with all their selections preserved and editable
  - Removed redundant AI Meal Plan Compact page to simplify workflow (keeping Standalone AI Meal Plan)
  - Session system now captures activity level, workout frequency, calories, goal preferences, and all diet selections
  - Enhanced session persistence for individual ongoing use, preparing for future login/subscription features
  - Improved session auto-load functionality to restore complete user experience seamlessly
  - Thoroughly tested session functionality with comprehensive data integrity verification

- **July 12, 2025 - Enhanced AI Meal Planning Accuracy & Fixed PDF Export Issues**:
  - Improved AI meal planning accuracy from ±5% to ±3% tolerance for macro targeting
  - Enhanced AI prompts with specific calorie-boosting strategies using calorie-dense ingredients
  - Lowered AI temperature from 0.2 to 0.1 for maximum calculation consistency
  - Added comprehensive ingredient selection guidelines for hitting higher calorie targets
  - Fixed PDF export error handling with better validation and user feedback
  - Updated App Overview page to accurately reflect current 7-step workflow
  - Added enhanced error messages for PDF generation failures
  - Improved meal data validation before PDF export to prevent failures

- **July 12, 2025 - Enhanced AI Meal Planning Accuracy with Flavor Improvements**:
  - Added comprehensive seasoning and flavor preferences section to Diet Preferences page
  - Integrated flavor preferences into AI meal planning prompts for tastier, more appealing recipes
  - Enhanced AI prompts with specific seasoning requirements and flavor profile targeting
  - Fixed PDF export to show average daily amounts instead of confusing weekly totals
  - Added macro accuracy comparison table to PDF showing daily Target vs Actual results
  - Improved PDF ingredient display to show proper food names instead of "Unknown"
  - Added meal context and timing information to PDF exports from weekly schedule
  - Enhanced cooking instructions display in PDF with proper formatting
  - Users can now specify spice levels, flavor profiles, preferred seasonings, and cooking enhancers
  - AI now generates more flavorful meals with specific seasoning recommendations in instructions

- **July 12, 2025 - Enhanced AI Meal Planning Accuracy**:
  - Improved AI prompt specificity with stricter macro accuracy requirements (±5% instead of ±10%)
  - Added comprehensive validation checklist for AI to follow before generating responses
  - Enhanced system prompts to prioritize macro accuracy above all other considerations
  - Added post-processing validation to check generated meal plans against targets
  - Implemented real-time accuracy comparison display showing target vs generated macros
  - Added weekly macro accuracy summary table with visual indicators
  - Lowered AI temperature from 0.8 to 0.3 for more consistent calculations
  - Increased max tokens to 3000 for more detailed and accurate responses

- **July 12, 2025 - Fixed PDF Export and Added Variety Preferences**:
  - Fixed critical PDF export data flow issue with AI-generated meal plans
  - Enhanced PDF export to handle string amounts with units (e.g., "200g", "1 cup") instead of failing on float conversion
  - Added comprehensive variety preferences section to Diet Preferences page
  - Integrated variety preferences into AI meal planning prompts for better meal diversity control
  - Added profile summary integration to PDF export title page
  - Enhanced debugging capabilities for PDF export with detailed console logging
  - Users can now control meal variety through Low/Moderate/High/Maximum variety settings
  - Added repetition preference, weekly structure, and cooking variety controls

- **July 12, 2025 - Implemented Persistent Session Management System**:
  - Created comprehensive session save/load functionality across all pages
  - Added auto-load feature that restores last saved session when returning to any page
  - Implemented session controls in sidebar of all key pages (Initial Setup, Body Composition Goals, Diet Preferences, Weekly Schedule, Nutrition Targets, Advanced AI Meal Plan)
  - Added session status indicator showing current session name
  - Enhanced PDF export to handle both dictionary and list meal data formats from AI responses
  - Fixed session persistence allowing users to save at any step and continue editing
  - Created auto-save functionality that preserves work during multi-step setup process
  - Ensured all saved data auto-populates forms when returning to pages while remaining editable

- **July 12, 2025 - Completely Fixed Diet Preferences Food Selection System**:
  - Successfully resolved persistent individual food item removal issues through complete code rewrite
  - Implemented standardized function-based approach for all food categories ensuring consistency
  - Added proper callback-based state management using Streamlit's on_change parameter
  - Fixed Select All/Clear All buttons with explicit widget synchronization
  - Ensured selections persist when switching between tabs (Proteins, Carbohydrates, Fats, Vegetables, Cuisines)
  - Eliminated widget state conflicts that were causing multiple item deletion
  - Created comprehensive user profile summary integrating Initial Setup, Body Composition Goals, and Diet Preferences
  - Added detailed meal sourcing preferences, nutrition targets, and weekly schedule integration to profile summary
  - Provided complete preferences breakdown for accurate AI meal planning context
  - Ensured proper workflow integration from Initial Setup through Diet Preferences for seamless user experience

- **July 6, 2025 - Fixed Day-Specific TDEE and Suggested Targets Accuracy**:
  - Fixed critical TDEE calculation error in Day-Specific Meal Customization (was showing 1451 instead of correct suggested targets)
  - Updated all calculations to use suggested targets from Day-Specific Nutrition Targets table instead of base targets
  - Fixed meal plan comparison metrics to use day-specific suggested targets for accurate delta calculations
  - Fixed auto-balance functionality to redistribute macros based on suggested targets
  - Enhanced TDEE display to clearly indicate whether using suggested targets or base targets
  - Ensured consistent use of suggested targets throughout nutrition planning workflow

- **July 6, 2025 - Enhanced Advanced AI Meal Plan Integration**:
  - Added comprehensive 3-column setup summary showing all configuration steps
  - Enhanced OpenAI prompt generation with complete user context (profile, goals, detailed preferences)
  - Added preferred foods, cuisines, and practical constraints to meal planning context
  - Improved meal plan generation with comprehensive nutritional and lifestyle data
  - Updated function calls to pass user profile and body composition goals to AI system

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