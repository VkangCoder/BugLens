# Mock Data Commands

Below are the commands for managing mock sessions in the development environment:

```bash
# Add 41 sessions to the API (default: API_BASE_URL in .env, else http://localhost:5086).
# Needs a project ingest key: API_KEY in the repo-root .env, or pass --key bl_...
# Sessions go to the project that owns the key.
npm run mock:seed

# Delete only the sessions added by mock:seed (deleting needs an Admin account)
npm run mock:clean -- --user <admin name> --password <password>

# Regenerate sessions.json if you modify the script
npm run mock:generate
```
