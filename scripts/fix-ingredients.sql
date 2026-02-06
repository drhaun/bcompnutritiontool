-- Fix recipe ingredients and directions
-- Generated on 2026-02-06T03:51:08.508Z
-- Total recipes: 124

UPDATE ni_recipes SET 
  ingredients = '[{"item":"oats","amount":"1/3 cup"},{"item":"unsweetened almond milk","amount":"1/4 cup"},{"item":"coconut Greek yogurt","amount":"1/3 cup"},{"item":"chocolate protein powder","amount":"1 scoop"},{"item":"shredded coconut","amount":"1/2 tbsp"},{"item":"dark chocolate chips","amount":"1 tbsp"},{"item":"cocoa powder","amount":"1/2 tsp"},{"item":"sliced almonds","amount":"1/2 tbsp"}]'::jsonb,
  directions = '["In a mason jar, add the almond milk and protein powder.","Tighten the lid and shake it so the protein powder combines with the milk.","Add other ingredients.","Close the lid and shake to combine.","Place your jar in the refrigerator for at least 2 hours or overnight.","Stir before eating and enjoy!"]'::jsonb
WHERE slug = 'almond-joy-overnight-oats';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"whole wheat tortilla","amount":"1"},{"item":"scrambled eggs","amount":"2"},{"item":"turkey sausage","amount":"1/4 cup"},{"item":"shredded cheddar cheese","amount":"1/4 cup"},{"item":"spinach","amount":"1/2 cup"}]'::jsonb,
  directions = '["Cook the eggs and sausage first in separate pans.","Add the spinach in the pan with the eggs.","Once those are cooked, heat the tortilla in the microwave for 5 seconds.","Then build the burrito using eggs with spinach first, then sausage, and adding cheese on top.","Fold tightly and enjoy!"]'::jsonb
WHERE slug = 'healthier-breakfast-burrito';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"Multigrain English Muffin","amount":"1"},{"item":"egg whites, cooked","amount":"3 tbsp"},{"item":"light Laughing Cow cheese wedge","amount":"1"},{"item":"Turkey Sausage patty","amount":"1"}]'::jsonb,
  directions = '["For the egg whites, use a muffin pan and pour 3 tbsp in each tin.","Bake for 10 minutes at 350°F.","While those are cooking, heat the English muffin and cheese in a toaster oven and microwave the turkey sausage patty according to the package directions.","Then stack the egg white muffin and sausage patty on the English muffin."]'::jsonb
WHERE slug = 'healthier-breakfast-sandwich';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"egg whites","amount":"1 cup"},{"item":"spinach, chopped","amount":"1/2 cup"},{"item":"shredded mozzarella cheese","amount":"1/2 cup"},{"item":"Dash of sea salt and pepper","amount":"1"}]'::jsonb,
  directions = '["Preheat the oven to 350°F.","Spray a 6 muffin tin with cooking spray.","Mix egg whites, cheese, spinach, and salt and pepper.","Pour mixture evenly among tins.","Cook for 18 minutes or until the eggs are cooked all the way through.","Let cool before eating. Enjoy!"]'::jsonb
WHERE slug = 'spinach-cheese-egg-muffins';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"s Dave''s multigrain bread","amount":"2 slice"},{"item":"avocado","amount":"1/2"},{"item":"grilled chicken breast","amount":"3 oz"},{"item":"mozzarella cheese","amount":"1 slice"},{"item":"sea salt","amount":"1 dash"},{"item":"pepper","amount":"1 dash"}]'::jsonb,
  directions = '["Toast bread according to preference.","Dice avocado into small pieces and sprinkle salt and pepper on the pieces.","Once bread is finished toasting, spread avocado onto toast and mash into a jam like consistency.","Cook chicken breast according to preference and top with cheese to melt.","Place on slice of toast and top with other piece of toast and enjoy!"]'::jsonb
WHERE slug = 'chicken-avocado-melt';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"ground turkey","amount":"24 oz"},{"item":"reduced-fat feta cheese","amount":"1/2 cup"},{"item":"minced garlic","amount":"4 tsp"},{"item":"red onion, diced","amount":"1 small"},{"item":"spinach","amount":"1 cup"},{"item":"oregano","amount":"1/2 tsp"},{"item":"sea salt","amount":"1 tsp"},{"item":"pepper","amount":"1/2 tsp"}]'::jsonb,
  directions = '["Combine all ingredients for the turkey burgers in a large bowl.","Form into patties.","On stove top, heat a large skillet and cook for 5 minutes, flip, then turn the heat to medium low. Cover for the next 5 minutes until all burgers are cooked.","Preheat oven to 375 and cook for ~25 minutes.","Serve with bun, fries, Greek salad, etc."]'::jsonb
WHERE slug = 'greek-turkey-burgers';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"raw chicken breast","amount":"2 lb"},{"item":"s fajita or taco seasoning","amount":"2 packet"},{"item":"ranch seasoning","amount":"1 packet of"}]'::jsonb,
  directions = '["Preheat oven to 375°F.","Slice chicken into half inch strips.","Put the strips in a bowl and toss them in the fajita and ranch seasonings.","Bake for about 20 mins, or until they are cooked completely."]'::jsonb
WHERE slug = 'taco-chicken';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"salmon fillet","amount":"1"},{"item":"dijon mustard","amount":"2 tbsp"},{"item":"cilantro","amount":"1 tbsp"},{"item":"parsley","amount":"1 tbsp"},{"item":"salt","amount":"1/2 tsp"},{"item":"pepper","amount":"1/2 tsp"},{"item":"paprika","amount":"1/2 tsp"},{"item":"breadcrumbs","amount":"1/4 cup"},{"item":"olive oil","amount":"1/2 tbsp"}]'::jsonb,
  directions = '["Cut the salmon fillet into 1-inch pieces.","In a food processor or blender, add salmon cubes, mustard, herbs, salt, pepper, and paprika.","Pulse until mixed together well. There should be some small chunks.","Transfer salmon mixture to a medium-sized bowl.","Add the breadcrumbs and mix with a spatula until combined.","Evenly divide the salmon mixture into four portions (about 4-oz. each) then shape into patties.","Cook on the stovetop over medium high heat until the fillet is golden brown.","Flip and let it cook for a few more minutes."]'::jsonb
WHERE slug = 'salmon-burger';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"boneless skinless chicken breast","amount":"2 lb"},{"item":"s Primal Kitchen BBQ sauce","amount":"1.5 cup"},{"item":"apple cider vinegar","amount":"1/4 cup"},{"item":"onion powder","amount":"1/2 tsp"},{"item":"garlic powder","amount":"1/2 tsp"}]'::jsonb,
  directions = '["In a bowl, mix BBQ sauce, vinegar, onion and garlic powder.","Place chicken breasts in the bottom of the crockpot.","Pour the sauce over the chicken and cook chicken on high for 2-3 hours or until completely cooked.","Shred the chicken once finished cooking."]'::jsonb
WHERE slug = 'crockpot-bbq-chicken';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"Joseph''s Lavash Wrap","amount":"1"},{"item":"grilled chicken","amount":"4 oz"},{"item":"onion","amount":"10 g"},{"item":"hummus","amount":"30 g"},{"item":"tomatoes","amount":"60 g"},{"item":"reduced-fat feta cheese","amount":"30 g"},{"item":"cucumber","amount":"40 g"},{"item":"pickles","amount":"20 g"},{"item":"spinach","amount":"40 g"},{"item":"homemade tzatziki sauce","amount":"60 g"}]'::jsonb,
  directions = '["Make Tzatziki sauce by mixing Greek yogurt, lemon juice, dill, and diced pickles into a small bowl. Set aside.","Dice the tomatoes, cucumber, and pickles.","Spread hummus on the lavash wrap.","Layer onion, tomatoes, feta cheese, and thin slices of cucumber in the middle of the wrap.","Slice the grilled chicken into strips.","Add the pickles, spinach, and homemade tzatziki sauce.","Wrap it up and enjoy!"]'::jsonb
WHERE slug = 'mediterranean-wrap';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"ground turkey","amount":"1 lb"},{"item":"sweet potatoes, peeled and diced","amount":"2 medium"},{"item":"zucchini, diced","amount":"2"},{"item":"shredded parmesan cheese","amount":"2/3 cup"},{"item":"garlic powder","amount":"1 tsp"},{"item":"rosemary","amount":"1 tsp"},{"item":"olive oil","amount":"5 tbsp"},{"item":"salt and pepper","amount":"1/4 tsp"}]'::jsonb,
  directions = '["Preheat oven to 400°F.","Place in a large baking dish and toss the diced sweet potatoes with 2 tbsp olive oil, 1/2 tsp garlic powder, 1/2 tsp rosemary, salt, and pepper.","Bake the sweet potatoes for 30 minutes.","While sweet potatoes are in the oven, sauté the ground turkey in a pan with 1 tbsp olive oil, 1 tsp garlic powder, 1/2 tsp rosemary, salt, and pepper.","Remove the sweet potato from the oven.","Layer the ground turkey and diced zucchini on top of the sweet potatoes.","Bake for 10 minutes.","Add in an additional 2 tbsp olive oil, mix, and top with the shredded parmesan cheese.","Bake for 10 minutes."]'::jsonb
WHERE slug = 'ground-turkey-sweet-potato-bake';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"chicken","amount":"20 oz"},{"item":"(14 oz) diced tomatoes","amount":"1 can"},{"item":"(15 oz) black beans","amount":"1 can"},{"item":"frozen corn","amount":"8 oz"},{"item":"cilantro","amount":"1/4 cup"},{"item":"chicken broth","amount":"14 oz"},{"item":"garlic powder, onion powder, ground cumin, and sea salt","amount":"1 tsp"},{"item":"avocado, sliced (for topping)","amount":"1/2"}]'::jsonb,
  directions = '["Combine all ingredients in a crockpot and cook on low for 8 - 10 hours or on high for 4 to 6 hours.","Add avocado slices on top before serving."]'::jsonb
WHERE slug = 'crockpot-sante-fe-chicken';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"unsweetened coconut milk","amount":"1 cup"},{"item":"water","amount":"1/4 cup"},{"item":"vanilla extract","amount":"1 tsp"},{"item":"chia seeds","amount":"6 tbsp"},{"item":"frozen blueberries","amount":"1.5 cup"},{"item":"water","amount":"2 tbsp"}]'::jsonb,
  directions = '["You will need a container with an airtight lid. A Mason jar works best.","Pour coconut milk first. Then, add in the chia seeds, 1/4 cup water, and vanilla extract.","Put the top on and shake it for 15 seconds.","Add frozen blueberries and 2 tbsp water to a sauce pan and heat on medium.","After about 3-5 minutes, smash the blueberries.","Reduce the heat to medium-low to simmer for 10 minutes, stirring frequently.","Once cooled, add the sauce on top of the chia pudding.","Put the container in the refrigerator for 4 hours.","Take it out and stir it up and enjoy!"]'::jsonb
WHERE slug = 'blueberry-coconut-chia-seed-pudding';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"fresh green beans, trimmed and cut into bite-sized pieces","amount":"1 lb"},{"item":"bsp olive oil","amount":"2"},{"item":"onion, finely chopped","amount":"1 small"},{"item":"s garlic, minced","amount":"2 clove"},{"item":"s mushrooms, sliced","amount":"8 ounce"},{"item":"whole wheat flour","amount":"2 tbsp"},{"item":"low-sodium vegetable broth","amount":"1 cup"},{"item":"unsweetened almond milk (or any other milk alternative)","amount":"1 cup"},{"item":"Salt and pepper to taste","amount":"1"},{"item":"dried thyme","amount":"1 tsp"},{"item":"whole grain breadcrumbs","amount":"1 cup"},{"item":"grated Parmesan cheese (optional)","amount":"2 tbsp"},{"item":"Cooking spray","amount":"1"}]'::jsonb,
  directions = '["Preheat the oven: Preheat your oven to 375°F (190°C).","Blanch the green beans: Bring a large pot of water to a boil. Add the green beans and cook for 3-4 minutes, then immediately transfer them to a bowl of ice water to stop the cooking process. Drain and set aside.","Make the mushroom sauce:In a large skillet, heat the olive oil over medium heat. Add chopped onions and garlic, sautéing until softened.","Add sliced mushrooms and cook until they release their moisture and become golden brown.","Sprinkle flour over the mushroom mixture and stir well to coat. Cook for 1-2 minutes to remove the raw flour taste.","Slowly whisk in the vegetable broth and almond milk. Stir continuously until the mixture thickens.","Season with salt, pepper, and dried thyme. Allow the sauce to simmer for a few minutes until it reaches a creamy consistency.","Assemble the casserole:Add the blanched green beans to the mushroom sauce, stirring until well coated.","Transfer the mixture to a lightly greased baking dish.","Prepare the topping:In a small bowl, mix the whole grain breadcrumbs with grated Parmesan cheese (if using).","Sprinkle the breadcrumb mixture evenly over the green bean mixture.","Bake:Bake in oven for 20-25 minutes or until the top is golden brown and the casserole is bubbling around the edges.","Serve:Allow the casserole to cool for a few minutes before serving.","Enjoy your healthier green bean casserole!"]'::jsonb
WHERE slug = 'lightened-up-green-bean-casserole';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"Brussels sprouts, trimmed and halved","amount":"1 lb"},{"item":"olive oil","amount":"2 tbsp"},{"item":"Salt and black pepper to taste","amount":"1"},{"item":"balsamic vinegar","amount":"2 tbsp"},{"item":"honey or maple syrup (optional, for sweetness)","amount":"1 tbsp"},{"item":"-2 cloves garlic, minced (optional, for added flavor)","amount":"1"},{"item":"chopped fresh parsley (for garnish, optional)","amount":"2 tbsp"}]'::jsonb,
  directions = '["Preheat the Oven: Preheat your oven to 400°F (200°C).","Prepare Brussels Sprouts:Trim the ends of the Brussels sprouts and cut them in half.","Place them in a large bowl.","Seasoning:Drizzle olive oil over the Brussels sprouts, ensuring they are evenly coated.","Season with salt and black pepper to taste. Add minced garlic if desired.","Roast Brussels Sprouts:Spread the Brussels sprouts in a single layer on a baking sheet.","Roast in oven for 20-25 minutes or until they are golden brown and crispy on the edges. Shake or stir them halfway through to ensure even cooking.","Prepare Balsamic Glaze:While the Brussels sprouts are roasting, prepare the balsamic glaze.","In a small saucepan, heat balsamic vinegar over medium heat.","Optional: add honey or maple syrup for sweetness. Simmer for 5-7 minutes or until the vinegar has reduced by half and has a syrupy consistency.","Combine and Glaze:Once the Brussels sprouts are done roasting, transfer them to a serving bowl.","Drizzle the balsamic glaze over the roasted Brussels sprouts and toss them to coat evenly.","Garnish and Serve:Optionally, garnish with chopped fresh parsley for a burst of freshness.","Serve Warm:Serve the roasted Brussels sprouts with balsamic glaze immediately while warm."]'::jsonb
