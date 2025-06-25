# **App Name**: TaskFlow

## Core Features:

- Task List View: Display tasks in a sortable and filterable list with key details (status, repository, Azure ID, title).
- Detailed Task View: A manage page that displays each task's details, status, and associated pull request (PR) links for different environments.
- PR Link Tracking: Track PR links raised for a specific task, separated by environment (dev, stage, production, others), allowing for multiple PRs per environment.
- Task Status Filtering: Filter tasks based on testing status: Not Started, In Progress, Done.
- Repository Assignment: Associate tasks with different repositories (UI-Dashboard, UI-Admin, Templates, API-Export, etc.).
- Azure Work Item Integration: Store link to the associated Azure Work Item.
- AI-Powered Task Suggestions: Suggest related tasks based on task descriptions or linked PRs using a machine learning tool.

## Style Guidelines:

- Primary color: Saturated cobalt blue (#3D5AFE) for a sleek and modern feel.
- Background color: Light gray (#F0F2F5), close to white but with a hint of gray, providing a clean backdrop that emphasizes content.
- Accent color: Vibrant violet (#BB6BD9) for interactive elements, buttons and highlights, providing clear affordances and visual interest.
- Body and headline font: 'Inter', a grotesque-style sans-serif with a modern and neutral aesthetic.
- Use clean, line-based icons to represent different task properties and actions. Icons should be easily understandable.
- Use a card-based layout for both the task list and detail views, providing a modular and organized appearance. Cards should have clear separation and consistent spacing.
- Subtle transition animations for page navigation and state changes, enhancing user experience without being intrusive. For example, a smooth fade-in effect when opening a task's details.