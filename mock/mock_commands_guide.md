# Mock Data Commands

Below are the commands for managing mock sessions in the development environment:

```bash
# Add 41 sessions to the API (default: http://localhost:5086)
npm run mock:seed

# Correctly delete the added sessions without affecting the actual data
npm run mock:clean

# Regenerate sessions.json if you modify the script
npm run mock:generate
```