WHERE slug = 'roasted-brussels-sprouts-with-balsamic-glaze';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"kale, stems removed and leaves thinly sliced","amount":"1 bunch"},{"item":"s butternut squash, peeled and diced into bite-sized pieces","amount":"2 cup"},{"item":"pumpkin seeds (pepitas), toasted","amount":"1/2 cup"},{"item":"dried cranberries","amount":"1/3 cup"},{"item":"feta cheese, crumbled (optional)","amount":"1/4 cup"},{"item":"Salt and black pepper to taste","amount":"1"}]'::jsonb,
  directions = '["Roast Butternut Squash:Preheat your oven to 400°F (200°C).","Toss the diced butternut squash with a bit of olive oil, salt, and pepper.","Spread the squash on a baking sheet in a single layer and roast for 20-25 minutes or until tender and golden brown. Allow it to cool.","Prepare Kale:In a large bowl, massage the kale with a bit of olive oil for a few minutes until it becomes tender and dark green.","Assemble the Salad:Add the roasted butternut squash, toasted pumpkin seeds, dried cranberries, and crumbled feta cheese (optional) to the massaged kale.","Prepare the Dressing:In a small bowl, whisk together the olive oil, balsamic vinegar, maple syrup or honey, Dijon mustard, salt, and pepper.","Dress the Salad:Pour the dressing over the salad and toss everything together until well coated.","Chill (Optional):If time allows, let the salad chill in the refrigerator for 30 minutes to allow the flavors to meld.","Serve:Serve the kale salad in a large bowl or on a platter, and sprinkle additional pumpkin seeds and cranberries on top for garnish if desired."]'::jsonb
WHERE slug = 'thanksgiving-kale-salad-with-roasted-butternut-squash';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"sweet potatoes, peeled and cubed","amount":"4 medium"},{"item":"coconut oil or olive oil","amount":"2 tbsp"},{"item":"egg","amount":"1"},{"item":"pure maple syrup or honey","amount":"1/4 cup"},{"item":"ground cinnamon","amount":"1 tsp"},{"item":"nutmeg","amount":"1/2 tsp"},{"item":"unsweetened almond milk (or any milk alternative)","amount":"1/4 cup"},{"item":"vanilla extract","amount":"1 tsp"},{"item":"Pinch of salt","amount":"1"}]'::jsonb,
  directions = '[]'::jsonb
WHERE slug = 'sweet-potato-casserole-with-pecan-topping';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"apples","amount":"6"},{"item":"cinnamon","amount":"1 tbsp"},{"item":"dash of salt","amount":"1"},{"item":"coconut oil","amount":"2 tsp"}]'::jsonb,
  directions = '["Preheat oven to 350°F.","Chop the apples and sauté them along with cinnamon, salt, and coconut oil in a pan at medium high heat for 2-3 minutes.","In a food processor, mix all crumble ingredients with 1 tbsp of water until throughly combined.","Add crumble and apple mixture to a small baking pan and bake for 15-20 minutes."]'::jsonb
WHERE slug = 'apple-crisp-crumble';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"s old fashioned oats","amount":"2 cup"},{"item":"almond butter","amount":"1/2 cup"},{"item":"bananas","amount":"2 large"},{"item":"blueberries","amount":"1/2 cup"},{"item":"hazelnuts","amount":"1/4 cup"}]'::jsonb,
  directions = '["Preheat the oven to 350°F.","In a large mixing bowl, combine all base ingredients, and mix well.","Bake for 20-25 minutes, or until completely cooked.","Remove from the oven and allow it to cool in the pan for 15 minutes, before carefully transferring to a wire rack to cool completely.","Once cool, drizzle the topping."]'::jsonb
WHERE slug = 'blueberry-breakfast-bake';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"broccoli, chopped","amount":"1 cup"},{"item":"diced onion","amount":"1/4 cup"},{"item":"s of turkey bacon","amount":"5 slice"},{"item":"eggs","amount":"8"},{"item":"low fat shredded cheese","amount":"1/2 cup"},{"item":"olive oil","amount":"1 tbsp"},{"item":"garlic powder","amount":"1/2 tsp"},{"item":"salt","amount":"1/4 tsp"},{"item":"pepper","amount":"1/4 tsp"}]'::jsonb,
  directions = '["Preheat the oven to 400°F.","Cook turkey bacon according to package instructions and then cut up into small pieces.","Add olive oil, broccoli, onion, salt, garlic powder, and pepper to a pan and sauté over medium heat.","In a bowl, whisk the eggs, bacon, and cheese.","Pour pan contents into the bowl and mix throughly.","In a six count muffin tin, distribute mix evenly and bake for 15-20 minutes or until completely cooked."]'::jsonb
WHERE slug = 'broccoli-cheddar-egg-muffins';

UPDATE ni_recipes SET 
  ingredients = '[{"item":". turkey sausage","amount":"1 lb"},{"item":"s egg whites","amount":"1.5 cup"},{"item":"low fat cottage cheese","amount":"1.5 cup"},{"item":"servings of tater tots (504 g)","amount":"6"},{"item":"shredded cheddar cheese","amount":"1/2 cup"},{"item":"salt","amount":"1/2 tsp"},{"item":"pepper","amount":"1/2 tsp"},{"item":"garlic powder","amount":"1/2 tsp"}]'::jsonb,
  directions = '["Preheat oven to 375°F degrees.","Spray a casserole dish with cooking grease and set aside.","Heat a skillet over medium-high heat.","Brown turkey sausage and drain excess grease from skillet. Set aside.","In a blender, add egg whites, cottage cheese, and seasonings. Blend until creamy.","Pour the blended egg mixture into the bottom of the greased casserole dish and add the cooked turkey sausage.","Sprinkle ½ of the cheese across the top.","Evenly distribute the tater tots across the top of the casserole and add the remaining cheese.","Bake at 375°F for 40 mins."]'::jsonb
WHERE slug = 'tater-tot-breakfast-casserole';

UPDATE ni_recipes SET 
  ingredients = '[{"item":". shrimp, peeled and deveined","amount":"1 lb"},{"item":"olive oil","amount":"2 tbsp"},{"item":"agave or honey","amount":"2 tbsp"},{"item":"reduced sodium soy sauce","amount":"2 tbsp"},{"item":"ginger","amount":"1/2 tsp"},{"item":"minced garlic","amount":"1 tbsp"},{"item":"s broccoli","amount":"2 cup"},{"item":"s brown rice","amount":"2 cup"}]'::jsonb,
  directions = '["In a bowl, mix olive oil, agave, soy sauce, ginger, and minced garlic.","Marinade shrimp in the sauce for 20 minutes.","Steam broccoli and cook rice, set both aside.","In a large skillet on medium high heat, pour shrimp and sauce into pan and sear for 2 minutes on each side.","Add broccoli and rice and reduce heat to low.","Cover and let sear for 5 minutes or until all sauce has been absorbed.","Enjoy!"]'::jsonb
WHERE slug = 'shrimp-and-broccoli-stir-fry';

UPDATE ni_recipes SET 
  ingredients = '[{"item":". chicken (cooked)","amount":"30 oz"},{"item":". frozen riced cauliflower","amount":"30 oz"},{"item":"Primal Kitchen buffalo sauce","amount":"1/3 cup"},{"item":"ranch seasoning","amount":"1 packet"},{"item":"s shredded cheese","amount":"2 cup"},{"item":"reduced fat cream cheese","amount":"8 oz"}]'::jsonb,
  directions = '["Preheat oven to 350°F.","Microwave riced cauliflower according to package instructions.","Combine all ingredients, including cooked cauliflower, in a large bowl and mix.","Pour mixture into a casserole dish and bake for 35 minutes."]'::jsonb
WHERE slug = 'buffalo-chicken-casserole';

UPDATE ni_recipes SET 
  ingredients = '[{"item":". chicken tenderloins","amount":"24 oz"},{"item":"black beans","amount":"1 cup"},{"item":"red bell peppers","amount":"1 cup"},{"item":"chickpeas","amount":"1 cup"},{"item":"corn","amount":"1 cup"},{"item":"cucumber, chopped","amount":"1 cup"},{"item":"cooked shallot","amount":"1 cup"},{"item":"jalapeno peppers, chopped","amount":"1 cup"},{"item":"cilantro","amount":"1 tbsp"},{"item":"low-fat shredded cheese","amount":"1 cup"},{"item":"Primal Kitchen cilantro lime dressing","amount":"2 tbsp"},{"item":"s lettuce","amount":"2 cup"}]'::jsonb,
  directions = '["Cook chicken, black beans, chickpeas, and shallots prior to assembling salad.","Chop peppers and onions.","In a large bowl, add cooked ingredients and chopped vegetables to lettuce.","Toss with Primal Kitchen cilantro lime dressing."]'::jsonb
WHERE slug = 'southwest-chicken-salad';

UPDATE ni_recipes SET 
  ingredients = '[{"item":". 90% lean ground beef","amount":"1 lb"},{"item":"Worcestershire sauce","amount":"1 tbsp"},{"item":"sugar free ketchup","amount":"2 tbsp"},{"item":"mustard","amount":"2 tbsp"},{"item":"minced onion","amount":"1 tsp"},{"item":"salt and pepper","amount":"1 dash of"},{"item":"Joseph''s Lavash bread sheets","amount":"4"},{"item":"shredded cheddar cheese","amount":"1 cup"},{"item":"s lettuce","amount":"2 cup"},{"item":"tomatoes, chopped","amount":"1 cup"},{"item":"red onion, chopped","amount":"1"}]'::jsonb,
  directions = '["Cook ground beef in fry pan.","Add Worcestershire sauce, ketchup, minced onion, salt, and pepper to beef and stir.","Lay Lavash bread sheets flat and sprinkle cheese on each.","Add beef, lettuce, and tomato to Lavash bread.","Wrap filling up in Lavash bread and heat on each side for 2-3 minutes or until lightly browned."]'::jsonb
WHERE slug = 'cheeseburger-wrap';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"s butternut squash","amount":"2 cup"},{"item":"olive oil","amount":"3 tbsp"},{"item":"salt","amount":"1/4 tsp"},{"item":"black pepper","amount":"1/4 tsp"},{"item":". turkey sausage, crumbled","amount":"1/2 lb"},{"item":"arlic cloves, minced","amount":"4 g"},{"item":". spinach","amount":"6 oz"},{"item":"heavy cream","amount":"1 cup"},{"item":"shredded parmesan cheese","amount":"1/3 cup"},{"item":". Banza bow tie pasta","amount":"8 oz"}]'::jsonb,
  directions = '["Preheat oven to 400°F.","In a large bowl, toss cubed butternut squash with 1 tbsp olive oil, salt, and pepper.","Spread the squash on a parchment paper-lined baking sheet in one layer and roast for 30 minutes.","In a medium skillet, heat 1 tablespoon of olive oil on medium heat.","Add crumbled sausage to skillet and cook for about 10 minutes, regularly stirring, until the sausage is cooked through. Set aside.","Cook pasta according to package instructions. Set aside.","In a separate, large skillet, heat 1 tablespoon of olive oil together with minced garlic and spinach over medium heat and cook for about 5 or 7 minutes or until spinach starts to wilt.","Add heavy cream to skillet until boiling, then immediately reduce to simmer.","Add shredded Parmesan cheese to skillet continuing to stir on simmer until the cheese melts.","Add cooked, drained pasta, cooked sausage, and butternut squash to the skillet with the creamy spinach sauce and stir to combine."]'::jsonb
WHERE slug = 'creamy-butternut-squash-pasta';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"salmon fillet (around 1 lb)","amount":"2"},{"item":"s reduced sodium bone broth","amount":"2 tbsp"},{"item":"minced garlic","amount":"2 tsp"},{"item":"lemon juice","amount":"1.5 tbsp"},{"item":"salt","amount":"½ tsp"},{"item":"pepper","amount":"½ tsp"},{"item":"avocado oil butter","amount":"2 tbsp"},{"item":"parsley","amount":"2 tbsp"},{"item":"asparagus (450 g)","amount":"1 lb"}]'::jsonb,
  directions = '["Preheat your oven to 425°F.","Prepare 2 aluminum foil sheets (14 x 12) on top of a baking sheet.","In a small mixing bowl, combine bone broth, lemon juice, garlic, butter, salt, and pepper.","Lay salmon on one sheet of foil and fold edges up so that the salmon is surrounded and the mixture won’t fall out.","Lay asparagus on the other sheet of foil. Spray both with cooking spray. Pour ¾ of sauce mixture on the salmon and the remaining ¼ on the asparagus.","Add parsley on top of both asparagus and salmon","Cook for 20-25 minutes or until salmon is cooked all the way through.","Carefully unwrap each sheet of foil and let cool before eating."]'::jsonb
WHERE slug = 'foil-baked-salmon-and-asparagus';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"plain, nonfat Greek yogurt","amount":"1 cup of"},{"item":"light Cool Whip","amount":"1 cup"},{"item":"sugar free instant vanilla pudding mix","amount":"2 tbsp"},{"item":"Oreo thins","amount":"4"}]'::jsonb,
  directions = '["Add Oreos to a bag and crush them.","Then, add all the ingredients to a bowl and mix!","Pair with graham crackers, pretzels, etc.","Enjoy!"]'::jsonb
