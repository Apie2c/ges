// server.js (PostgreSQL Version)

const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg'); // Import PostgreSQL Pool

const app = express();
const PORT = process.env.PORT || 3000;

// -----------------------------------------------------------
// 1. POSTGRESQL CONFIGURATION
// -----------------------------------------------------------

// Uses the standard environment variable for PostgreSQL connection
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/quizdb'; 

const pool = new Pool({
    connectionString: DATABASE_URL,
});

// Function to initialize the database table
async function initializeDb() {
    try {
        const client = await pool.connect();
        // Uses IF NOT EXISTS to prevent errors if the table already exists
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS quiz_questions (
                id SERIAL PRIMARY KEY,
                question_data JSONB NOT NULL
            );
        `;
        await client.query(createTableQuery);
        client.release();
        console.log('✅ PostgreSQL "quiz_questions" table ready.');
    } catch (err) {
        console.error('❌ PostgreSQL connection or table creation error:', err.message);
    }
}

// Immediately initialize the database when the server starts
initializeDb();


// -----------------------------------------------------------
// 2. MIDDLEWARE
// -----------------------------------------------------------

app.use(cors()); 
app.use(express.json()); 


// -----------------------------------------------------------
// 3. STATIC FILES
// -----------------------------------------------------------

app.use(express.static(path.join(__dirname))); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// -----------------------------------------------------------
// 4. API ROUTES (MIGRATED TO USE POSTGRESQL)
// -----------------------------------------------------------

// Load all questions from the database
app.get('/api/questions/load', async (req, res) => {
    try {
        // SELECT only the JSONB data column
        const result = await pool.query('SELECT question_data FROM quiz_questions ORDER BY id'); 
        
        // Extract the JSONB object from each row
        const questions = result.rows.map(row => row.question_data); 
        
        console.log(`Loaded ${questions.length} questions from PostgreSQL.`);
        res.json(questions);
    } catch (error) {
        console.error('Error loading questions from DB:', error);
        res.status(500).json([]); 
    }
});

// Save (overwrite) all questions in the database
app.post('/api/questions/save', async (req, res) => {
    const client = await pool.connect();
    try {
        const questions = req.body;

        // Start a transaction for atomic operation (all or nothing)
        await client.query('BEGIN'); 

        // 1. Clear the entire table
        await client.query('TRUNCATE quiz_questions RESTART IDENTITY;'); 

        // 2. Insert the new array of questions
        if (questions.length > 0) {
            // Prepare values for bulk insert using array mapping
            const values = questions.map(q => [q]); // Wrap each question object in an array for parameterized query
            
            // Build the multi-row INSERT query dynamically
            const insertQuery = `INSERT INTO quiz_questions (question_data) VALUES ${questions.map((_, i) => `($${i + 1}::jsonb)`).join(', ')}`;
            
            // Execute the insert query with the flattened list of JSON objects
            await client.query(insertQuery, values.flat());
        }
        
        await client.query('COMMIT'); // Commit the changes
        
        console.log(`Saved ${questions.length} questions to PostgreSQL.`);
        res.json({ message: `Questions saved successfully to PostgreSQL. Total: ${questions.length}` });

    } catch (error) {
        await client.query('ROLLBACK'); // Revert changes on error
        console.error('Error saving questions to DB:', error);
        res.status(500).json({ error: 'Failed to save data to database.' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});


// -----------------------------------------------------------
// 5. SERVER START
// -----------------------------------------------------------

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});