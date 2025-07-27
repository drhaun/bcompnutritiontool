# Finding OpenAI Organization and Project IDs

## Where to Find These Values:

### Organization ID:
1. Go to https://platform.openai.com/
2. Click on your profile/organization name in the top right
3. Select "Organization settings" 
4. Look for "Organization ID" - it should look like: `org-xxxxxxxxxx`

### Project ID:
1. In the OpenAI dashboard, look at the top left
2. You should see a project dropdown (might say "Default project" or your project name)
3. Click on it and select "View all projects" 
4. Click on your project name
5. In the project settings, look for "Project ID" - it should look like: `proj_xxxxxxxxxx`

## Important Notes:
- Project ID is NOT the same as your API key
- API keys start with "sk-" but Project IDs start with "proj_"
- Organization IDs start with "org-"

## Alternative Method:
If you can't find the project ID, try using just the organization ID without a project ID. Some setups only require the organization.