WHERE slug = 'protein-oreo-dip';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"frozen strawberries","amount":"1 cup of"},{"item":"frozen banana","amount":"1 medium"},{"item":"plain non-fat Greek yogurt","amount":"1/2 cup"},{"item":"unsweetened plain almond milk","amount":"1 cup"},{"item":"vanilla extract","amount":"1/2 tsp"},{"item":"chia seeds","amount":"2 tbsp"},{"item":"frozen mango","amount":"1 cup"},{"item":"frozen blueberries","amount":"100 g"},{"item":"vanilla protein powder","amount":"1 scoop"}]'::jsonb,
  directions = '["Add all ingredients to a blender.","Blend until smooth.","Enjoy!"]'::jsonb
WHERE slug = 'fruity-chia-seed-smoothie';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"sweet potatoes, cut into cubes (3 cups)","amount":"2 medium"},{"item":"olive oil","amount":"2 tbsp"},{"item":"ground cumin","amount":"½ tsp"},{"item":"chili powder","amount":"½ tsp"},{"item":"sea salt","amount":"¼ tsp"},{"item":"black beans, drained and rinsed","amount":"1 can of"},{"item":"lime juice","amount":"2 tsp"},{"item":"pepper","amount":"1 tsp"},{"item":"chopped cilantro","amount":"¼ cup"}]'::jsonb,
  directions = '["Preheat oven to 400°F.","Prepare a baking sheet.","In a large bowl, add 1 tbsp olive oil, cumin, chili powder, and salt. Mix. Add in sweet potatoes and toss until they are coated.","Place sweet potatoes on the baking sheet and bake for 25 minutes or until tender.","When the sweet potatoes have 5 minutes remaining, add black beans, 1 tsp lime juice, and 1 tbsp olive oil to a medium sized skillet. Mix and let saute for 5 minutes.","Add sweet potatoes and other tsp of lime juice to the skillet. Stir to combine. Add cilantro on top.","Let it heat for 3 more minutes and enjoy!"]'::jsonb
WHERE slug = 'sweet-potato-hash';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"s brown rice","amount":"2 cup"},{"item":"olive oil","amount":"1 tbsp"},{"item":"diced onion","amount":"½ cup"},{"item":"diced bell pepper","amount":"1 medium"},{"item":"minced garlic","amount":"1 ½ tsp"},{"item":"s reduced-sodium bone broth","amount":"3 cup"},{"item":"diced tomatoes","amount":"1 can"},{"item":"fresh chopped cilantro","amount":"1 tbsp"},{"item":"ground cumin","amount":"2 tsp"},{"item":"chili powder","amount":"1 tsp"},{"item":"sea salt","amount":"¼ tsp"},{"item":"black beans, drained and rinsed","amount":"2 can"},{"item":"lime juice","amount":"2 tbsp"}]'::jsonb,
  directions = '["Cook brown rice according to the package instructions.","Heat the olive oil in a large skillet. Once oil is hot, add the onions, bell pepper, and garlic. Saute for 5 minutes.","Add bone broth, cooked brown rice, beans, tomatoes, cilantro, cumin, chili powder, oregano, and salt to skillet. Stir.","Bring to a boil on high heat then cover with the lid and reduce to simmer on medium low heat. Simmer for about 20-25 minutes, stirring occasionally.","Stir in lime juice and let sit for 5 minutes.","Serve and enjoy."]'::jsonb
WHERE slug = 'black-beans-and-rice';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"hard-boiled eggs","amount":"4 large"},{"item":"Primal Kitchen Mayonaise","amount":"4 tsp"},{"item":"Dijon mustard","amount":"1/2 tsp"},{"item":"chives or scallions","amount":"2 tbsp"},{"item":"sea salt","amount":"1/2 tsp"},{"item":"pepper","amount":"1/2 tsp"}]'::jsonb,
  directions = '["Chop eggs.","Combine with mayonnaise, mustard, chives, salt, and pepper."]'::jsonb
WHERE slug = 'healthier-egg-salad';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"sweet potato","amount":"32 oz"},{"item":"olive oil","amount":"1 tbsp"},{"item":"garlic powder","amount":"1 tsp"},{"item":"sea salt","amount":"1 tsp"},{"item":"pepper","amount":"1 tsp"}]'::jsonb,
  directions = '["Preheat the oven to 400°F.","Cut the sweet potatoes into sticks (1/4 to 1/2 inch wide and 3 inches long) and toss them with the oil.","Mix the spices in a small bowl.","Toss sweet potatoes in spices.","Spread fries out on a baking sheet.","Bake for 15 minutes, then flip and finishing cooking for 10 minutes."]'::jsonb
WHERE slug = 'homemade-sweet-potato-fries';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"oats","amount":"2 cup"},{"item":"cinnamon","amount":"1/2 tsp"},{"item":"salt","amount":"1/4 tsp"},{"item":"creamy peanut butter (or other nut butter)","amount":"1/2 cup"},{"item":"vanilla extract","amount":"1/2 tsp"},{"item":"ripe bananas","amount":"2 large"},{"item":"dark chocolate chips","amount":"1/4 cup"},{"item":"chia seeds","amount":"1 tbsp"}]'::jsonb,
  directions = '["Preheat oven to 350°F.","Line a baking sheet with parchment paper.","In a large bowl, combine all ingredients, stirring until well mixed.","Place 2 tablespoon sized scoops onto the baking sheet. Flatten slightly, forming the shape of a cookie.","Bake for 14-17 minutes, or until the edges begin to brown.","Remove from the oven and cool."]'::jsonb
WHERE slug = 'banana-oat-cookies';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"unsweetened almond milk","amount":"1 cup"},{"item":"s ice","amount":"2 cup"},{"item":"cold coffee or cold brew","amount":"1 cup"},{"item":"protein powder (chocolate or vanilla)","amount":"1 scoop"},{"item":"frozen banana","amount":"1"}]'::jsonb,
  directions = '["Add all ingredients to a blender.","Blend until mixed well."]'::jsonb
WHERE slug = 'iced-coffee-protein-shake';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"apples (about 3 cups, chopped)","amount":"3"},{"item":"water","amount":"2 tbsp"},{"item":"coconut oil","amount":"1 tbsp"},{"item":"honey (sub maple syrup)","amount":"1 tbsp"},{"item":"ground cinnamon","amount":"½ tsp"},{"item":"⅛ tsp sea salt","amount":"1"},{"item":"pure vanilla extract","amount":"¼ tsp"}]'::jsonb,
  directions = '["Cut apples into cubes.","Place apples pieces into a skillet with 2 tbsp water. Cover the pan and cook over medium heat for about 5 minutes, stirring occasionally, until the apples become slightly soft and water is absorbed.","Add coconut oil to the skillet. Stir apples and oil together until all the apples are coated. Cook for 5 minutes, stirring every minute or so, until the apples become soft (If apples do not soften, cover apples for the last 2 minutes).","Add honey (or maple syrup), cinnamon, salt, and vanilla to apple mixture. Stir until well mixed.","Cook for about 5 more minutes, stirring every minute until the apples reach your desired softness!"]'::jsonb
WHERE slug = 'healthy-cinnamon-apples';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"chia seeds","amount":"2 tbsp"},{"item":"cashew milk","amount":"1 cup"},{"item":"powdered peanut butter","amount":"2 tbsp"},{"item":"vanilla protein powder","amount":"1/2 scoop"}]'::jsonb,
  directions = '["In a container with an airtight lid or a mason jar, pour cashew milk into container.","Add in chia seeds, peanut butter powder, and protein powder.","Put the top on the container and shake for 15 seconds.","Put the container in the refrigerator for 1 hour.","Take container out and shake it again for 15 seconds.","Let sit for 3 more hours in the refrigerator before enjoying"]'::jsonb
WHERE slug = 'peanut-butter-chia-pudding';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"ziti noodles (100% whole wheat)","amount":"8 oz"},{"item":"s. ground beef","amount":"1.5 lb"},{"item":"s Primal Kitchen Marinara sauce","amount":"3 cup"},{"item":"cottage cheese (low fat)","amount":"1/2 cup"},{"item":"reduced fat mozzarella cheese","amount":"4 oz"},{"item":"egg","amount":"1"},{"item":"olive oil","amount":"1 tbsp"},{"item":"Italian seasoning","amount":"1 tbsp"},{"item":"minced garlic, salt, and pepper","amount":"1 tsp"}]'::jsonb,
  directions = '["Cook pasta according to package directions.","While pasta is cooking, heat olive oil in a skillet.","Add garlic and sauté for 1 minute.","Add ground beef and seasonings to skillet and cook until done.","Pre-heat oven to 375 and spray a casserole dish with cooking spray.","In a large mixing bowl, add ground beef, pasta, 2 cups marinara, half of the mozzarella, cottage cheese, and egg.","Add ½ cup of marinara to the bottom of the casserole dish and spread with a spoon.","Then, add in the contents of the mixing bowl to dish.","Top dish with another ½ cup of marinara and remaining cheese.","Bake for 25 minutes."]'::jsonb
WHERE slug = 'healthier-baked-ziti';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"banana","amount":"1"},{"item":"spinach","amount":"1 cup"},{"item":"non-fat Greek yogurt","amount":"½ cup"},{"item":"protein powder","amount":"1 scoop"},{"item":"unsweetened almond milk","amount":"½ cup"},{"item":"T honey or maple syrup (optional, for added sweetness)","amount":"1"},{"item":"Ice cubes","amount":"1"},{"item":"Toppings: coconut flakes, sliced kiwi, muesli (optional)","amount":"1"}]'::jsonb,
  directions = '["Blend together banana, spinach, Greek yogurt, protein powder, almond milk, and optional sweetener.","Adjust consistency with more almond milk or ice if needed.","Pour into glass or bowl.","Top with coconut flakes, sliced kiwi, and muesli.","Enjoy your green smoothie!"]'::jsonb
WHERE slug = 'green-protein-smoothie';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"frozen banana","amount":"1/3"},{"item":"unsweetened oat milk","amount":"1 cup"},{"item":"frozen riced cauliflower","amount":"1/3 cup"},{"item":"pumpkin pure","amount":"¼ cup"},{"item":"serving vanilla protein powder","amount":"1"},{"item":"dates (soaked in hot water for 15 minutes)","amount":"2"},{"item":"pumpkin spice","amount":"1 tsp"},{"item":"date syrup (for glass)","amount":"1 TBSP"}]'::jsonb,
  directions = '["Blend ingredients until smooth.","Spread date syrup on inside of glass.","Pour into glass and enjoy."]'::jsonb
WHERE slug = 'pumpkin-smoothie';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"oats","amount":"1 cup"},{"item":"coconut flakes","amount":"1/3 cup"},{"item":"ground flaxseed","amount":"1/2 cup"},{"item":"chocolate chips","amount":"1/2 cup"},{"item":"protein powder","amount":"2 scoop"},{"item":"peanut butter","amount":"1/2 cup"},{"item":"honey","amount":"1/3 cup"},{"item":"teaspoon vanilla extractOther fun add ins: chia seeds, dried cherries, m&ms, cinnamon, pumpkin, sunflower seeds, raisins, cocoa powder","amount":"1"}]'::jsonb,
  directions = '[]'::jsonb
WHERE slug = 'protein-bites';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"sweet potatoes","amount":"2 large"},{"item":"95% lean ground beef","amount":"1 lb"},{"item":"pack of taco seasoning","amount":"1"},{"item":"low fat cheese (dairy free or regular)","amount":"2 oz"},{"item":"c chopped peppers","amount":"1"},{"item":"chopped white onion + 1 TBSP olive oil to cook (optional)Toppings","amount":"½"},{"item":"avocado (diced)","amount":"1"},{"item":"c shredded lettuce Instructions: 1. Slice sweet potatoes into thin rounds and place evenly on baking sheet. 2. Cook sweet potatoes for 25-30 minutes (or until browned) at 400 degrees F.3. While sweet potatoes are in oven, (add olive oil and onion to skillet), then add ground beef into onions to cook. Season with taco seasoning of choice4. Take sweet potato out of oven.5. Spread ground beef, cheese, and peppers evenly over sweet potato thins.6. Cook in oven for 5 additional minutes to melt cheese.7. Take out of oven and add into serving dishes.8. Top with diced avocado and lettuce.For individuals with IBS, omit onions and choose a taco seasoning without onion or garlic powder. Low amounts of red, yellow, and orange bell peppers are generally low FODMAP. Choose green bell peppers in larger amounts for a low FODMAP choice as well.","amount":"½"}]'::jsonb,
  directions = '[]'::jsonb
WHERE slug = 'sweet-potato-nachos';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"banana","amount":"½"},{"item":"frozen mixed berries","amount":"½"},{"item":"spinach","amount":"½ cup"},{"item":"non-fat Greek yogurt","amount":"½ cup"},{"item":"protein powder","amount":"1 scoop"},{"item":"unsweetened almond milk","amount":"½ cup"},{"item":"T honey or maple syrup (optional, for added sweetness)","amount":"1"}]'::jsonb,
  directions = '["Blend together banana, berries, spinach, Greek yogurt, protein powder, almond milk, and optional sweetener.","Adjust consistency with more almond milk or add ice if needed.","Pour into glass and enjoy!"]'::jsonb
WHERE slug = 'berryblastsmoothie';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"banana","amount":"1"},{"item":"natural peanut butter","amount":"2 Tbsp"},{"item":"non-fat Greek yogurt","amount":"½ cup"},{"item":"protein powder (Kion protein)","amount":"1 scoop"},{"item":"unsweetened almond milk","amount":"½ cup"},{"item":"t Cinnamon (optional)","amount":"1"},{"item":"honey or maple syrup (optional, for added sweetness) (not included in Cronometer calculation)","amount":"1 tsp"},{"item":"For additional calories: add ¼ cup to ½ cup oats (not included in Cronometer calculation)","amount":"1"}]'::jsonb,
  directions = '["Blend together banana, peanut butter, Greek yogurt, protein powder, almond milk, and optional ingredients.","Adjust consistency with more almond milk or add ice if needed.","Pour into glass and enjoy!"]'::jsonb
