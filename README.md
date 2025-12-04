# ChatAndChoose

This is a chatbot application built with Next.js, Prisma, and Google's Generative AI. It uses a vector database (Pinecone) for efficient similarity search.

## Features

- **Conversational AI:** Utilizes Google's Generative AI to provide intelligent and relevant responses.
- **Vector Search:** Leverages Pinecone's vector database for fast and accurate similarity searches.
- **Database Interaction:** Uses Prisma for seamless and type-safe database access.
- **Admin Interface:** Includes an admin panel for managing products.

## Architecture

The application is divided into three main parts:

1.  **Frontend:** A Next.js application that provides a chat interface for users to interact with the chatbot.
2.  **Backend:** A set of API routes that handle the business logic of the application.
3.  **Language Model and Vector Database:** Google's Generative AI is used to understand user queries and generate responses. Pinecone is used to store and search for product embeddings.

### How it works

1.  The user enters a query in the chat interface.
2.  The frontend sends the query to the backend.
3.  The backend uses Google's Generative AI to extract filters from the user's query (e.g., price range, color, etc.).
4.  The backend uses Google's `text-embedding-004` model to generate an embedding for the user's query.
5.  The backend queries the Pinecone vector database to find the most similar products to the user's query.
6.  The backend filters the products based on the extracted filters.
7.  The backend uses Google's Generative AI to generate a natural language response to the user's query.
8.  The backend returns the products and the response to the frontend.
9.  The frontend displays the products and the response to the user.

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- npm, yarn, pnpm, or bun
- A PostgreSQL database
- A Pinecone account and API key
- A Google AI API key

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Pranavkok/ChatAndChoose.git
   cd chat-bot
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Set up environment variables:**

   Create a `.env` file in the root of the project and add the following environment variables:

   ```
   DATABASE_URL="postgresql://user:password@host:port/database"
   PINECONE_API_KEY="your-pinecone-api-key"
   GOOGLE_AI_API_KEY="your-google-ai-api-key"
   ```

4. **Run database migrations:**

   ```bash
   npx prisma migrate dev
   ```

5. **Run the development server:**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

- The main application is accessible at `http://localhost:3000`.
- The admin panel is at `http://localhost:3000/admin`.

## Project Structure

- **`app/`**: Contains the main application code, including pages and API routes.
  - **`app/api/`**: API routes for handling product-related operations.
  - **`app/admin/`**: The admin panel for managing products.
- **`lib/`**: Contains library code, such as the Prisma client instance.
- **`llm/`**: Contains the logic for interacting with Google's Generative AI.
- **`prisma/`**: Contains the database schema and migrations.
- **`vector-db/`**: Contains the logic for interacting with the Pinecone vector database.

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## License

This project is licensed under the ISC License.
