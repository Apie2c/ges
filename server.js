// server.js

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
// Define the path to your data file
const DATA_FILE = path.join(__dirname, 'data', 'questions.json');

// Middleware Setup
// Use body-parser to parse incoming JSON request bodies
app.use(bodyParser.json()); 

// Serve static files (like index.html) from the root directory
app.use(express.static(path.join(__dirname))); 

// --- API Endpoints ---

// 1. Load Questions (GET) - Retrieves data from the JSON file
app.get('/api/questions/load', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            // If the file doesn't exist (first run) or is unreadable, send an empty array.
            console.error("Error reading data file. Sending empty array to client. (This is normal on the first run).", err.code);
            return res.json([]);
        }
        try {
            const questions = JSON.parse(data);
            res.json(questions);
        } catch (parseError) {
            console.error("Error parsing JSON data file. Sending empty array.", parseError);
            res.json([]);
        }
    });
});

// 2. Save Questions (POST) - Writes the entire question array to the JSON file
app.post('/api/questions/save', (req, res) => {
    const questions = req.body; // The array of questions sent from the client
    
    // Write the data back to the file with a nice 4-space indentation
    fs.writeFile(DATA_FILE, JSON.stringify(questions, null, 4), 'utf8', (err) => {
        if (err) {
            console.error("Error writing data file.", err);
            return res.status(500).json({ success: false, message: 'Failed to save data to server.' });
        }
        res.json({ success: true, message: 'Data saved permanently to questions.json.' });
        console.log(`Data successfully saved to ${DATA_FILE}`);
    });
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log("Use Ctrl+C to stop the server.");
});