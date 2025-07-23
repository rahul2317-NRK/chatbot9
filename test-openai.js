import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing OpenAI API...');
console.log('API Key:', process.env.OPENAI_API_KEY ? 'Found' : 'NOT FOUND');

if (process.env.OPENAI_API_KEY) {
    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        console.log('✅ OpenAI client created successfully');
        
        // Test a simple completion
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: "Hello, this is a test!" }],
            max_tokens: 50
        });
        
        console.log('✅ OpenAI API test successful!');
        console.log('Response:', completion.choices[0].message.content);
    } catch (error) {
        console.error('❌ OpenAI API test failed:', error.message);
    }
} else {
    console.error('❌ No OpenAI API key found');
}