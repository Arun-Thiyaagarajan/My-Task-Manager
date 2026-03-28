# TaskFlow: A Sleek & Simple Task Manager

TaskFlow is a powerful, intuitive, and highly customizable task management application designed to streamline your development workflow. Built with a modern tech stack, it provides a seamless experience for tracking tasks, pull requests, and deployments across multiple repositories and environments.

![TaskFlow Header](https://placehold.co/1200x400/4f46e5/white/png?text=TaskFlow+Workspace)

## ✨ Key Features

### 🚀 Core Productivity
- **Comprehensive Task Tracking**: Create, update, and manage tasks with rich details including descriptions, assignees, repositories, and custom fields.
- **Flexible Views**: Switch between a visual **Grid View** and a detailed **Table View** to suit your workflow.
- **Advanced Filtering**: Filter tasks by status, repository, deployment environment, and tags.
- **Time-Based Navigation**: Toggle between **All Time**, **Monthly**, and **Yearly** views with intuitive date navigation.
- **Favorites**: Mark important tasks as favorites for quick access.
- **Markdown Support**: Rich text editor for task descriptions and comments with support for bold, italics, code blocks, and user mentions.

### 🧠 Intelligence & Analytics
- **AI-Powered Summaries**: Automatically generate concise, one-sentence summaries for long task descriptions using Genkit AI.
- **Dashboard & Analytics**: High-level overview of team progress with visual charts tracking tasks by status, assignee distribution, and deployments.
- **Smart Link Aliases**: Automatically generate human-readable titles for URLs pasted into task attachments.

### 🛠️ Professional Customization
- **Custom Fields**: Tailor the application to your needs by creating your own fields (text, date, select, tags, etc.).
- **Environment Management**: Define your own deployment pipeline (e.g., Dev, Stage, Production) with custom colors and labels.
- **Team Management**: Manage dedicated lists of developers and testers with detailed contact profiles.
- **Workspace Branding**: Personalize the app with a custom name and a branded icon (Emoji, URL, or Image Upload).

### 📱 Superior UX & Mobile Design
- **Mobile Optimized**: A fully responsive interface featuring a fixed bottom navigation bar and touch-friendly controls.
- **Global Spotlight Search**: Jump to tasks, notes, settings, and key app destinations instantly with a Mac-like global search overlay.
- **App Opener**: A clean, professional splash screen for a smooth initial loading experience.
- **Guided Tutorial**: An interactive "App Tour" to help new users get acquainted with the workspace.
- **Floating Notes**: Quickly jot down ideas or temporary info from any page using the floating action button.

### ☁️ Data & Security
- **Dual Storage Modes**: Switch between **Local Storage** (browser-based) and **Cloud Sync** (Firebase Authenticated) at any time.
- **Real-time Sync**: Collaborative updates across all your devices when using Cloud Mode.
- **Detailed Logging**: A complete, filterable audit trail logs every change made to tasks and settings.
- **Safe Deletion**: A dedicated **Bin** holds deleted items for 30 days, allowing for easy restoration.
- **Data Portability**: Import and export your entire workspace, including tasks, settings, and logs, in JSON format.
- **PDF Export**: Generate professional PDF reports for single or multiple tasks.

## 🛠️ Tech Stack

TaskFlow is built with a modern, performant, and developer-friendly technology stack:

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **UI Library**: [React 18](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [ShadCN UI](https://ui.shadcn.com/)
- **AI Integration**: [Genkit AI](https://firebase.google.com/docs/genkit)
- **Backend**: [Firebase](https://firebase.google.com/) (Authentication & Firestore)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)

## 🚀 Getting Started

To run TaskFlow locally, follow these steps:

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Create your local environment file**:
   - Copy `.env.example` to `.env.local`
   - Fill in the Firebase values
   - Add `GEMINI_API_KEY` if you want AI summaries and smart link aliases to work locally
3. **Run the development server**:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:9003](http://localhost:9003) in your browser to see the application.

For deployed environments, make sure `GEMINI_API_KEY` is also configured in Vercel anywhere AI features should be available.

---
*Built with ❤️ for productive teams.*
