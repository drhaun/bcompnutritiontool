-- Update recipe_servings for ni_recipes table
-- Generated from ni_recipes_126.csv

-- First, add the column if it doesn't exist
ALTER TABLE ni_recipes ADD COLUMN IF NOT EXISTS recipe_servings INTEGER DEFAULT 1;

-- Update each recipe with the correct servings

UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'almond-joy-overnight-oats';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'healthier-breakfast-burrito';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'healthier-breakfast-sandwich';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'spinach-cheese-egg-muffins';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'chicken-avocado-melt';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'greek-turkey-burgers';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'taco-chicken';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'salmon-burger';
UPDATE ni_recipes SET recipe_servings = 8 WHERE slug = 'crockpot-bbq-chicken';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'mediterranean-wrap';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'ground-turkey-sweet-potato-bake';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'crockpot-sante-fe-chicken';
UPDATE ni_recipes SET recipe_servings = 2 WHERE slug = 'blueberry-coconut-chia-seed-pudding';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'lightened-up-green-bean-casserole';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'roasted-brussels-sprouts-with-balsamic-glaze';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'thanksgiving-kale-salad-with-roasted-butternut-squash';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'sweet-potato-casserole-with-pecan-topping';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'apple-crisp-crumble';
UPDATE ni_recipes SET recipe_servings = 8 WHERE slug = 'blueberry-breakfast-bake';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'broccoli-cheddar-egg-muffins';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'tater-tot-breakfast-casserole';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'shrimp-and-broccoli-stir-fry';
UPDATE ni_recipes SET recipe_servings = 8 WHERE slug = 'buffalo-chicken-casserole';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'southwest-chicken-salad';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'cheeseburger-wrap';
UPDATE ni_recipes SET recipe_servings = 8 WHERE slug = 'creamy-butternut-squash-pasta';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'foil-baked-salmon-and-asparagus';
UPDATE ni_recipes SET recipe_servings = 2 WHERE slug = 'protein-oreo-dip';
UPDATE ni_recipes SET recipe_servings = 2 WHERE slug = 'fruity-chia-seed-smoothie';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'sweet-potato-hash';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'black-beans-and-rice';
UPDATE ni_recipes SET recipe_servings = 2 WHERE slug = 'healthier-egg-salad';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'homemade-sweet-potato-fries';
UPDATE ni_recipes SET recipe_servings = 24 WHERE slug = 'banana-oat-cookies';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'iced-coffee-protein-shake';
UPDATE ni_recipes SET recipe_servings = 2 WHERE slug = 'healthy-cinnamon-apples';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'peanut-butter-chia-pudding';
UPDATE ni_recipes SET recipe_servings = 8 WHERE slug = 'healthier-baked-ziti';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'green-protein-smoothie';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'pumpkin-smoothie';
UPDATE ni_recipes SET recipe_servings = 20 WHERE slug = 'protein-bites';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'sweet-potato-nachos';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'berryblastsmoothie';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'peanutbutterbanana';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'tropicalparadise';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'chocolatebanana';
UPDATE ni_recipes SET recipe_servings = 10 WHERE slug = 'greek-crockpot-chicken';
UPDATE ni_recipes SET recipe_servings = 2 WHERE slug = 'high-protein-spinach-artichoke-dip';
UPDATE ni_recipes SET recipe_servings = 10 WHERE slug = 'pumpkin-patch-protein-balls';
UPDATE ni_recipes SET recipe_servings = 10 WHERE slug = 'healthy-chicken-salad';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'frozen-greek-yogurt-bark';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'strawberry-overnight-oats';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'chipotle-chicken-pasta';
UPDATE ni_recipes SET recipe_servings = 5 WHERE slug = 'roasted-sausage-veggie-medley';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'buffalo-chicken-meatballs';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'breakfast-quesadilla';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'high-protein-chocolate-pudding';
UPDATE ni_recipes SET recipe_servings = 9 WHERE slug = 'caramel-apple-bites';
UPDATE ni_recipes SET recipe_servings = 18 WHERE slug = 'homemade-peanut-butter-cups';
UPDATE ni_recipes SET recipe_servings = 10 WHERE slug = 'chocolate-chip-pumpkin-bread';
UPDATE ni_recipes SET recipe_servings = 18 WHERE slug = 'pumpkin-spice-yogurt-parfait';
UPDATE ni_recipes SET recipe_servings = 12 WHERE slug = '8-minute-air-fryer-dumplings';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'salted-maple-butter-matcha';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'harvest-grain-bowl';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'high-protein-peanut-butter-cookie-dough';
UPDATE ni_recipes SET recipe_servings = 5 WHERE slug = 'maple-dijon-chicken';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = '3-ingredient-fish-tacos';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = '3-ingredient-baked-tacos';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'jack-o-lantern-stuffed-peppers';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'korean-bbq-rice-bowl';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'egg-roll-in-a-bowl';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'green-goddess-chicken-wrap';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'coffee-date-smoothie';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'chicken-pad-thai';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'tofu-scramble-wrap';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'baked-spaghetti-squash';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'bone-broth-hot-chocolate';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'peppermint-chocolate-mousse-parfait';
UPDATE ni_recipes SET recipe_servings = 2 WHERE slug = 'snow-globe-mocktail';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'sugar-cookie-overnight-oats';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'salted-peppermint-mocha';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'candy-cane-crunch-cake';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'egg-nog-latte';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'oat-nog-ninja-creami';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'spiced-orange-cran-mocktail';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'winter-spiced-overnight-oats';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'spiced-orange-cran-mocktail-xd56c';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'gingerbread-shaken-espresso';
UPDATE ni_recipes SET recipe_servings = 2 WHERE slug = 'high-protein-snickers-salad';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'gingerbread-protein-pancakes';
UPDATE ni_recipes SET recipe_servings = 2 WHERE slug = 'sweet-potato-toast';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'peppermint-mocha-smoothie';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'butternut-squash-mac';
UPDATE ni_recipes SET recipe_servings = 12 WHERE slug = 'candied-cranberries';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'gingerbread-baked-oats';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'sugar-cookie-matcha-latte';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'roasted-maple-carrots';
UPDATE ni_recipes SET recipe_servings = 12 WHERE slug = 'sugar-cookie-protein-balls';
UPDATE ni_recipes SET recipe_servings = 2 WHERE slug = 'egg-nog-french-toast';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'sugar-cookie-whip-dip';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'strawberry-santa-hats';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'single-serve-hot-cocoa-protein-pancakes';
UPDATE ni_recipes SET recipe_servings = 8 WHERE slug = 'instant-pot-chili';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'meal-prep-breakfast-burritos';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'pomegranate-raspberry-fizz';
UPDATE ni_recipes SET recipe_servings = 17 WHERE slug = 'valentines-protein-bites';
UPDATE ni_recipes SET recipe_servings = 12 WHERE slug = 'chocolate-covered-strawberries';
UPDATE ni_recipes SET recipe_servings = 5 WHERE slug = 'mediterranean-chicken-shawarma-bowls';
UPDATE ni_recipes SET recipe_servings = 8 WHERE slug = 'slow-cooker-korean-beef-rice-bowls';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'deconstructed-burger-bowls';
UPDATE ni_recipes SET recipe_servings = 5 WHERE slug = 'sheet-pan-bbq-chicken-with-roasted-veggies';
UPDATE ni_recipes SET recipe_servings = 1 WHERE slug = 'avocado-cucumber-salad';
UPDATE ni_recipes SET recipe_servings = 5 WHERE slug = 'slow-roasted-salmon-quinoa-bowl';
UPDATE ni_recipes SET recipe_servings = 5 WHERE slug = 'sheet-pan-garlic-shrimp-and-roasted-veggies';
UPDATE ni_recipes SET recipe_servings = 5 WHERE slug = 'grilled-bbq-chicken-bowls';
UPDATE ni_recipes SET recipe_servings = 5 WHERE slug = 'harissa-roasted-chicken-sweet-potatoes';
UPDATE ni_recipes SET recipe_servings = 8 WHERE slug = 'lemon-chicken-orzo-salad';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'sheet-pan-chicken-fajitas';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'tropical-grill-kabobs';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'hashbrown-egg-casserole-with-feta-spinach-sundried-tomatoes';
UPDATE ni_recipes SET recipe_servings = 6 WHERE slug = 'slow-cooker-pork-carnitas';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'high-protein-chocolate-mousse';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'mexican-street-corn-chicken';
UPDATE ni_recipes SET recipe_servings = 4 WHERE slug = 'crispy-creamy-salsa-tacos';

-- Summary:
-- 47 recipes with 1 serving(s)
-- 10 recipes with 2 serving(s)
-- 22 recipes with 4 serving(s)
-- 8 recipes with 5 serving(s)
-- 15 recipes with 6 serving(s)
-- 8 recipes with 8 serving(s)
-- 1 recipes with 9 serving(s)
-- 4 recipes with 10 serving(s)
-- 4 recipes with 12 serving(s)
-- 1 recipes with 17 serving(s)
-- 2 recipes with 18 serving(s)
-- 1 recipes with 20 serving(s)
-- 1 recipes with 24 serving(s)