WHERE slug = 'peanutbutterbanana';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"frozen mango","amount":"½ cup"},{"item":"frozen pineapple","amount":"½ cup"},{"item":"banana","amount":"½"},{"item":"non-fat Greek yogurt","amount":"½ cup"},{"item":"protein powder (Kion protein)","amount":"1 scoop"},{"item":"unsweetened coconut milk","amount":"½ cup"},{"item":"honey or maple syrup (optional, for added sweetness) (not included in Cronometer calculation)","amount":"1 tsp"}]'::jsonb,
  directions = '["Blend together mango, pineapple, banana, Greek yogurt, protein powder, coconut milk, and optional sweetener.","Adjust consistency with more almond milk or add ice if needed.","Pour into glass and enjoy!"]'::jsonb
WHERE slug = 'tropicalparadise';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"banana","amount":"1"},{"item":"unsweetened cocoa powder","amount":"1 Tbsp"},{"item":"non-fat Greek yogurt","amount":"½ cup"},{"item":"protein powder (Kion protein)","amount":"1 scoop"},{"item":"unsweetened almond milk","amount":"½ cup"},{"item":"honey or maple syrup (optional, for added sweetness) (not included in Cronometer calculation)","amount":"1 tsp"}]'::jsonb,
  directions = '["Blend together banana, cocoa powder, Greek yogurt, protein powder, almond milk, and optional sweetener.","Adjust consistency with more almond milk or add ice if needed.","Pour into glass and enjoy!"]'::jsonb
WHERE slug = 'chocolatebanana';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"Greek yogurt","amount":"1 cup"},{"item":"Zest and juice of 1 lemon","amount":"1"},{"item":"salt","amount":"1 tsp"},{"item":"minced garlic","amount":"1 Tbsp"},{"item":"Optional: 1 Tbsp dill","amount":"1"},{"item":"boneless skinless chicken breast","amount":"2 lb"}]'::jsonb,
  directions = '["Place chicken breasts in the bottom of the crockpot.","Mix the Greek yogurt, lemon zest and juice, salt, garlic, and dill in a bowl.","Pour half of the marinade over the chicken.","Cook on high for 4 hours or low for 6-8 hours.","Once done, remove chicken and shred with forks.","Drain off all but about 1/2 cup of remaining juices and add your chicken back to the pot.","Mix in the remaining marinade and you’ve got yourself a delicious protein packed dish for dinner.","Serve with rice, pita bread, sliced cucumber, chopped tomato, sliced red onions, and/or fresh parsley."]'::jsonb
WHERE slug = 'greek-crockpot-chicken';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"cottage cheese","amount":"16oz"},{"item":"plain fat-free Greek yogurt","amount":"5.3oz"},{"item":"frozen spinach (thawed & drained well)","amount":"5oz"},{"item":"can artichokes (drained & chopped)","amount":"6oz"},{"item":"-¾ cup mozzarella cheese","amount":"½"},{"item":"parmesan cheese","amount":"¼ cup"},{"item":"onion powder","amount":"1 tsp"},{"item":"garlic powder","amount":"1 tsp"},{"item":"pepper","amount":"½ tsp"}]'::jsonb,
  directions = '["Preheat oven to 400°F.","Thaw and drain spinach & artichokes thoroughly (squeeze out excess liquid).","Mix all ingredients together in a bowl.","Pour into an 8x8 glass dish (or medium oval pan) and top with extra cheese if desired.","Bake for 25 minutes, then broil for 1-2 minutes to get that perfect golden top.","Serve with chips or veggies of your choice!"]'::jsonb
WHERE slug = 'high-protein-spinach-artichoke-dip';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"c pumpkin puree","amount":"1/3"},{"item":"c peanut butter or nut butter","amount":"1/4"},{"item":"vanilla","amount":"1 tsp"},{"item":"maple syrup (or honey)","amount":"1 TBSP"},{"item":"serving of vanilla or unflavored protein powder","amount":"1"},{"item":"c oat flour","amount":"1/3"},{"item":"pumpkin spice","amount":"2 tsp"},{"item":"oat milk (add additional if needed)","amount":"1 TBSP"},{"item":"large dark chocolate chips (for pumpkin stem)","amount":"1"}]'::jsonb,
  directions = '[]'::jsonb
WHERE slug = 'pumpkin-patch-protein-balls';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"s boneless skinless chicken breast","amount":"1.5 lb"},{"item":"non-fat plain Greek yogurt","amount":"½ cup"},{"item":"light mayo","amount":"½ cup"},{"item":"celery, chopped","amount":"1 cup"},{"item":"grapes, halved","amount":"1 cup"},{"item":"slivered almonds","amount":"¼ cup"}]'::jsonb,
  directions = '["Cook chicken breast.If using Instant pot: Place chicken breast in pot, add 1 cup of water, and any desired seasoning (salt, pepper, garlic powder, onion powder). Set Instant pot to pressure cook high for 10 minutes, release steam after 2-5 minutes.","Shred chicken. Place cooked chicken breasts in a mixer and using the paddle attachment mix until shredded to desired consistency. Or shred manually with two forks.","Mix the Greek yogurt and mayo","Add in mix-ins: celery, grapes, almonds and mix.","Chill and Enjoy!"]'::jsonb
WHERE slug = 'healthy-chicken-salad';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"non-fat Plain Greek Yogurt","amount":"½ cup"},{"item":"strawberries, sliced","amount":"¼ cup"},{"item":"granola","amount":"1.5 Tbsp"}]'::jsonb,
  directions = '["Spread Greek yogurt on parchment paper","Add sliced strawberries","Add granola","Freeze until yogurt is firm","Remove from freezer, and break into pieces","Enjoy!"]'::jsonb
WHERE slug = 'frozen-greek-yogurt-bark';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"oats","amount":"½ cup"},{"item":"strawberry protein powder","amount":"1 scoop"},{"item":"unsweetened almond milk (can sub cow’s milk or other plant-based milk)","amount":"¾ cup"},{"item":"strawberries","amount":"½ cup"}]'::jsonb,
  directions = '["In a mason jar, add oats, scoop of protein, and unsweetened almond milk.","Tighten the lid and shake until the protein powder, oats, and milk combine.","Open jar and top with strawberries.","Place your jar in the refrigerator for at least 2 hours or overnight.","Stir before eating and enjoy!"]'::jsonb
WHERE slug = 'strawberry-overnight-oats';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"pasta shells","amount":"300g"},{"item":"chicken breast","amount":"12oz"},{"item":"arugula","amount":"1 cup"},{"item":"cherry tomatoes halved","amount":"14"}]'::jsonb,
  directions = '["Preheat oven to 400°F.","Season chicken as desire (salt, pepper, onion powder, garlic powder, paprika)","Bake for 20-25 minutes until cooked completely. Let cool, then cut into bite size pieces.","Boil water and cook pasta according to packaging.","Blend cottage cheese, chipotle peppers, evaporated milk, parmigiano reggiano, salt and pepper until creamy.","In a sauce pan, add the arugula, cherry tomatoes, drained cooked pasta, chicken, and sauce.","Mix until fully coated.","Portion out and enjoy!"]'::jsonb
WHERE slug = 'chipotle-chicken-pasta';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"pack (1lb) Aidell’s chicken apple sausage (or your favorite sausage), cut into 1-inch rounds","amount":"1"},{"item":"Brussels sprouts, trimmed and halved","amount":"1 lb"},{"item":"sweet potatoes, cubed","amount":"2"},{"item":"honey crisp apple, diced","amount":"1"}]'::jsonb,
  directions = '[]'::jsonb
WHERE slug = 'roasted-sausage-veggie-medley';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"ground chicken","amount":"1 lb"},{"item":"chopped parsley","amount":"2 TBSP"},{"item":"chopped green onion (green portion only)","amount":"2 TBSP"},{"item":"salt","amount":"1 tsp"},{"item":"pepper","amount":"1/2 tsp"},{"item":"c finely diced celery","amount":"1/4"},{"item":"finely crumbled bread or 1/3 c bread crumbs (can opt for gluten free)","amount":"1 slice"},{"item":"c buffalo sauce","amount":"1/4"},{"item":"chopped green onion (for garnish)","amount":"1"}]'::jsonb,
  directions = '["Add ingredients to food processor.","Process on low speed until ingredients are well mixed.","Roll mixture into twelve balls and place on parchment lined pan.","Bake at 400 degrees F for 15-20 minutes.","Flip meatballs halfway through cooking time.","Top with additional buffalo sauce and green onion."]'::jsonb
WHERE slug = 'buffalo-chicken-meatballs';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"tortilla (can opt for gluten free if needed)","amount":"1"},{"item":"eggs and 1/4 c egg white","amount":"2"},{"item":"Cheese (can opt for dairy free if needed)","amount":"1"},{"item":"breakfast maple chicken sausage links","amount":"2"},{"item":"green onions (garnish)","amount":"1"}]'::jsonb,
  directions = '["Whisk two eggs and 1/4 c egg white in bowl.","Pour whisked eggs into nonstick fry pan on low to medium heat.","Cook eggs frittata style.","While eggs are cooking heat tortilla on separate pan.","Sprinkle cheese across tortilla.","Add frittata on top of cheesy tortilla.","Add an additional layer of cheese on top of frittata.","Place halved sausages on top of egg on one half of tortilla.","Fold tortilla in half to make into quesadilla.","Heat both halves of the quesadilla until light brown. Cut in half and serve."]'::jsonb
WHERE slug = 'breakfast-quesadilla';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"tofu","amount":"5 oz"},{"item":"c unsweetened almond milk","amount":"1/4"},{"item":"Cacao","amount":"1 TBSP"},{"item":"PB powder","amount":"1 TBSP"},{"item":"serving vanilla protein of choice","amount":"1/2"},{"item":"maple syrup or date syrup","amount":"1 tsp"},{"item":"dark chocolate shavings (for topping)","amount":"1"}]'::jsonb,
  directions = '["Add ingredients to a food processor.","Blend until smooth.","Serve in a small dish and top with your favorite topping!"]'::jsonb
WHERE slug = 'high-protein-chocolate-pudding';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"Pitted dates","amount":"9"},{"item":"reen apple (diced)","amount":"1 G"},{"item":"Dark chocolate (melted)","amount":"1 oz"},{"item":"Almond butter","amount":"2 Tbsp"},{"item":"Himalayan sea salt","amount":"1 tsp"}]'::jsonb,
  directions = '["Dice apple into small pieces.","Pit dates (if not already pitted)","Fill each date with one apple piece.","Drizzle with melted dark chocolate & almond butter.","Sprinkle with sea salt.","Place in freezer for 15 minutes.","Refrigerate and enjoy!"]'::jsonb
WHERE slug = 'caramel-apple-bites';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"dark chocolate","amount":"1 cup"},{"item":"coconut oil","amount":"1 tsp"}]'::jsonb,
  directions = '["Pour dark chocolate and coconut oil in a microwave safe bowl.","Microwave in 15-30 second increments, stirring between each, until chocolate is fully melted.","Fill mold approximately 1/3 of volume with dark chocolate.","Freeze 10-15 minutes or until chocolate layer is completely hardened.","While chocolate is in freezer, mix PB, oat flour, vanilla, and maple syrup in a separate bowl until a thick dough like consistency.","Take mold out of freezer, add a small portion of filling into each mold, pressing filling into the mold with your finger so that it is flat on top of the chocolate layer.","Cover PB layer with melted chocolate in each mold.","Freeze for 10-15 minutes or until chocolate is completely hardened.","One by one, carefully pop each PB “cup” out of the mold and enjoy!"]'::jsonb
WHERE slug = 'homemade-peanut-butter-cups';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"organic pumpkin purée","amount":"1 cup"},{"item":"maple syrup","amount":"1/3 cup"},{"item":"coconut oil","amount":"1/4 cup"},{"item":"vanilla extract","amount":"1 tsp"},{"item":"eggs","amount":"3"},{"item":"creamy almond butter (or cashew butter for sweeter taste)","amount":"1/3 cup"}]'::jsonb,
  directions = '["Mix wet ingredients.","Mix dry ingredients in separate bowl.","Add dry ingredients into wet ingredients.","Mix thoroughly.","Pour mixture into parchment lined loaf pan.","Sprinkle (or mix in) chocolate chips.","Bake for 35-45 minutes on 350 or until fully cooked."]'::jsonb
WHERE slug = 'chocolate-chip-pumpkin-bread';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"single serving of nonfat vanilla Greek yogurt yogurt","amount":"1"},{"item":"pumpkin","amount":"3 TBSP"},{"item":"pumpkin spice","amount":"1 tsp"},{"item":"granola","amount":"1/3 cup"},{"item":"hemp seeds (for toppings)","amount":"1 TBSP"},{"item":"almond butter (for toppings)","amount":"1/2 TBSP"}]'::jsonb,
  directions = '["Mix the Greek yogurt, pumpkin puree, and pumpkin pie spice in bowl.","Place granola at bottom of serving dish.","Scoop yogurt mixture over granola.","Top with toppings of choice."]'::jsonb
WHERE slug = 'pumpkin-spice-yogurt-parfait';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"ground chicken (or turkey)","amount":"1 lb"},{"item":"egg","amount":"1"},{"item":"cayenne","amount":"1 tsp"},{"item":"c coconut amino (or soy sauce)","amount":"1/4"},{"item":"salt and pepper","amount":"1"},{"item":"stalks green onion chopped","amount":"2"},{"item":"Rice paper wrappers cut in half","amount":"12"}]'::jsonb,
  directions = '["Mix following ingredients in one bowl","Cut rice wrappers into small squares, soak for 15 sec in cold water, and fill each rice wrappers with a spoonful of ground turkey mixture.","Double wrap each dumpling with a second square of rice paper.","Air fry on 390 F for 8 minutes or until fully cooked.","Dunk in your favorite sauce and enjoy!"]'::jsonb
WHERE slug = '8-minute-air-fryer-dumplings';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"-40g hot water","amount":"35"},{"item":"overflowing tsp of matcha","amount":"2"},{"item":"-2 tsp maple butter","amount":"1"},{"item":"salt","amount":"1 tsp"},{"item":"c soy milk","amount":"1/4"},{"item":"c almond or oat milk","amount":"1/4"}]'::jsonb,
  directions = '["Froth or whisk matcha and water.","Add maple butter and salt and continue to whisk/froth.","Pour matcha mixture over ice & 1/4c milk","Use remaining milk to collect remaining matcha mixture from mug and pour over ice.5. Stir & Enjoy"]'::jsonb
