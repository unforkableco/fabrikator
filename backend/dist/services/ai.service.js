"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const prompts_1 = require("../config/prompts");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
class AIService {
    constructor() {
        this.apiKey = process.env.AI_API_KEY || '';
        this.apiEndpoint = process.env.AI_API_ENDPOINT || '';
        if (!this.apiKey || !this.apiEndpoint) {
            console.warn('AI API key or endpoint not found in environment variables');
        }
    }
    async callAI(prompt, context) {
        if (!this.apiKey || !this.apiEndpoint) {
            throw new Error('AI API configuration missing');
        }
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    prompt,
                    context
                })
            });
            if (!response.ok) {
                throw new Error(`AI API request failed: ${response.statusText}`);
            }
            const data = await response.json();
            return data.response;
        }
        catch (error) {
            console.error('Error calling AI service:', error);
            throw error;
        }
    }
    async analyzeProject(description) {
        const prompt = prompts_1.prompts.projectAnalysis.replace('{{description}}', description);
        const response = await this.callAI(prompt, { description });
        // TODO: Parse AI response and extract requirements and materials
        return {
            requirements: [],
            suggestedMaterials: [],
        };
    }
    async suggestMaterials(project) {
        const prompt = prompts_1.prompts.materialsSearch.replace('{{requirements}}', JSON.stringify(project.requirements));
        const response = await this.callAI(prompt, { project });
        // TODO: Parse AI response and extract suggested materials
        return [];
    }
    async generateWiringPlan(project) {
        const prompt = prompts_1.prompts.wiringGeneration.replace('{{components}}', JSON.stringify(project.selectedParts));
        const response = await this.callAI(prompt, { project });
        // TODO: Parse AI response and create wiring plan
        return {
            components: [],
            aiGenerated: true,
            version: 1,
        };
    }
    async processUserPrompt(project, userInput) {
        const prompt = prompts_1.prompts.userPrompt
            .replace('{{project}}', JSON.stringify(project))
            .replace('{{userInput}}', userInput);
        const response = await this.callAI(prompt, { project, userInput });
        // TODO: Parse AI response and extract changes
        return {
            message: {
                id: Date.now().toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString(),
            },
            changes: [],
        };
    }
}
exports.AIService = AIService;
