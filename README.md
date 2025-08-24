# Party Trivia Game

A real-time multiplayer trivia game built with PartyKit and React.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your OpenAI API key:
   - Create a `.env` file in the project root
   - Add your OpenAI API key: `OPENAI_API_KEY=your_actual_api_key_here`
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

3. Run the development server:
```bash
npm run dev
```

## Features

- **Real-time multiplayer**: Built with PartyKit for instant synchronization
- **AI-powered questions**: Automatically generates unique trivia questions using GPT-3.5-turbo
- **Drag & drop playlist**: Reorder questions in the admin interface
- **Player management**: Track scores, buzzes, and answers
- **Multiple views**: Admin, board, player, and chat interfaces

## How to Use

1. **Create a room** from the lobby
2. **Generate questions** using the AI-powered Generate button
3. **Start the game** and let players join
4. **Players buzz** to answer questions
5. **Track scores** and game progress in real-time

## Environment Variables

- `OPENAI_API_KEY`: Required for AI question generation