WHERE slug = 'salted-maple-butter-matcha';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"Tricolored Quinoa","amount":"1 cup"},{"item":"s Bone broth","amount":"2 cup"},{"item":"Chicken sausage links","amount":"4"},{"item":"Broccoli, chopped","amount":"1 cup"},{"item":"Sweet potato","amount":"1 large"},{"item":"reen onion stalks, chopped","amount":"2 G"},{"item":"Almonds","amount":"1/2 oz"},{"item":"Olive oil","amount":"1 TBSP"},{"item":"Salt & pepper to taste","amount":"1"}]'::jsonb,
  directions = '["Cook quinoa according to package instructions. Use bone broth in place of water.","Cut sweet potatoes into cubes and microwave on high for 4 minutes to soften.","Slice chicken sausages into rounds and place on sheet pan with sweet potatoes and broccoli. Toss in oil, salt, and pepper.","Bake chicken sausage, sweet potato, and broccoli at 400 degrees for 20-25 minutes.","While ingredients are cooking, chop green onion into small rounds and crush a handful of almonds.","When finished cooking, scoop quinoa into dish.","Serve chicken sausage, sweet potatoes, and broccoli over quinoa.","Top with chopped green onion and sliced almonds"]'::jsonb
WHERE slug = 'harvest-grain-bowl';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"container nonfat vanilla Greek yogurt (~4-5oz) (can opt for dairy free yogurt)","amount":"1"},{"item":"c PB Fit powder","amount":"1/4"},{"item":"-1/2 c oat flour (add additional depending on consistency)","amount":"1/4"},{"item":"-2 servings of protein powder or collagen (add additional depending on consistency)","amount":"1"},{"item":"dairy free chocolate chips","amount":"2 TBSP"}]'::jsonb,
  directions = '["Mix ingredients together until desired consistency, adding extra flour or protein powder as needed.","Store in fridge and enjoy throughout the week."]'::jsonb
WHERE slug = 'high-protein-peanut-butter-cookie-dough';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"low sodium soy sauce (gf or regular)","amount":"1/4 cup"},{"item":"coconut aminos","amount":"3 tbsp"},{"item":"Dijon mustard","amount":"3 tbsp"},{"item":"maple syrup","amount":"1 tbsp"}]'::jsonb,
  directions = '["Mix ingredients to make sauce","Pour sauce over chicken in air tight container.","Marinate chicken in fridge for 2-4 hours or overnight","Add potatoes and green beans to pan and cover with olive oil, salt, and pepper.","Add marinated chicken to pan.","Bake for 30 mins at 400 degrees Fahrenheit or until chicken reaches internal temperature of 165 degrees Fahrenheit.","Separate into 4-5 servings and store in fridge."]'::jsonb
WHERE slug = 'maple-dijon-chicken';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"Tilapia (6oz per serving)","amount":"24oz"},{"item":"bag tri-color cole slaw","amount":"1"},{"item":"tortillas","amount":"12 small"},{"item":"Optional: squeeze of lime","amount":"1"}]'::jsonb,
  directions = '["Pan fry tilapia in cooking oil of choice. Chop/separate fish into small pieces as it cooks. Add fish taco seasoning packet or seasoning of choice.","In separate pan, brown cole slaw in cooking oil for 5-10 minutes or until lightly browned.","Heat mini tortillas on additional pan until warm.","Stuff tortillas with fish and cole slaw. Top with lime juice if desired!"]'::jsonb
WHERE slug = '3-ingredient-fish-tacos';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"Corn tortillas","amount":"12"},{"item":"Ground turkey or beef","amount":"1lb"},{"item":"Shredded cheese (Opt for dairy free if desire)","amount":"6 oz"},{"item":"Optional: Green onion topping","amount":"1"}]'::jsonb,
  directions = '["Cook ground meat on skillet (season with taco seasoning as desired).","Place corn tortillas on non stick sheet pan.","Fill with meat and cheese.","Fold tortillas into tacos.","Place weighted object on tortillas to hold in place (e.g. metal spoon)","Bake for 20 minutes at 400 degrees.","Optional, top with green onion."]'::jsonb
WHERE slug = '3-ingredient-baked-tacos';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"bell peppers (any color)","amount":"4 large"},{"item":"cooked rice (white, brown, or your choice)","amount":"1 cup"},{"item":"ground beef","amount":"1 lb"},{"item":"onion, diced","amount":"1 medium"},{"item":"bell pepper (any color), diced","amount":"1 small"},{"item":"s garlic, minced","amount":"2 clove"},{"item":"smoked paprika","amount":"1 tsp"},{"item":"dried oregano","amount":"1 tsp"},{"item":"chili powder (optional, for a kick)","amount":"1/2 tsp"},{"item":"Salt and pepper to taste","amount":"1"},{"item":"shredded cheese (cheddar, mozzarella, or your choice)","amount":"1 cup"},{"item":"(14 oz) diced tomatoes (drained)","amount":"1 can"},{"item":"olive oil","amount":"2 tbsp"}]'::jsonb,
  directions = '["Preheat your oven to 375°F (190°C).","Cut the tops off the large bell peppers and remove seeds and membranes. Lightly brush the insides with olive oil and set them in a baking dish.","Heat 1 tbsp olive oil in a large skillet over medium heat.","Add the ground beef, breaking it up with a spoon, and cook until browned (about 5 minutes).","Add the onion, diced bell pepper, and garlic, cooking until softened (about 3–4 minutes).","Stir in the smoked paprika, oregano, chili powder (if using), salt, and pepper.","Stir in the cooked rice and drained diced tomatoes. Mix well and cook for 2–3 minutes to let the flavors meld. Taste and adjust seasonings if necessary.","Spoon the beef and rice mixture into each bell pepper, packing it firmly but not overfilling.","Top each stuffed pepper with a generous sprinkle of shredded cheese.","Cover the baking dish with foil and bake for 25 minutes.","Remove the foil and bake for an additional 10 minutes, or until the peppers are tender and the cheese is bubbly and golden.","Let the stuffed peppers cool slightly before serving."]'::jsonb
WHERE slug = 'jack-o-lantern-stuffed-peppers';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"s shaved steak","amount":"1.5 pound"},{"item":"s brown rice uncooked","amount":"1 cup"},{"item":"egg plant, diced or cut as desired","amount":"1 small"},{"item":"onion, sliced","amount":"1"},{"item":"heads of broccoli","amount":"2"},{"item":"Olive oil","amount":"1 TBSP"},{"item":"garlic powder","amount":"2 tsp"},{"item":"salt and pepper to taste","amount":"1"},{"item":"green onions, chopped (optional topping)","amount":"1 bunch"},{"item":"avocado, sliced (optional topping)","amount":"1"}]'::jsonb,
  directions = '["Preheat the oven to 375 degrees.","Cook brown rice as directed on packaging.","Cut eggplant and broccoli as desired and spread on the roasting sheet. Add olive oil, salt, pepper, and garlic power over veggies and toss to combine.","Roast veggies for 30 minutes.","In a small bowl combine coconut aminos, honey, olive oil,","Cut steak to desired sized pieces and place in marinade.","On medium heat, place steak in a pan and cook until done.","Remove steak from pan and add onions to the same heated pan.","Cook onions until soft and caramelized.","Optional: Top bowl with green onions and avocado","For a delicious Korean BBQ bowl place rice on bottom and layer serving of eggplant, broccoli, and onions. Add shredded steak and top with green onions and avocado."]'::jsonb
WHERE slug = 'korean-bbq-rice-bowl';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"ground turkey","amount":"1lb"},{"item":"raw cole slaw","amount":"1 packet"},{"item":"coconut amino (sub soy sauce & maple syrup)","amount":"2 TBSP"},{"item":"olive oil","amount":"1 TBSP"}]'::jsonb,
  directions = '["Oil pan.","Cook ground turkey in pan on medium heat.","Add 1 pack of cole slaw to pan and cover.","Cook on medium heat until slaw is lightly browned.","Add coconut amino sauce as desired."]'::jsonb
WHERE slug = 'egg-roll-in-a-bowl';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"tortilla (can opt for gluten free)","amount":"1"},{"item":"avocado","amount":"1/2"},{"item":"cucumber","amount":"1/4"},{"item":"chicken","amount":"4 oz"},{"item":"spinach","amount":"1/2 cup"},{"item":"oregano to taste","amount":"1"},{"item":"salt to taste","amount":"1"}]'::jsonb,
  directions = '["Pre-cook chicken","Smash avocado on a tortilla","Sprinkle salt and oregano on smashed avocado","Add 4 ounces to chicken on top of avocado","Add chopped cucumbers and spinach to wrap","Roll tortilla with ingredients inside until a tight wrap","Brown on stovetop for 1 minute on each side"]'::jsonb
WHERE slug = 'green-goddess-chicken-wrap';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"frozen banana","amount":"1 small"},{"item":"dates","amount":"2"},{"item":"ice cubes","amount":"1 scoop of"},{"item":"unsweetened almond milk","amount":"1 cup"},{"item":"double espresso shot","amount":"1"},{"item":"date syrup (mixed into espresso shot)","amount":"1 TBSP"},{"item":"spoonfuls of coconut yogurt","amount":"2"},{"item":"serving collagen powder","amount":"1"},{"item":"Cinnamon","amount":"1"},{"item":"vanilla","amount":"1 tsp"},{"item":"Optional: 1 TBSP white miso paste","amount":"1"}]'::jsonb,
  directions = '[]'::jsonb
WHERE slug = 'coffee-date-smoothie';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"olive oil for cooking","amount":"1"},{"item":"chicken breasts (seasoned with S&P)","amount":"12oz"},{"item":"egg","amount":"1"},{"item":"s mixed veggies (I used water chestnuts, bell peppers, and broccoli)","amount":"2 cup"},{"item":"edamame","amount":"1 cup"},{"item":"pad Thai noodles","amount":"4 oz"},{"item":"avocado (optional topping)","amount":"1"}]'::jsonb,
  directions = '["Cook chopped chicken in olive oil on low to medium heat in a large pan or wok.","Add egg once chicken is cooked partially through.","Add mixed veggies and put lid on pan.","While vegetables are cooking, add pad Thai noodles to a separate pot of boiling water. Follow instructions on noodle package.","When noodles are fully cooked, add to pan and combine.","Pour sauce over mixture and toss ingredients to mix.","Serve and enjoy!"]'::jsonb
WHERE slug = 'chicken-pad-thai';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"tofu","amount":"4oz"},{"item":"dairy free shredded cheese (or sub regular cheese)","amount":"1oz"},{"item":"tortilla (gluten free or regular)","amount":"1"},{"item":"salt to taste","amount":"1"},{"item":"pepper to taste","amount":"1"},{"item":"cumin to taste","amount":"1"},{"item":"paprika to taste","amount":"1"},{"item":"oregano to taste","amount":"1"},{"item":"Olive oil","amount":"1"}]'::jsonb,
  directions = '["Crumble tofu into small pieces","Season tofu with salt, pepper, cumin, paprika, and oregano to taste.","Oil pan and cook tofu on stovetop at medium heat or until lightly browned.","Heat tortilla","Add dairy free cheese and tofu to wrap and roll into burrito.","Brown burrito on stovetop until slightly crispy."]'::jsonb
WHERE slug = 'tofu-scramble-wrap';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"whole spaghetti squash","amount":"1"},{"item":"package chicken sausage","amount":"1"},{"item":"marinara sauce","amount":"1"},{"item":"parmesan cheese","amount":"1"}]'::jsonb,
  directions = '["Cut spaghetti squash in half and remove seeds.","Drizzle/spray inside of squash with your choice of oil. Sprinkle with salt and pepper.","Place both spaghetti squash halves face down on a sheet pan and bake for 40-45 minutes at 400 degrees.","Add sliced chicken sausages to oiled pan. Cook on stovetop at medium heat until browned. Add marinara sauce to pan and heat until warm then set to simmer.","Remove squash from oven and let cool.","Using a fork scrap inside of squash until noodle like pieces are formed.","Add sauce and sausage mixture to inside of squash halves.","Top with cheese and enjoy!"]'::jsonb
WHERE slug = 'baked-spaghetti-squash';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"bone broth","amount":"1 cup"},{"item":"unsweetened cocoa","amount":"2 TBSP"},{"item":"maple syrup (sub two packets stevia)","amount":"1 TBSP"},{"item":"soy milk (sub fat free milk)","amount":"1/2 cup"},{"item":"cinnamon","amount":"1/2 tsp"},{"item":"marshmallows (optional)","amount":"2 oz"},{"item":"peppermint stick (optional)","amount":"1"}]'::jsonb,
  directions = '["Heat bone broth, cocoa, maple syrup, soy milk, and cinnamon in a pot on low, stirring to mix ingredients and keep from burning.","Top with marshmallows and toss in a peppermint stick for a festive flavor!"]'::jsonb
WHERE slug = 'bone-broth-hot-chocolate';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"container vanilla yogurt (sub high protein dairy free yogurt)","amount":"1"},{"item":"chocolate protein powder (sub cocoa powder)","amount":"1 scoop"},{"item":"peppermint extractToppings","amount":"1/8 tsp"},{"item":"Gluten Free peppermint Joe Joes (Trader Joes)","amount":"1"},{"item":"Smashed peppermintInstructions:","amount":"1"}]'::jsonb,
  directions = '["Mix peppermint extract, yogurt, and chocolate protein powder in one bowl.","Top with smashed peppermint cookies and peppermint"]'::jsonb
WHERE slug = 'peppermint-chocolate-mousse-parfait';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"rosemary leaf","amount":"1"},{"item":"Approx. 1/2 c or 1 handful of whole cranberries","amount":"1"},{"item":"water","amount":"1"},{"item":"Probiotic soda or beverage of choice","amount":"1"}]'::jsonb,
  directions = '[]'::jsonb
