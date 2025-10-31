"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performWebSearchWithAI = void 0;
const google_genai_1 = require("@langchain/google-genai");
const google_genai_2 = require("@langchain/google-genai");
const memory_1 = require("langchain/vectorstores/memory");
const textsplitters_1 = require("@langchain/textsplitters");
const searchapi_1 = require("@langchain/community/document_loaders/web/searchapi");
const prompts_1 = require("@langchain/core/prompts");
const combine_documents_1 = require("langchain/chains/combine_documents");
const retrieval_1 = require("langchain/chains/retrieval");
// Initialize LangChain components
let llm;
let embeddings;
let searchApiKey;
const initializeLangChain = () => {
    console.log("Initializing LangChain");
    if (!llm) {
        llm = new google_genai_1.ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });
    }
    if (!embeddings) {
        console.log("Initializing embeddings");
        embeddings = new google_genai_2.GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });
    }
    if (!searchApiKey) {
        console.log("Initializing searchApiKey");
        searchApiKey = process.env.SEARCHAPI_KEY || '';
        if (!searchApiKey) {
            console.warn('⚠️ SearchAPI key not found. Web search functionality will be limited.');
        }
    }
};
// Initialize on module load
initializeLangChain();
// Single function to perform web search with AI
const performWebSearchWithAI = async (query, userQuestion) => {
    try {
        console.log("Performing web search with AI");
        if (!searchApiKey) {
            return {
                answer: "I'm sorry, but web search is not currently available. Please try again later.",
                searchResults: [],
                sources: []
            };
        }
        // Use SearchApiLoader to load web search results (single API call)
        let docs;
        try {
            const loader = new searchapi_1.SearchApiLoader({
                q: query,
                apiKey: searchApiKey,
                engine: "google"
            });
            console.log("Loading web search results");
            docs = await loader.load();
            console.log("Docs loaded successfully:", docs.length);
        }
        catch (loaderError) {
            console.error("SearchApiLoader error:", loaderError);
            throw new Error(`Failed to load search results: ${loaderError.message}`);
        }
        console.log("Docs:", docs);
        if (!docs || docs.length === 0) {
            return {
                answer: "I couldn't find any relevant information for your query.",
                searchResults: [],
                sources: []
            };
        }
        // Convert documents to search results format for display
        const searchResults = docs.map((doc, index) => ({
            title: doc.metadata.title || `Search Result ${index + 1}`,
            snippet: doc.pageContent.substring(0, 200) + '...',
            url: doc.metadata.url || `https://example.com/result-${index + 1}`,
            source: 'Google Search'
        }));
        console.log("Search results:", searchResults);
        // Split documents for processing
        const textSplitter = new textsplitters_1.RecursiveCharacterTextSplitter({
            chunkSize: 800,
            chunkOverlap: 100,
        });
        console.log("Splitting documents");
        const splitDocs = await textSplitter.splitDocuments(docs);
        console.log("Split docs:", splitDocs);
        // Create vector store
        const vectorStore = await memory_1.MemoryVectorStore.fromDocuments(splitDocs, embeddings);
        console.log("Vector store:", vectorStore);
        // Create question answering prompt
        const questionAnsweringPrompt = prompts_1.ChatPromptTemplate.fromMessages([
            [
                "system",
                `You are a helpful AI assistant. Answer the user's questions based on the provided context from web search results. 
        
        Guidelines:
        - Provide accurate and relevant answers based on the context
        - If the context doesn't contain enough information, say so
        - Cite sources when possible
        - Keep answers concise but informative
        - If you're unsure about something, acknowledge the uncertainty
        
        Context: {context}`
            ],
            ["human", "{input}"],
        ]);
        console.log("Question answering prompt:", questionAnsweringPrompt);
        // Create document chain
        const combineDocsChain = await (0, combine_documents_1.createStuffDocumentsChain)({
            llm,
            prompt: questionAnsweringPrompt,
        });
        console.log("Combine docs chain:", combineDocsChain);
        // Create retrieval chain
        const chain = await (0, retrieval_1.createRetrievalChain)({
            retriever: vectorStore.asRetriever({ k: 5 }), // Get top 5 most relevant documents
            combineDocsChain,
        });
        console.log("Chain:", chain);
        // Get answer
        const result = await chain.invoke({
            input: userQuestion,
        });
        console.log("Result:", result);
        // Extract sources from the documents
        const sources = docs.map((doc) => doc.metadata.url || doc.metadata.source || 'Unknown source');
        console.log("Sources:", sources);
        console.log("Returning result");
        return {
            answer: result.answer,
            searchResults,
            sources: [...new Set(sources)] // Remove duplicates
        };
    }
    catch (error) {
        console.error('Web search with AI error:', error);
        return {
            answer: "I encountered an error while searching for information. Please try again.",
            searchResults: [],
            sources: []
        };
    }
};
exports.performWebSearchWithAI = performWebSearchWithAI;