WHERE slug = 'snow-globe-mocktail';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"oats","amount":"½ cup"},{"item":"soy milk (unsweetened)","amount":"1 cup"},{"item":"vanilla protein (Kion clean protein)","amount":"1 scoop"},{"item":"serving collagen (optional, included in Cronometer recipe)","amount":"1"},{"item":"vanilla extract","amount":"1/8 tsp"},{"item":"almond extract","amount":"1/8"},{"item":"salt","amount":"1 dash of"},{"item":"maple syrup","amount":"1 tsp"},{"item":"As many sprinkles as the hear desires (1 tsp added in Cronometer recipe)","amount":"1"}]'::jsonb,
  directions = '["Mix all ingredients in an air tight container.","Store in fridge overnight.","Remove from fridge, add sprinkles, and enjoy."]'::jsonb
WHERE slug = 'sugar-cookie-overnight-oats';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"Mint Double espresso (sub for regular espresso with 1/8 tsp peppermint extract)","amount":"1"},{"item":"Drink LMNT chocolate salt (sub for 1/4 tsp salt & chocolate protein powder)","amount":"1"},{"item":"c choice of milk (Cronomter recipe uses fairlife ultrafiltered skim milk)","amount":"1/2"}]'::jsonb,
  directions = '["Mix (peppermint) double espresso with chocolate salt.","Pour milk over ice.","Pour espresso over milk & ice.","Stir and enjoy."]'::jsonb
WHERE slug = 'salted-peppermint-mocha';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"Rice cake","amount":"1"},{"item":"Nut butter of choice","amount":"1 Tbsp"},{"item":"hemp seeds","amount":"2 tsp"},{"item":"dark chocolate","amount":"11g"},{"item":"crushed peppermint","amount":"1"}]'::jsonb,
  directions = '["Cover rice cake with nut butter.","Sprinkle hemp seeds over nut butter.","Dip in melted dark chocolate.","Sprinkle crushed peppermint on top of melted chocolate.","Freeze for 10 minutes."]'::jsonb
WHERE slug = 'candy-cane-crunch-cake';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"Double espresso of choice","amount":"1"},{"item":"c egg nog of choice (Almond Malk Holiday Nog used in Cronometer recipe)","amount":"1/2"},{"item":"As much nutmeg as the heart desires","amount":"1"}]'::jsonb,
  directions = '["Brew double espresso in mug.","While brewing espresso, froth 1/2 c egg nog.","Pour frothed nog over espresso.","Top with nutmeg.","Enjoy hot or over ice."]'::jsonb
WHERE slug = 'egg-nog-latte';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"c Chobani oat nog + 3 TBSP for mix in","amount":"1 1/2"},{"item":"serving collagen","amount":"1"},{"item":"vanilla protein","amount":"1 scoop"},{"item":"nutmeg","amount":"1/2 tsp"}]'::jsonb,
  directions = '["Add oat nog, collagen, vanilla protein, and nutmeg to Ninja Creami pitcher.","Froth or blend contents to mix.","Place lid on container and freeze for at least 24 hours.","Place container in Ninja Creami and run on “lite ice cream” selection.","Add 3 TBSP oat nog and press ‘’re-spin”","Remove from machine & enjoy!"]'::jsonb
WHERE slug = 'oat-nog-ninja-creami';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"orange","amount":"1"},{"item":"pack of cranberries","amount":"1"}]'::jsonb,
  directions = '["Slice orange into rounds.","Place one orange slice into each ice cube mold.","Add a handful of cranberries into each mold.","Pour water (Or beverage of choice) to fill mold.","Freeze for at least 24 hours."]'::jsonb
WHERE slug = 'spiced-orange-cran-mocktail';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"oats","amount":"½ cup"},{"item":"unsweetened almond milk","amount":"¾ cup"},{"item":"vanilla protein (Kion clean protein)","amount":"1 scoop"},{"item":"collagen (optional, included in Cronometer recipe)","amount":"1 TBSP"},{"item":"maple syrup","amount":"1 tsp"},{"item":"nutmeg","amount":"¼ tsp"},{"item":"cinnamon","amount":"½ tsp"},{"item":"dried cranberries","amount":"1 TBSP"},{"item":"chopped pecans","amount":"1 TBSP"}]'::jsonb,
  directions = '["Mix oats, protein powder, collagen, cinnamon, nutmeg maple syrup, and almond milk together.","Store in fridge overnight or for a few hours.","Remove from fridge, top with dried cranberries, chopped pecans, and enjoy!"]'::jsonb
WHERE slug = 'winter-spiced-overnight-oats';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"c kale","amount":"2"},{"item":"cooked chicken breast (4 oz)","amount":"1"},{"item":"cooked sweet potato (diced)","amount":"3 oz"},{"item":"cooked broccoli","amount":"3 oz"},{"item":"c pomegranate seeds","amount":"1/4"},{"item":"-2 TBSP crushed almonds","amount":"1"},{"item":"balsamic glaze","amount":"2 TBSP"}]'::jsonb,
  directions = '["Precook chicken, broccoli, and sweet potatoes in the oven.","Fill bowl with pre-washed chopped kale.","Add chicken breasts, roasted sweet potatoes, and broccoli.","Sprinkle with pomegranate seeds and almonds.","Finish it off with a few drizzles of balsamic glaze."]'::jsonb
WHERE slug = 'spiced-orange-cran-mocktail-xd56c';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"ground ginger","amount":"1/8 tsp"},{"item":"all spice","amount":"1/8 tsp"},{"item":"coconut sugar","amount":"1 tsp"},{"item":"Double espresso","amount":"1"},{"item":"Dairy free Ginger bread creamer (as much as the heart desires)","amount":"1"}]'::jsonb,
  directions = '["Brew double shot over ginger, all spice, and coconut sugar.","Shake mixture in mason jar.","Pour over ice.","Add Gingerbread creamer!"]'::jsonb
WHERE slug = 'gingerbread-shaken-espresso';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"single serve container of vanilla greek yogurt (dairy free optional)","amount":"1"},{"item":"caramel chocolate protein bar of choice (gluten & dairy free optional)","amount":"1"},{"item":"reen apple","amount":"1 g"},{"item":"date syrup","amount":"2 TBSP"}]'::jsonb,
  directions = '["Chop protein bar and apple into bite sized pieces.","Line cup or bowl with date syrup.","Layer apple, protein bar pieces, and yogurt into cup or bowl, adding in date syrup between layers as desired.","Top with date syrup, stir, & enjoy."]'::jsonb
WHERE slug = 'high-protein-snickers-salad';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"(115g) banana","amount":"1"},{"item":"egg white","amount":"110g"},{"item":"vanilla protein powder","amount":"1 scoop"},{"item":"oat flour","amount":"2 TBSP"},{"item":"all spice","amount":"1 tsp"},{"item":"nutmeg","amount":"1 tsp"},{"item":"ginger","amount":"1/2 tsp"},{"item":"baking powder","amount":"1/8 tsp"}]'::jsonb,
  directions = '["Blend ingredients in blender.","Heat non-stick pan on low.","Spoon batter onto pan, making pancakes of desired size.","Flip pancakes when batter starts to bubble.","Finish cooking to desired texture."]'::jsonb
WHERE slug = 'gingerbread-protein-pancakes';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"sweet potato","amount":"1 large"},{"item":"Avocado Spray cooking oil","amount":"1"},{"item":"Toppings of choice","amount":"1"}]'::jsonb,
  directions = '["Cut sweet potato into thin slices.","Spray slices with oil.","Cook at 400 degrees F for 15-20 minutes or until lightly browned.","Add toppings of choice."]'::jsonb
WHERE slug = 'sweet-potato-toast';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"banana frozen","amount":"1"},{"item":"c frozen cauliflower","amount":"1/3"},{"item":"soy milk","amount":"1 cup"},{"item":"collagen, unflavored","amount":"1 scoop"},{"item":"peppermint","amount":"1/8 tsp"},{"item":"Cocoa powder, unsweetened (sub chocolate protein)","amount":"2 TBSP"},{"item":"maple syrup","amount":"1 tsp"},{"item":"-5 small ice cubes (or 2 large)","amount":"4"}]'::jsonb,
  directions = '["Blend ingredients in blender.","Top with peppermint.","Pour into festive cup & enjoy.This recipe is gluten and dairy free. To make IBS friendly use a firm banana and remove frozen cauliflower!"]'::jsonb
WHERE slug = 'peppermint-mocha-smoothie';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"butternut squash","amount":"1"},{"item":"c nutritional yeast","amount":"1/2"},{"item":"c bone broth","amount":"1/4"},{"item":"stalks of green onion","amount":"6"},{"item":"pepper","amount":"1 tsp"},{"item":"salt","amount":"1 tsp"},{"item":"(for non-IBS individuals) 1 head of garlic","amount":"1"},{"item":"gluten free pasta","amount":"150g of"},{"item":". 97% lean ground beef","amount":"1 lb"}]'::jsonb,
  directions = '["Cut squash in half and roast squash for 45 minutes at 400 degrees F or until mushy. Let cool. (If you plan to add head of garlic, roast in oven with squash).","Scoop out inside contents of squash and add to blender cup.","Add nutrition yeast, broth, chopped green onion, and spices to blender.","Blend until smooth.","Pour over cooked beef and serve over pasta."]'::jsonb
WHERE slug = 'butternut-squash-mac';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"bag of fresh cranberries","amount":"1"},{"item":"sparkling lemon or lime beverage of choice","amount":"1"},{"item":"c coconut sugar","amount":"3/4"}]'::jsonb,
  directions = '["Soak cranberries in sparkling beverage for 24 hours.","Drain liquid from cranberries.","Add coconut sugar and shake in container until all berries are coated.","Place coated cranberries on sheet pan and bake for 8 minutes at 200 degrees F.","Remove from oven. Let cool for 5 minutes.","Place in freezer for 15 minutes.","Throw into a serving dish and enjoy!"]'::jsonb
WHERE slug = 'candied-cranberries';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"c oat milk (sub almond)","amount":"1/3"},{"item":"vanilla protein or collagen","amount":"1 scoop"},{"item":"c oats","amount":"1/2"},{"item":"egg","amount":"1"},{"item":"baking powder","amount":"1/2 tsp"},{"item":"vanilla","amount":"1/2 tsp"},{"item":"maple syrup","amount":"2 TBSP"},{"item":"ginger","amount":"1/2 tsp"},{"item":"all spice","amount":"1 tsp"},{"item":"nutmeg","amount":"1/2 tsp"},{"item":"salt","amount":"1/2 tsp"}]'::jsonb,
  directions = '["Preheat oven to 350 degrees F.","Blend all ingredients in blender.","Pour into oven safe dish.","Bake at 350 degrees F for 25-30 mins."]'::jsonb
WHERE slug = 'gingerbread-baked-oats';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"(approx 3 g) matcha powder mixed with 35g hot water","amount":"2 tsp"},{"item":"(approx 2/3 c)almond milk","amount":"140 mL"},{"item":"Almond extract","amount":"1/2 tsp"},{"item":"vanilla extract","amount":"1/2 tsp"},{"item":"Maple syrup","amount":"2 tsp"},{"item":"Sprinkles (optional for rim)","amount":"1"}]'::jsonb,
  directions = '["Heat 35g of water.","Combine with 3g (approx 2 tsp) of matcha.","Froth or whisk.","Add maple syrup, almond extract, and vanilla extract to mixture. Froth or whisk.","Scoop ice into sprinkle lined serving cup.","Pour milk of choice over ice.","Add in matcha mixture.","Stir and enjoy."]'::jsonb
WHERE slug = 'sugar-cookie-matcha-latte';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"bag of large carrots","amount":"1"},{"item":"Olive oil","amount":"3 TBSP"},{"item":"Maple syrup","amount":"3 TBSP"},{"item":"oregano","amount":"1 TBSP"},{"item":"Salt","amount":"2 tsp"},{"item":"cinnamon","amount":"1 tsp"},{"item":"thyme","amount":"1 tsp"},{"item":"ginger","amount":"1/2 tsp"}]'::jsonb,
  directions = '["Peel and slice carrots.","Coat in olive oil and maple syrup.","Toss in seasonings.","Spread seasoned carrots onto baking pan.","Roast for 30 mins at 400 Degrees F"]'::jsonb
WHERE slug = 'roasted-maple-carrots';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"serving collagen powder","amount":"2"},{"item":"serving vanilla protein powder","amount":"1"},{"item":"all spice","amount":"1/2 tsp"},{"item":"salt","amount":"1/2 tsp"},{"item":"c almond flour","amount":"1/4"},{"item":"vanilla extract","amount":"1 tsp"},{"item":"almond extract","amount":"1 tsp"},{"item":"c almond butter","amount":"1/4"},{"item":"maple syrup","amount":"1 TBSP"},{"item":"soy milk","amount":"2 TBSP"},{"item":"Topping: Sprinkles","amount":"1"}]'::jsonb,
  directions = '["Mix all ingredients in bowl until thick (cookie dough-like) consistency.","Roll into balls.","Dip dough balls into sprinkle and cover completely.","Store in fridge and enjoy!"]'::jsonb
WHERE slug = 'sugar-cookie-protein-balls';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"s bread (Dave''s Killer Powerseed used in Cronometer; opt for Gluten free bread if needed)","amount":"3 slice"},{"item":"oat nog","amount":"1/2cup"},{"item":"egg whites","amount":"1/3 cup"},{"item":"serving collagen","amount":"1"},{"item":"nutmeg","amount":"1 tsp"},{"item":"Stevia packet","amount":"1"},{"item":"Cinnamon","amount":"1/2 tsp"}]'::jsonb,
  directions = '["Slice bread into cubes.","Mix egg whites, oat nog, spices, collagen, and stevia in a bowl.","Place cubed bread into oven safe dish.","Pour liquid mixture over bread.","Bake at 400 degrees F for approximately 20 minutes or until lightly browned.","Top with nutmeg and syrup!"]'::jsonb
WHERE slug = 'egg-nog-french-toast';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"Coconut Whipped Topping","amount":"1/2 cup"},{"item":"serving plant based vanilla protein powder","amount":"1"},{"item":"almond extract","amount":"1 tsp"},{"item":"Topping: as many sprinkles as the heart desires","amount":"1"}]'::jsonb,
  directions = '["Mix coco whip, protein powder, and almond extract in bowl.","Top with sprinkles.","Dip your favorite cookie or dessert or eat it by the spoonful."]'::jsonb
WHERE slug = 'sugar-cookie-whip-dip';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"Strawberries","amount":"1"},{"item":"Oreo sandwich cookies or Trader Joe Joe’s if Gluten Free","amount":"1"},{"item":"White chocolate","amount":"1"},{"item":"Powdered sugar","amount":"1"}]'::jsonb,
  directions = '["Melt white chocolate in microwave. Heat in 30 second increments, stirring between each round until fully melted.","Dip sandwich cookies in melted white chocolate. Make sure to cover both sides of cookies.","Place a single strawberry immediately on top of dipped cookie.","Scrap filling from one sandwich cookie and roll into balls for Santa hat topper. Top strawberry with ball of cream filling.","Let cool in freezer for 10-15 minutes.","Sprinkle with powder sugar and enjoy."]'::jsonb
WHERE slug = 'strawberry-santa-hats';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"banana (115g)","amount":"1"},{"item":"TSBP Oats","amount":"3"},{"item":"egg whites","amount":"110 g"},{"item":"chocolate protein powder","amount":"1 scoop"},{"item":"baking soda","amount":"1/4 tsp"},{"item":"salt","amount":"1/4 tsp"}]'::jsonb,
  directions = '["Blend ingredients in blender.","Heat non-stick pan on low.","Spoon batter onto pan, making pancakes of desired size.","Flip pancakes when batter starts to bubble.","Finish cooking to desired texture."]'::jsonb
WHERE slug = 'single-serve-hot-cocoa-protein-pancakes';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"yellow onion, chopped","amount":"1"},{"item":"s garlic, finely chopped","amount":"3 clove"},{"item":"tomato paste","amount":"2 Tbsp"},{"item":"s lean ground beef","amount":"2 lb"},{"item":"s beef bone broth","amount":"2 cup"},{"item":"(15-oz.) can black beans, rinsed, drained","amount":"1"},{"item":"(15-oz.) can fire-roasted diced tomatoes","amount":"1"},{"item":"(15-oz.) can kidney beans, rinsed, drained","amount":"1"},{"item":"(15-oz.) can black eyed peas, rinsed, drained","amount":"1"},{"item":"chili powder","amount":"1.5 Tbsp"},{"item":". dried oregano","amount":"1 tsp"},{"item":". ground cumin","amount":"1 tsp"},{"item":". cayenne","amount":"1/2 tsp"},{"item":"Kosher salt","amount":"1"},{"item":"Freshly ground black pepper","amount":"1"}]'::jsonb,
  directions = '["Sauté: Set Instant Pot to Sauté and cook onion, garlic, and ground beef until browned (5-7 minutes). If using ground beef with higher fat content, you may want to drain the fat. With ~93% lean beef, draining isn''t necessary.","Add Ingredients: Return the ground beef mixture to the pot. Add black beans, tomatoes, kidney beans, black-eyed peas, bone broth, spices, salt, and pepper. Lock the lid and Pressure Cook on High for 14 minutes.","Release Pressure: Perform a quick pressure release, then open the lid once fully released.","Serve: Divide chili into bowls and top with your favorite toppings.For Slow Cooker: Cook beef in a skillet, then transfer it along with all other ingredients to a slow cooker. Cook on Low for ~6 hours or High for ~3 hours."]'::jsonb
WHERE slug = 'instant-pot-chili';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"tortillas (whole wheat or low-carb options for extra fiber)","amount":"6 large"},{"item":"eggs","amount":"6 large"},{"item":"egg whites","amount":"1 cup"},{"item":"shredded cheese (cheddar, Monterey Jack, Mozzarella, or your favorite variety)","amount":"1 cup"},{"item":"ground turkey sausage","amount":"1 lb"},{"item":"salt","amount":"1/2 tsp"},{"item":"black pepper","amount":"1/2 tsp"},{"item":"paprika","amount":"1/2 tsp"},{"item":"garlic powder","amount":"1/4 tsp"},{"item":"Cooking spray or 1 tsp olive oil","amount":"1"}]'::jsonb,
  directions = '["Cook the Turkey SausageHeat a skillet over medium heat. Spray with cooking spray.","Add turkey sausage and cook until browned and fully cooked, about 8–10 minutes.","Season with smoked paprika and garlic powder. Set aside.","Prepare the EggsIn a mixing bowl, whisk together eggs and egg whites with salt and pepper.","In the same skillet (wipe clean if needed), lightly spray with cooking spray and pour in the egg mixture.","Cook on low-medium heat, stirring gently to create soft scrambled eggs. Remove from heat.","Combine the eggs, turkey sausage, and cheese in a bowl. Stir to combine.","Assemble the BurritosLay out each tortilla.","Add a portion of the mixture (~3/4-1 cup) to the center of each tortilla.","Wrap the BurritosFold the sides of the tortilla over the filling, then roll tightly from bottom to top to form a burrito.","Repeat with all tortillas.","Optional: Briefly brown the seam-side of each burrito in the skillet to help seal it shut.","Store for Meal PrepFridge: Wrap each burrito in foil or parchment paper and store in an airtight container. Refrigerate for up to 5 days.","Freezer: Wrap burritos individually in plastic wrap, then foil, and place them in a freezer bag. Freeze for up to 3 months.","Reheat Before EatingFrom the fridge: Microwave for 1–1:30 minutes, flipping halfway.","From the freezer: Microwave for 3–4 minutes, flipping halfway."]'::jsonb
WHERE slug = 'meal-prep-breakfast-burritos';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"pomegranate juice","amount":"2 oz"},{"item":"soda water","amount":"2 oz"},{"item":"raspberries (plus extra for garnish)","amount":"3"},{"item":"rosemary","amount":"1 sprig"},{"item":"Ice","amount":"1"}]'::jsonb,
  directions = '["Rim the coupe glass with rosemary and chill if desired.","Muddle raspberries with pomegranate juice in a shaker.","Add ice, shake, and strain into the glass.","Top with soda water.","Garnish with raspberries and a rosemary sprig."]'::jsonb
WHERE slug = 'pomegranate-raspberry-fizz';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"quick oats","amount":"½ cup"},{"item":"ground flaxseed","amount":"1/4 cup"},{"item":"protein powder","amount":"1 scoop"},{"item":"collagen","amount":"1 scoop"},{"item":"peanut butter","amount":"1/2 cup"},{"item":"honey","amount":"1/4 cup"},{"item":"unsweetened almond milk (see note)","amount":"1 TBSP"},{"item":"Valentine’s colored M&Ms","amount":"42g"}]'::jsonb,
  directions = '[]'::jsonb
WHERE slug = 'valentines-protein-bites';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"pint fresh strawberries, washed and dried thoroughly","amount":"1"},{"item":"-8 oz dark chocolate melting wafers","amount":"6"},{"item":"Optional toppings: crushed nuts, shredded coconut","amount":"1"}]'::jsonb,
  directions = '["Melt Chocolate: Using a double boiler or microwave in 30-second intervals, stirring in between, melt the chocolate until smooth.","Dip: Hold each strawberry by the stem, dip into the melted chocolate, and twist slightly to remove excess. If using toppings, dip immediately before placing on the baking sheet.","Drizzle (Optional): Drizzle leftover chocolate with a fork over the dipped strawberries. Can also opt to use a different chocolate (white or milk) for drizzle.","Set: Chill in the refrigerator for about 15 minutes until the chocolate hardens.","Enjoy! Store in a cool place and enjoy within 24 hours for the best taste."]'::jsonb
WHERE slug = 'chocolate-covered-strawberries';

UPDATE ni_recipes SET 
  ingredients = '[{"item":". extra-virgin olive oil","amount":"1 Tbsp"},{"item":". smoked paprika","amount":"1 Tbsp"},{"item":". ground coriander","amount":"2 tsp"},{"item":". kosher salt","amount":"1 ½ tsp"},{"item":". ground cumin","amount":"1 tsp"},{"item":". ground turmeric","amount":"½ tsp"},{"item":". cayenne pepper","amount":"¼ tsp"},{"item":". ground cinnamon","amount":"¼ tsp"},{"item":"Freshly ground black pepper (to taste)","amount":"1"},{"item":". boneless, skinless chicken thighs","amount":"2 lb"}]'::jsonb,
  directions = '["Marinate Chicken: In a bowl, mix oil, spices, and salt. Add chicken, toss to coat, and marinate for 30 minutes (or up to 3 hours in the fridge).","Cook Rice: In a pot, bring rice, salt, and 3 cups water to a boil. Cover, reduce heat, and simmer for 15 minutes. Let sit for 10 minutes, then fluff with a fork.","Cook Chicken: Spray the pan with oil and heat over medium-high heat. Cook chicken for 5-7 minutes per side until golden brown and 165°F internally. Let rest for10 minutes, then slice.","Make Salad: In a bowl, combine cucumbers, bell peppers, onion, tomatoes, and feta. Add red pepper flakes, juice from 1 lemon, and 2 tsp. oil. Toss and season with salt.","Assemble Bowls: Divide rice among bowls. Top with chicken, salad, a 1 TBSP of tzatziki sauce, 1 TBSP hummus. Serve with pita."]'::jsonb
WHERE slug = 'mediterranean-chicken-shawarma-bowls';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"(2-inch) piece ginger, peeled and finely chopped","amount":"1"},{"item":"s garlic, finely chopped","amount":"4 clove"},{"item":"low-sodium beef broth","amount":"¾ cup"},{"item":"packed light brown sugar","amount":"½ cup"},{"item":"reduced-sodium soy sauce","amount":"⅓ cup"},{"item":"gochujang","amount":"¼ cup"},{"item":". toasted sesame oil","amount":"2 Tbsp"},{"item":". unseasoned rice vinegar","amount":"2 Tbsp"},{"item":". cornstarch","amount":"1 Tbsp"},{"item":". beef top round, excess fat trimmed, cut into 1 ½-inch pieces","amount":"3 lb"}]'::jsonb,
  directions = '["In a 6-quart slow cooker, whisk together ginger, garlic, broth, brown sugar, soy sauce, gochujang, sesame oil, vinegar, and cornstarch.","Add beef to the slow cooker and mix to coat. Cover and cook on high for 5-6 hours until beef is tender. Turn off slow cooker and let cool for 15 minutes.","Skim excess fat from the surface, then stir the sauce. Shred beef with two forks and mix to combine.","In a pot, bring rice, salt, and 4 cups water to a boil. Cover, reduce heat, and simmer for 15 minutes. Let sit for 10 minutes, then fluff with a fork.","Serve: Spoon beef and sauce over cooked rice. Top with scallions, cilantro, and sesame seeds.","Optional: Serve with steamed or roasted broccoli for added fiber, nutrients, and a well balanced meal"]'::jsonb
WHERE slug = 'slow-cooker-korean-beef-rice-bowls';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"(93% lean) ground beef","amount":"1 lb"},{"item":". onion powder","amount":"½ tsp"},{"item":". garlic powder","amount":"½ tsp"},{"item":". paprika","amount":"1 tsp"},{"item":". salt","amount":"1 tsp"},{"item":". black pepper","amount":"½ tsp"}]'::jsonb,
  directions = '["Heat a skillet over medium-high heat.","In a bowl, mix the ground beef with the spices until well combined. Then, form the mixture into four equal burger patties.","Cook the patties for about 3-4 minutes per side, or until fully cooked through. Alternatively, you can cook the beef as crumbles by browning it in the skillet, breaking it up as it cooks.","While the beef is cooking, prepare the special sauce by whisking all the ingredients together in a small bowl until well combined.","Assemble the burger bowls by layering romaine lettuce as the base, followed by the cooked burger patties (or crumbled beef) and toppings of your choice.","Drizzle the special sauce over everything and enjoy!"]'::jsonb
WHERE slug = 'deconstructed-burger-bowls';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"s boneless, skinless chicken thighs (or breasts)","amount":"1 ½ lb"},{"item":"no-sugar-added BBQ sauce","amount":"½ cup"},{"item":"olive oil","amount":"1 tbsp"},{"item":"smoked paprika","amount":"1 tsp"},{"item":"garlic powder","amount":"½ tsp"},{"item":"onion powder","amount":"½ tsp"},{"item":"sea salt","amount":"½ tsp"},{"item":"black pepper","amount":"¼ tsp"}]'::jsonb,
  directions = '["Preheat oven to 400°F (200°C) and line a sheet pan with parchment paper.","Mix BBQ sauce, olive oil, and seasonings in a bowl. Coat the chicken and set aside.","Toss sweet potatoes with olive oil, salt, and garlic powder. Spread on the sheet pan and roast for 15 minutes.","Remove the pan, place the chicken in the center, and add broccoli and bell pepper tossed with olive oil, salt, and pepper.","Roast Everything Together for 20-25 minutes until the chicken reaches 165°F, sweet potatoes are tender, and veggies are slightly charred.","Let the chicken rest for 5 minutes, then slice.","Drizzle with extra BBQ sauce, garnish, and serve with lemon wedges.","Great for meal prep with a side of quinoa, brown rice, or extra greens!"]'::jsonb
WHERE slug = 'sheet-pan-bbq-chicken-with-roasted-veggies';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"avocados, chopped","amount":"2"},{"item":"cucumbers, diced","amount":"2 small"},{"item":"crumbled feta cheese","amount":"1/2 cup"},{"item":"fresh cilantro, chopped","amount":"1/2 cup"},{"item":"reen onions thinly, sliced","amount":"2 g"},{"item":"olive oil","amount":"1 TBSP"},{"item":"juice from 1 lemon","amount":"1"},{"item":"salt","amount":"1 tsp"}]'::jsonb,
  directions = '["In a medium bowl, combine the avocados, cucumbers, feta, cilantro, and green onions.","Add the olive oil and lemon juice and toss gently to mix.","Season with salt."]'::jsonb
WHERE slug = 'avocado-cucumber-salad';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"salmon fillet (5, 4oz fillets)","amount":"1.25lb"},{"item":"olive oil","amount":"2 tbsp"},{"item":"sea salt","amount":"1 tsp"},{"item":"black pepper","amount":"½ tsp"},{"item":"garlic powder","amount":"1 tsp"},{"item":"smoked paprika (optional)","amount":"1 tsp"},{"item":"lemon, sliced","amount":"1"}]'::jsonb,
  directions = '["Preheat oven to 275°F (135°C) and line a baking sheet with parchment paper.","Place salmon fillets on the baking sheet, drizzle with olive oil, and season with salt, pepper, garlic powder, and smoked paprika.","Top salmon with lemon slices and slow roast for 30–35 minutes until tender and flaky.","In a small bowl, mix vinegar, salt, and sugar until dissolved. Add cucumber slices and let sit for at least 15 minutes.","In another bowl, whisk together Greek yogurt, dill, lemon juice, garlic, and olive oil. Thin with water if needed and season with salt and pepper.","Divide cooked quinoa or rice into 4-5 bowls. Top with salmon, pickled cucumbers, red onion, and avocado.","Drizzle with creamy dill dressing and garnish with fresh dill or lemon wedges if desired."]'::jsonb
WHERE slug = 'slow-roasted-salmon-quinoa-bowl';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"shrimp, peeled and deveined","amount":"1 lb"},{"item":"yellow onions, peeled and sliced","amount":"2"},{"item":"s broccoli florets","amount":"2 cup"},{"item":"red bell peppers, thinly sliced","amount":"2"},{"item":"Lemon (for serving)","amount":"1"},{"item":"avocado oil","amount":"1/4 cup"},{"item":"minced garlic","amount":"2 TBSP"},{"item":". crushed red pepper flakes","amount":"1 tsp"},{"item":"Salt to taste","amount":"1"},{"item":"Ground black pepper to taste","amount":"1"}]'::jsonb,
  directions = '["Preheat oven to 400°F (200°C) and line a sheet pan with parchment paper.","Mix in a medium size bowl avocado oil, garlic, red pepper flakes, parsley, salt and pepper. Toss in shrimp and set aside to marinate.","Toss onions, broccoli, and red peppers with a drizzle or spray of avocado oil and season with salt and pepper. Spread on the sheet pan and roast for 20 minutes.","Remove the pan, pour shrimp and marinade over roasted veggies. Spread out in a single layer and roast for an additional 5 minutes or until shrimp is pink. If shrimp are still slightly frozen roast longer ~10min.","Serve with a lemon wedge.","Great for meal prep with a side of whole wheat pasta, brown rice, quinoa, or greens."]'::jsonb
WHERE slug = 'sheet-pan-garlic-shrimp-and-roasted-veggies';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"s boneless, skinless chicken breasts","amount":"1.5 lb"},{"item":"BBQ sauce (plus extra for topping)","amount":"½ cup"},{"item":"olive oil","amount":"1 tbsp"},{"item":"garlic powder","amount":"1 tsp"},{"item":"smoked paprika","amount":"1 tsp"},{"item":"salt","amount":"½ tsp"},{"item":"black pepper","amount":"½ tsp"}]'::jsonb,
  directions = '["In a bowl, mix olive oil, BBQ sauce, garlic powder, paprika, salt, and pepper.","Coat the chicken evenly and let it marinate for at least 15 minutes.","Preheat the grill to medium-high heat. Grill the chicken for 6-8 minutes per side until fully cooked (internal temperature of 165°F). Let it rest for 5 minutes before slicing.","In a large bowl, whisk together Greek yogurt, apple cider vinegar, Dijon mustard, salt, and pepper.","Add the shredded cabbage and mix until well coated.","Divide the cooked rice among five containers (1/2 cup per container)","Top each with sliced BBQ chicken, a scoop of coleslaw, and sliced pickles.","Drizzle with extra BBQ sauce if desired."]'::jsonb
WHERE slug = 'grilled-bbq-chicken-bowls';

UPDATE ni_recipes SET 
  ingredients = '[{"item":". boneless skinless chicken thighs","amount":"2 lb"},{"item":"Kosher salt & black pepper","amount":"1"},{"item":". harissa","amount":"3 Tbsp"},{"item":"Juice of ½ lemon","amount":"1"},{"item":"s garlic, minced","amount":"2 clove"},{"item":"sweet potatoes, sliced","amount":"3 large"},{"item":"red onion, sliced","amount":"1"},{"item":". olive oil","amount":"2 Tbsp"},{"item":". ground cumin","amount":"1 tbsp"},{"item":"Fresh cilantro & lemon wedges for serving","amount":"1"}]'::jsonb,
  directions = '["Season chicken with salt & pepper. Mix with harissa, lemon juice, and garlic. Let sit.","Toss sweet potatoes & onion with oil, cumin, salt & pepper. Spread on a baking sheet & bake at 425°F for 10-15 min.","Nestle chicken into the veggies & bake for another 20-25 min until chicken reaches 165°F.","Top with cilantro & serve with lemon wedges."]'::jsonb
WHERE slug = 'harissa-roasted-chicken-sweet-potatoes';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"extra-virgin olive oil","amount":"1/4 cup"},{"item":"lemon juice + 2 tbsp zest","amount":"1/2 cup"},{"item":"Dijon mustard","amount":"1 tbsp"},{"item":"honey","amount":"1 tbsp"},{"item":"kosher salt & 1/2 tsp black pepper","amount":"1/2 tsp"}]'::jsonb,
  directions = '["Whisk all dressing ingredients together in a small bowl.","Season & cook chicken (grill, pan-sear, or bake) until done. Let rest, then chop.","Cook orzo and drain.","Add veggies, feta, olives, & herbs to the bowl. Add dressing and toss to combine.","Top with chicken.","Serve warm or chilled with fresh lemon wedges."]'::jsonb
WHERE slug = 'lemon-chicken-orzo-salad';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"chicken breast, cut into strips","amount":"1 lb"},{"item":"bell peppers (any color), cut into strips","amount":"3"},{"item":"red onion, cut into strips","amount":"1"},{"item":"Avocado oil (spray or drizzle)","amount":"1"},{"item":"salt","amount":"1 tsp"},{"item":"black pepper","amount":"½ tsp"},{"item":"paprika","amount":"1 tsp"},{"item":"onion powder","amount":"1 tsp"},{"item":"garlic powder","amount":"1 tsp"}]'::jsonb,
  directions = '["Preheat oven to 400°F (200°C).","Spread chicken, bell peppers, and onion evenly on a sheet pan.","Lightly coat with avocado oil and season with salt, pepper, paprika, onion powder, and garlic powder. Toss to coat evenly.","Bake for 20-25 minutes, flipping halfway through, until chicken is fully cooked and veggies are tender.","Serve with tortillas, rice, or on top of a salad!","Add any of your favorite taco toppings/ avocado, salsa, cilantro, roasted corn, pickled onions, shredded cheese, fresh lime"]'::jsonb
WHERE slug = 'sheet-pan-chicken-fajitas';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"chicken breast, cut into 1.5-inch chunks","amount":"1 lb"},{"item":"steak (sirloin or flank), cut into 1.5-inch chunks","amount":"1 lb"},{"item":"red bell pepper, cut into 1.5-inch pieces","amount":"1"},{"item":"yellow bell pepper, cut into 1.5-inch pieces","amount":"1"},{"item":"red onion, cut into 1.5-inch wedges","amount":"1"},{"item":"s pineapple chunks (fresh or canned in juice)","amount":"1 ½ cup"},{"item":"Wooden skewers (about 10–12)","amount":"1"}]'::jsonb,
  directions = '["Soak the wooden skewers in water for at least 30 minutes to prevent burning on the grill.","In a large bowl or zip-top bag, whisk together all marinade ingredients.","Add the chicken, steak, bell peppers, onion, and pineapple to the marinade. Toss to coat evenly. Cover and marinate in the fridge for at least 1 hour, or up to 8 hours for deeper flavor.","Preheat the grill to medium-high heat.","Thread the marinated ingredients onto the soaked skewers, alternating between chicken, steak, veggies, and pineapple for a colorful presentation.","Grill the kabobs for 10–15 minutes, turning every few minutes, until the chicken is fully cooked (165°F internal temp) and the steak reaches desired doneness.","Remove from grill and let rest for a few minutes before serving.","Serve over rice, quinoa, or with a side salad for a fresh summer meal. These kabobs are great for meal prep or BBQ gatherings!"]'::jsonb
WHERE slug = 'tropical-grill-kabobs';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"eggs","amount":"12 large"},{"item":"s frozen hashbrowns, thawed","amount":"3 cup"},{"item":"block feta cheese, cubed","amount":"1"},{"item":"s fresh spinach, chopped","amount":"2 cup"},{"item":"sundried tomatoes, chopped (drained if oil-packed)","amount":"½ cup"},{"item":"onion, diced","amount":"1 small"},{"item":"Salt and pepper, to taste","amount":"1"},{"item":"Olive oil or cooking spray, for greasing","amount":"1"}]'::jsonb,
  directions = '["Preheat oven to 425°F.","Grease a 9x13-inch baking dish (or use two smaller ones if needed).","spread the thawed hash brown in the bottom. If still frozen bake for ~5-10 minutes.","In a large mixing bowl, whisk the 12 eggs thoroughly. Add salt, pepper, and any optional seasonings.","Pour over hashbrowns.","Top with feta, spinach, sundried tomatoes, and diced onion.","Bake for 20-30 minutes, or until the eggs are set.","Let cool for 10 minutes before slicing and serving."]'::jsonb
WHERE slug = 'hashbrown-egg-casserole-with-feta-spinach-sundried-tomatoes';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"s pork tenderloin or pork loin","amount":"2 pound"},{"item":"tablespoon dried oregano","amount":"1"},{"item":"teaspoons ground cumin","amount":"2"},{"item":"tablespoon avocado oil","amount":"1"},{"item":"onion, chopped","amount":"½"},{"item":"arlic cloves, smashed","amount":"3 g"},{"item":"jalapeño, sliced (remove seeds for less heat)","amount":"1 medium"},{"item":"teaspoons salt","amount":"2"},{"item":"tablespoons fresh lime juice","amount":"2"},{"item":"orange juice","amount":"¼ cup"}]'::jsonb,
  directions = '["Assemble in slow cooker: Place the pork loin in the slow cooker. Add oregano, cumin, avocado oil, onion, garlic, jalapeño, salt, lime juice, and orange juice.","Mix: Use tongs or clean hands to gently mix everything together, making sure the pork is coated evenly with the seasonings and juices.","Cook: Cover and cook on HIGH for 4–6 hours or LOW for 6–8 hours, until pork is very tender and reaches an internal temp of 195°F.","Shred: Shred the pork directly in the slow cooker using two forks. Stir to mix with the juices.","Serve or store: Serve immediately, or let cool and store pork with juices in an airtight container in the fridge until ready to eat."]'::jsonb
WHERE slug = 'slow-cooker-pork-carnitas';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"container (16oz) cottage cheese 2% fat","amount":"1"},{"item":"chocolate protein powder","amount":"1 scoop"},{"item":"unsweetened cocoa powder","amount":"2 TBSP"},{"item":"semi sweet chocolate chips, melted","amount":"¼ cup"}]'::jsonb,
  directions = '["In a food processor or blender, combine all ingredients until smooth. Make sure chocolate chips are melted prior to mixing."]'::jsonb
WHERE slug = 'high-protein-chocolate-mousse';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"chili powder","amount":"2 tsp"},{"item":"paprika","amount":"1 tsp"},{"item":"ground cumin","amount":"1 tsp"},{"item":"onion powder","amount":"1 tsp"},{"item":"salt","amount":"½ tsp"},{"item":"garlic powder","amount":"1 tsp"},{"item":"(~5oz each) thin chicken breast cutlets","amount":"4"},{"item":"avocado oil","amount":"1"}]'::jsonb,
  directions = '["Make the seasoning: In a small bowl, mix together chili powder, paprika, cumin, onion powder, salt, garlic powder, and a pinch of cayenne.","Season the chicken: Place the chicken breasts on a cutting board. Sprinkle half the seasoning on top and rub it in. Flip the chicken and repeat with the rest of the seasoning.","Cook the chicken: Heat 2 tsp oil in a large pan over medium-high heat. Add the chicken in a single layer. Cook for about 4 minutes, then flip and cook another 3–5 minutes until fully cooked. Remove from heat.","Sauté the corn: In the same or a separate pan, sauté corn over medium-high heat until it starts to brown and lightly char, about 5–7 minutes.","Make the street corn mix: In a bowl, combine the sautéed corn with chopped cilantro, Greek yogurt, and seasonings (like chili powder, lime juice, and a pinch of salt). Mix until well combined.","Serve: Top chicken with street corn. Serve with roasted potatoes or a salad for a well balanced meal."]'::jsonb
WHERE slug = 'mexican-street-corn-chicken';

UPDATE ni_recipes SET 
  ingredients = '[{"item":"s rotisserie (or leftover chicken) chicken, shredded","amount":"12 ounce"},{"item":"non-fat Greek yogurt","amount":"3 TBSP"},{"item":"salsa","amount":"3 TBSP"},{"item":"cumin","amount":"1 tsp"},{"item":"paprika","amount":"1 tsp"},{"item":"garlic powder","amount":"1 tsp"},{"item":"salt and pepper to taste","amount":"1"},{"item":"corn tortillas","amount":"8 small"},{"item":"cheddar cheese, grated","amount":"1 cup"}]'::jsonb,
  directions = '["Preheat the oven to 425°F. Lightly spray a baking sheet with olive oil to coat or line with parchment paper.","Prepare the filling: In a mixing bowl, combine the shredded chicken, Greek yogurt, salsa, cumin, paprika, garlic powder, and a pinch of salt and pepper. Stir until everything is well combined.","Warm the tortillas so they don’t break while rolling:Oven: 1–2 minutes","Microwave: 45–60 seconds (between damp paper towels)","Assemble the tacos:Distribute the creamy salsa chicken onto each tortilla.","Top with shredded cheddar.","Fold the tortilla over and place it on the prepared baking sheet.","Repeat with remaining tortillas.","Brush or spray the outsides of the folded tortillas with olive oil and top with remaining cheese if desired.","Bake for 12–15 minutes, until the tacos are crispy and golden brown.","Serve immediately with pickled onions, sour cream or Greek yogurt, cotija cheese, fresh cilantro, and lime wedges for spritzing. Also pairs great with this Easy Pico."]'::jsonb
WHERE slug = 'crispy-creamy-salsa-tacos';
